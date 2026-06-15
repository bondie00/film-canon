"""
Match Sight & Sound films to TMDB.

Reads public/data/films.json (already has parsed title/year/directors),
queries TMDB's /search/movie endpoint for each film, and writes matches
to data/tmdb_matches.json. Idempotent: re-running skips films already
in the cache.

Setup:
  1. Get a free API key at https://www.themoviedb.org/settings/api
  2. Set the environment variable:
        export TMDB_API_KEY=your_key_here     # macOS / Linux
        $env:TMDB_API_KEY = "your_key_here"  # PowerShell
  3. Run:  python scripts/match_tmdb.py

Output file: data/tmdb_matches.json
  {
    "767": {                       # Sight & Sound key
      "tmdb_id": 15,
      "tmdb_title": "Citizen Kane",
      "tmdb_release_year": 1941,
      "poster_path": "/...jpg",
      "backdrop_path": "/...jpg",
      "confidence": "high"          # high | medium | unmatched
    },
    ...
  }
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Optional

import requests

ROOT = Path(__file__).resolve().parent.parent
FILMS_JSON = ROOT / "public" / "data" / "films.json"
MATCHES_JSON = ROOT / "data" / "tmdb_matches.json"

TMDB_API = "https://api.themoviedb.org/3"
SEARCH_URL = f"{TMDB_API}/search/movie"
REQUEST_TIMEOUT = 15
SLEEP_BETWEEN = 0.05  # polite throttle; TMDB allows ~50 req/s


def parse_year(year_str: Optional[str]) -> Optional[int]:
    if not year_str:
        return None
    s = str(year_str).strip()
    if not s or s.lower() == "none":
        return None
    # Take first 4-digit run (handles "1960-1964", "1975", "c. 1920")
    m = re.search(r"\d{4}", s)
    return int(m.group(0)) if m else None


def normalize_title(t: str) -> str:
    """Loose title comparison: lowercase, strip punctuation."""
    t = t.lower()
    t = re.sub(r"[^\w\s]", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    # Drop a leading "the " / "a " / "an "
    for prefix in ("the ", "a ", "an "):
        if t.startswith(prefix):
            t = t[len(prefix):]
    return t


def _do_search(session: requests.Session, params: dict) -> list[dict]:
    resp = session.get(SEARCH_URL, params=params, timeout=REQUEST_TIMEOUT)
    if resp.status_code == 429:
        wait = int(resp.headers.get("Retry-After", "2"))
        time.sleep(wait + 1)
        resp = session.get(SEARCH_URL, params=params, timeout=REQUEST_TIMEOUT)
    resp.raise_for_status()
    return resp.json().get("results", [])


def _title_variants(title: str) -> list[str]:
    """Variants for fallback search when the full title fails."""
    variants = [title]
    # Strip a trailing " (YYYY)" disambiguation suffix.
    stripped = re.sub(r"\s*\(\d{4}\)\s*$", "", title).strip()
    if stripped and stripped != title:
        variants.append(stripped)
    # Use everything before the first comma — handles "Jeanne Dielman, 23, Quai du..."
    if "," in title:
        head = title.split(",", 1)[0].strip()
        if head and head not in variants:
            variants.append(head)
    return variants


def search_tmdb(session: requests.Session, api_key: str, title: str, year: Optional[int]) -> list[dict]:
    """Multi-pass search. Returns the first non-empty result set."""
    base = {"api_key": api_key, "include_adult": "false"}

    for variant in _title_variants(title):
        # Pass A: strict year filter
        if year:
            params = {**base, "query": variant, "primary_release_year": year}
            results = _do_search(session, params)
            if results:
                return results
        # Pass B: no year filter (we'll match via ±year tolerance downstream)
        params = {**base, "query": variant}
        results = _do_search(session, params)
        if results:
            return results
    return []


def best_match(results: list[dict], target_title: str, target_year: Optional[int]) -> Optional[tuple[dict, str]]:
    """Return (result, confidence) or None."""
    if not results:
        return None
    target_norm = normalize_title(target_title)

    def result_year(r: dict) -> Optional[int]:
        d = r.get("release_date") or ""
        return int(d[:4]) if len(d) >= 4 and d[:4].isdigit() else None

    # Pass 1: exact year + matching title → high confidence
    for r in results:
        ry = result_year(r)
        title_match = normalize_title(r.get("title", "")) == target_norm or normalize_title(r.get("original_title", "")) == target_norm
        if target_year and ry == target_year and title_match:
            return r, "high"

    # Pass 2: year within ±2 + title match → medium (release-vs-production-year drift)
    for r in results:
        ry = result_year(r)
        title_match = normalize_title(r.get("title", "")) == target_norm or normalize_title(r.get("original_title", "")) == target_norm
        if target_year and ry is not None and abs(ry - target_year) <= 2 and title_match:
            return r, "medium"

    # Pass 3: top popularity result within ±2 years (titles diverge — e.g. translated) → medium
    if target_year:
        for r in results:
            ry = result_year(r)
            if ry is not None and abs(ry - target_year) <= 2:
                return r, "medium"

    # Pass 4: top result, no year info on our side → medium if we had no year to filter
    if not target_year:
        return results[0], "medium"

    return None


def load_cache() -> dict:
    if MATCHES_JSON.exists():
        with MATCHES_JSON.open(encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_cache(cache: dict) -> None:
    MATCHES_JSON.parent.mkdir(parents=True, exist_ok=True)
    tmp = MATCHES_JSON.with_suffix(".json.tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)
    tmp.replace(MATCHES_JSON)


def main():
    api_key = os.environ.get("TMDB_API_KEY")
    if not api_key:
        print("ERROR: set TMDB_API_KEY environment variable.")
        print("Get a free key at https://www.themoviedb.org/settings/api")
        sys.exit(1)

    print(f"Loading films from {FILMS_JSON.relative_to(ROOT)}...")
    with FILMS_JSON.open(encoding="utf-8") as f:
        films = json.load(f)
    print(f"  {len(films)} films loaded.")

    cache = load_cache()
    print(f"  {len(cache)} entries already in cache (skipping these).")

    session = requests.Session()
    stats = {"high": 0, "medium": 0, "unmatched": 0, "error": 0}
    new_in_run = 0
    save_every = 50

    try:
        for i, film in enumerate(films, 1):
            key = str(film["key"])
            if key in cache:
                stats[cache[key].get("confidence", "unmatched")] = stats.get(cache[key].get("confidence", "unmatched"), 0) + 1
                continue

            title = film.get("databaseFilmTitle") or film.get("FilmTitle") or ""
            year = parse_year(film.get("Year"))

            try:
                results = search_tmdb(session, api_key, title, year)
                match = best_match(results, title, year)
                if match:
                    r, confidence = match
                    entry = {
                        "tmdb_id": r["id"],
                        "tmdb_title": r.get("title"),
                        "tmdb_release_year": int(r["release_date"][:4]) if r.get("release_date", "")[:4].isdigit() else None,
                        "poster_path": r.get("poster_path"),
                        "backdrop_path": r.get("backdrop_path"),
                        "confidence": confidence,
                    }
                else:
                    entry = {"confidence": "unmatched", "ss_title": title, "ss_year": year}
                cache[key] = entry
                stats[entry["confidence"]] = stats.get(entry["confidence"], 0) + 1
            except requests.RequestException as e:
                stats["error"] += 1
                print(f"  [{i}/{len(films)}] ERROR on '{title}' ({year}): {e}")

            new_in_run += 1
            if new_in_run % save_every == 0:
                save_cache(cache)
                print(f"  [{i}/{len(films)}] cached so far — high:{stats['high']} medium:{stats['medium']} unmatched:{stats['unmatched']}")

            time.sleep(SLEEP_BETWEEN)
    except KeyboardInterrupt:
        print("\nInterrupted — saving progress...")
    finally:
        save_cache(cache)

    print()
    print("=" * 50)
    print("TMDB match summary:")
    print(f"  total films:       {len(films)}")
    print(f"  high confidence:   {stats['high']}")
    print(f"  medium confidence: {stats['medium']}")
    print(f"  unmatched:         {stats['unmatched']}")
    print(f"  errors:            {stats['error']}")
    matched_pct = 100 * (stats["high"] + stats["medium"]) / max(len(films), 1)
    print(f"  match rate:        {matched_pct:.1f}%")
    print(f"  cache written to:  {MATCHES_JSON.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
