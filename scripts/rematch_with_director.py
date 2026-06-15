"""
Director-aware re-match for the 154 entries flagged as mismatches.

For each entry where director_verified == "mismatch":
  1. Search TMDB by title (no year filter — those that needed it already passed)
  2. For up to MAX_CANDIDATES top results, fetch credits and check if any
     director matches the S&S director list.
  3. First candidate whose director matches becomes the new match.
  4. If nothing matches, drop the bad tmdb_id and mark the entry unmatched.

Also adds a small improvement to name matching that catches Chinese
name-order swaps (e.g. "Mu Fei" / "Fei Mu") via token-set intersection.

Usage:
  TMDB_API_KEY=xxx python scripts/rematch_with_director.py
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
MATCHES_JSON = ROOT / "data" / "tmdb_matches.json"
FILMS_JSON = ROOT / "public" / "data" / "films.json"

TMDB_API = "https://api.themoviedb.org/3"
SEARCH_URL = f"{TMDB_API}/search/movie"
REQUEST_TIMEOUT = 15
SLEEP_BETWEEN = 0.05
MAX_CANDIDATES = 5
SIM_THRESHOLD = 0.78


def normalize_name(name: str) -> str:
    if not name:
        return ""
    nfkd = unicodedata.normalize("NFKD", name)
    ascii_only = "".join(c for c in nfkd if not unicodedata.combining(c))
    ascii_only = ascii_only.lower()
    ascii_only = re.sub(r"[^a-z0-9\s]", " ", ascii_only)
    return re.sub(r"\s+", " ", ascii_only).strip()


def names_match(a: str, b: str) -> bool:
    na, nb = normalize_name(a), normalize_name(b)
    if not na or not nb:
        return False
    if na == nb:
        return True
    a_parts, b_parts = na.split(), nb.split()
    # Same last name + first initial (handles middle-name variants).
    if a_parts and b_parts and a_parts[-1] == b_parts[-1] and a_parts[0][:1] == b_parts[0][:1]:
        return True
    # Token-set intersection >= 2 (handles "Mu Fei" vs "Fei Mu" and added Cantonese names).
    if len(set(a_parts) & set(b_parts)) >= 2:
        return True
    return SequenceMatcher(None, na, nb).ratio() >= SIM_THRESHOLD


def any_match(ss_dirs: list[str], tmdb_dirs: list[str]) -> bool:
    return any(names_match(a, b) for a in ss_dirs for b in tmdb_dirs)


def normalize_title(t: str) -> str:
    t = t.lower()
    t = re.sub(r"[^\w\s]", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    for prefix in ("the ", "a ", "an "):
        if t.startswith(prefix):
            t = t[len(prefix):]
    return t


def title_variants(title: str) -> list[str]:
    variants = [title]
    stripped = re.sub(r"\s*\(\d{4}\)\s*$", "", title).strip()
    if stripped and stripped != title:
        variants.append(stripped)
    if "," in title:
        head = title.split(",", 1)[0].strip()
        if head and head not in variants:
            variants.append(head)
    return variants


def parse_year(year_str):
    if not year_str:
        return None
    m = re.search(r"\d{4}", str(year_str))
    return int(m.group(0)) if m else None


def _get(session, url, params):
    resp = session.get(url, params=params, timeout=REQUEST_TIMEOUT)
    if resp.status_code == 429:
        time.sleep(int(resp.headers.get("Retry-After", "2")) + 1)
        resp = session.get(url, params=params, timeout=REQUEST_TIMEOUT)
    resp.raise_for_status()
    return resp.json()


def search_candidates(session, api_key, title):
    """All search candidates across title variants, deduped by id."""
    seen = {}
    for variant in title_variants(title):
        data = _get(session, SEARCH_URL, {"api_key": api_key, "query": variant, "include_adult": "false"})
        for r in data.get("results", []):
            if r["id"] not in seen:
                seen[r["id"]] = r
    # Sort by popularity (TMDB returns popularity field).
    return sorted(seen.values(), key=lambda r: r.get("popularity", 0), reverse=True)


def fetch_directors(session, api_key, tmdb_id):
    data = _get(session, f"{TMDB_API}/movie/{tmdb_id}/credits", {"api_key": api_key})
    return [c["name"] for c in data.get("crew", []) if c.get("job") == "Director"]


def result_year(r):
    d = r.get("release_date") or ""
    return int(d[:4]) if len(d) >= 4 and d[:4].isdigit() else None


def save(cache):
    tmp = MATCHES_JSON.with_suffix(".json.tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)
    tmp.replace(MATCHES_JSON)


def main():
    api_key = os.environ.get("TMDB_API_KEY")
    if not api_key:
        print("ERROR: set TMDB_API_KEY environment variable.")
        sys.exit(1)

    with MATCHES_JSON.open(encoding="utf-8") as f:
        cache = json.load(f)
    with FILMS_JSON.open(encoding="utf-8") as f:
        films = json.load(f)
    films_by_key = {str(f["key"]): f for f in films}

    mismatches = [(k, v) for k, v in cache.items() if v.get("director_verified") == "mismatch"]
    print(f"{len(mismatches)} films to re-check.\n")

    session = requests.Session()
    recovered = 0
    auto_verified_with_old_id = 0
    still_unmatched = 0
    examples_recovered = []
    examples_dropped = []

    for i, (key, entry) in enumerate(mismatches, 1):
        film = films_by_key.get(key, {})
        title = film.get("databaseFilmTitle") or film.get("FilmTitle") or ""
        year = parse_year(film.get("Year"))
        ss_dirs = film.get("directors", [])

        # First re-check the existing tmdb_id against the improved name matcher
        # (catches the Chinese/Russian transliteration cases).
        try:
            existing_dirs = fetch_directors(session, api_key, entry["tmdb_id"])
            time.sleep(SLEEP_BETWEEN)
        except requests.RequestException as e:
            print(f"  [{i}/{len(mismatches)}] ERROR re-checking tmdb_id={entry['tmdb_id']}: {e}")
            continue

        if existing_dirs and any_match(ss_dirs, existing_dirs):
            entry["director_verified"] = "verified"
            entry.pop("tmdb_directors", None)
            entry.pop("ss_directors_at_check", None)
            auto_verified_with_old_id += 1
            continue

        # Otherwise: real bad match — re-search and try to find a director-matching candidate.
        try:
            candidates = search_candidates(session, api_key, title)
            time.sleep(SLEEP_BETWEEN)
        except requests.RequestException as e:
            print(f"  [{i}/{len(mismatches)}] ERROR searching {title!r}: {e}")
            continue

        # Prefer candidates within ±2 years of the S&S year, then the rest.
        if year:
            in_range = [r for r in candidates if result_year(r) is not None and abs(result_year(r) - year) <= 2]
            out_range = [r for r in candidates if r not in in_range]
            candidates = in_range + out_range

        new_match = None
        for r in candidates[:MAX_CANDIDATES]:
            try:
                dirs = fetch_directors(session, api_key, r["id"])
            except requests.RequestException as e:
                continue
            time.sleep(SLEEP_BETWEEN)
            if dirs and any_match(ss_dirs, dirs):
                new_match = (r, dirs)
                break

        if new_match:
            r, dirs = new_match
            entry["tmdb_id"] = r["id"]
            entry["tmdb_title"] = r.get("title")
            entry["tmdb_release_year"] = result_year(r)
            entry["poster_path"] = r.get("poster_path")
            entry["backdrop_path"] = r.get("backdrop_path")
            entry["confidence"] = "medium"
            entry["director_verified"] = "verified"
            entry.pop("tmdb_directors", None)
            entry.pop("ss_directors_at_check", None)
            recovered += 1
            if len(examples_recovered) < 10:
                examples_recovered.append((title, year, r.get("title"), dirs))
        else:
            for k_ in ("tmdb_id", "tmdb_title", "tmdb_release_year", "poster_path", "backdrop_path", "tmdb_directors", "ss_directors_at_check"):
                entry.pop(k_, None)
            entry["confidence"] = "unmatched"
            entry["director_verified"] = "no_match_found"
            still_unmatched += 1
            if len(examples_dropped) < 10:
                examples_dropped.append((title, year, ss_dirs))

        if i % 25 == 0:
            save(cache)
            print(f"  [{i}/{len(mismatches)}] auto-verified:{auto_verified_with_old_id} recovered:{recovered} dropped:{still_unmatched}")

    save(cache)

    print()
    print("=" * 50)
    print("Re-match summary:")
    print(f"  films re-checked:         {len(mismatches)}")
    print(f"  auto-verified (name fix): {auto_verified_with_old_id}")
    print(f"  recovered with new ID:    {recovered}")
    print(f"  truly dropped:            {still_unmatched}")
    if examples_recovered:
        print()
        print("--- examples recovered with new ID ---")
        for ss_title, ss_year, tmdb_title, dirs in examples_recovered:
            print(f"  {ss_title} ({ss_year}) -> {tmdb_title} | dirs: {dirs}")
    if examples_dropped:
        print()
        print("--- examples dropped ---")
        for ss_title, ss_year, ss_dirs in examples_dropped:
            print(f"  {ss_title} ({ss_year}) by {ss_dirs}")


if __name__ == "__main__":
    main()
