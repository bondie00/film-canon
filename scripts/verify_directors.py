"""
Director verification pass for the TMDB matches.

For every matched film in data/tmdb_matches.json, fetches /movie/{id}/credits
and compares the TMDB director(s) against the Sight & Sound director list.
Adds a `director_verified` field to each cache entry:

  - "verified"          ->  at least one director name pair matches
  - "mismatch"          ->  TMDB has director(s), none matched ours
  - "no_tmdb_director"  ->  TMDB returned no director (rare)
  - "no_ss_director"    ->  S&S has no director for this film (~9 films)

Comparison is diacritic-insensitive and tolerates minor spelling variation
(e.g. Charlie vs Charles Chaplin, Yasujirō vs Yasujiro Ozu).

Idempotent — re-running only fetches credits for entries that don't yet
have a `director_verified` field.

Usage:
  TMDB_API_KEY=xxx python scripts/verify_directors.py
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
REQUEST_TIMEOUT = 15
SLEEP_BETWEEN = 0.05
SIM_THRESHOLD = 0.78


def normalize_name(name: str) -> str:
    """Lowercase, strip diacritics & punctuation, collapse whitespace."""
    if not name:
        return ""
    # NFKD strips accents from accented chars
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
    # Last-token (surname) exact match + first-token share initial → accept.
    a_parts, b_parts = na.split(), nb.split()
    if a_parts[-1] == b_parts[-1] and a_parts[0][:1] == b_parts[0][:1]:
        return True
    return SequenceMatcher(None, na, nb).ratio() >= SIM_THRESHOLD


def any_match(ss_dirs: list[str], tmdb_dirs: list[str]) -> bool:
    for a in ss_dirs:
        for b in tmdb_dirs:
            if names_match(a, b):
                return True
    return False


def fetch_directors(session: requests.Session, api_key: str, tmdb_id: int) -> list[str]:
    url = f"{TMDB_API}/movie/{tmdb_id}/credits"
    resp = session.get(url, params={"api_key": api_key}, timeout=REQUEST_TIMEOUT)
    if resp.status_code == 429:
        wait = int(resp.headers.get("Retry-After", "2"))
        time.sleep(wait + 1)
        resp = session.get(url, params={"api_key": api_key}, timeout=REQUEST_TIMEOUT)
    if resp.status_code == 404:
        return []
    resp.raise_for_status()
    crew = resp.json().get("crew", [])
    return [c["name"] for c in crew if c.get("job") == "Director"]


def save(cache: dict) -> None:
    tmp = MATCHES_JSON.with_suffix(".json.tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)
    tmp.replace(MATCHES_JSON)


def main():
    api_key = os.environ.get("TMDB_API_KEY")
    if not api_key:
        print("ERROR: set TMDB_API_KEY environment variable.")
        sys.exit(1)

    print(f"Loading matches from {MATCHES_JSON.relative_to(ROOT)}...")
    with MATCHES_JSON.open(encoding="utf-8") as f:
        cache = json.load(f)
    print(f"  {len(cache)} cached entries.")

    print(f"Loading films from {FILMS_JSON.relative_to(ROOT)}...")
    with FILMS_JSON.open(encoding="utf-8") as f:
        films = json.load(f)
    ss_dirs_by_key = {str(f["key"]): f.get("directors", []) for f in films}
    print(f"  {len(films)} films loaded.")

    session = requests.Session()
    stats = {"verified": 0, "mismatch": 0, "no_tmdb_director": 0, "no_ss_director": 0, "skipped": 0, "error": 0}
    mismatches = []
    new_in_run = 0
    save_every = 50

    matched_entries = [(k, v) for k, v in cache.items() if v.get("tmdb_id")]
    total = len(matched_entries)
    print(f"  {total} matched films to verify.\n")

    try:
        for i, (key, entry) in enumerate(matched_entries, 1):
            if "director_verified" in entry:
                stats[entry["director_verified"]] = stats.get(entry["director_verified"], 0) + 1
                stats["skipped"] += 1
                continue

            ss_dirs = ss_dirs_by_key.get(key, [])
            if not ss_dirs:
                entry["director_verified"] = "no_ss_director"
                stats["no_ss_director"] += 1
                new_in_run += 1
                continue

            try:
                tmdb_dirs = fetch_directors(session, api_key, entry["tmdb_id"])
            except requests.RequestException as e:
                stats["error"] += 1
                print(f"  [{i}/{total}] ERROR fetching credits for tmdb_id={entry['tmdb_id']}: {e}")
                continue

            if not tmdb_dirs:
                entry["director_verified"] = "no_tmdb_director"
                stats["no_tmdb_director"] += 1
            elif any_match(ss_dirs, tmdb_dirs):
                entry["director_verified"] = "verified"
                stats["verified"] += 1
            else:
                entry["director_verified"] = "mismatch"
                entry["tmdb_directors"] = tmdb_dirs
                entry["ss_directors_at_check"] = ss_dirs
                stats["mismatch"] += 1
                mismatches.append((key, ss_dirs, tmdb_dirs, entry))

            new_in_run += 1
            if new_in_run % save_every == 0:
                save(cache)
                print(f"  [{i}/{total}] verified:{stats['verified']} mismatch:{stats['mismatch']} no-tmdb-dir:{stats['no_tmdb_director']}")

            time.sleep(SLEEP_BETWEEN)
    except KeyboardInterrupt:
        print("\nInterrupted — saving progress...")
    finally:
        save(cache)

    print()
    print("=" * 50)
    print("Director verification summary:")
    print(f"  total cache entries:   {len(cache)}")
    print(f"  verified:              {stats['verified']}")
    print(f"  mismatch:              {stats['mismatch']}")
    print(f"  no tmdb director:      {stats['no_tmdb_director']}")
    print(f"  no s&s director:       {stats['no_ss_director']}")
    print(f"  errors:                {stats['error']}")
    print()
    if mismatches:
        print(f"--- first 25 mismatches (review these) ---")
        for key, ss_dirs, tmdb_dirs, entry in mismatches[:25]:
            print(f"  ss_key={key} | tmdb_id={entry['tmdb_id']} | tmdb_title={entry.get('tmdb_title')!r}")
            print(f"    S&S directors:  {ss_dirs}")
            print(f"    TMDB directors: {tmdb_dirs}")


if __name__ == "__main__":
    main()
