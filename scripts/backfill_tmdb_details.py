#!/usr/bin/env python3
"""
Backfill synopsis / runtime / genres from TMDB for films MUBI didn't cover.

MUBI is the primary source for these fields (see convert-data.py). ~95 films
have no MUBI data but do have a confident TMDB match — this script calls TMDB's
details endpoint for just those, and fills ONLY the fields still empty. MUBI
values are never overwritten.

Two-part, mirroring merge_tmdb_images.py:
  1. FETCH  — for films missing a field AND carrying a tmdbId, call
              /movie/{id} or /tv/{id}, cache the result to data/tmdb_details.json.
              Idempotent: films already cached are skipped, so re-runs are free.
  2. APPLY  — fill empty synopsis/runtime/genres in films.json from the cache.
              Runs even without an API key (uses whatever is already cached), so
              it can re-apply after convert-data.py regenerates films.json.

Pipeline order: convert-data.py -> merge_tmdb_images.py -> backfill_tmdb_details.py

Setup:
  1. pip install requests
  2. Get a free API key at https://www.themoviedb.org/settings/api
  3. Set it:
        export TMDB_API_KEY=your_key_here      # macOS / Linux / Git Bash
        $env:TMDB_API_KEY = "your_key_here"   # PowerShell
  4. Run:  python scripts/backfill_tmdb_details.py
"""

import json
import os
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
FILMS_JSON = ROOT / "public" / "data" / "films.json"
DETAILS_JSON = ROOT / "data" / "tmdb_details.json"

TMDB_API = "https://api.themoviedb.org/3"
REQUEST_TIMEOUT = 15
SLEEP_BETWEEN = 0.05  # polite throttle; TMDB allows ~50 req/s


def needs_backfill(film):
    """Film is missing at least one of the three fields and has a TMDB match."""
    if not film.get("tmdbId"):
        return False
    return not film.get("synopsis") or not film.get("runtime") or not film.get("genres")


def load_cache():
    if DETAILS_JSON.exists():
        with DETAILS_JSON.open(encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_cache(cache):
    tmp = DETAILS_JSON.with_suffix(".json.tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)
    tmp.replace(DETAILS_JSON)


def fetch_details(session, api_key, tmdb_id, media_type):
    """Return {synopsis, runtime, genres} from TMDB details, or None on failure."""
    mt = "tv" if media_type == "tv" else "movie"
    url = f"{TMDB_API}/{mt}/{tmdb_id}"
    resp = session.get(url, params={"api_key": api_key}, timeout=REQUEST_TIMEOUT)
    if resp.status_code == 429:
        wait = int(resp.headers.get("Retry-After", "2"))
        time.sleep(wait + 1)
        resp = session.get(url, params={"api_key": api_key}, timeout=REQUEST_TIMEOUT)
    if resp.status_code == 404:
        return {"synopsis": None, "runtime": None, "genres": []}
    resp.raise_for_status()
    d = resp.json()

    overview = (d.get("overview") or "").strip() or None

    if mt == "tv":
        ert = d.get("episode_run_time") or []
        runtime = int(ert[0]) if ert and ert[0] else None
    else:
        runtime = int(d["runtime"]) if d.get("runtime") else None

    genres = [g["name"] for g in d.get("genres", []) if g.get("name")]

    return {"synopsis": overview, "runtime": runtime, "genres": genres}


def main():
    print("Loading films.json...")
    with FILMS_JSON.open(encoding="utf-8") as f:
        films = json.load(f)

    cache = load_cache()
    todo = [f for f in films if needs_backfill(f) and str(f["key"]) not in cache]
    print(f"  {sum(needs_backfill(f) for f in films)} films missing a field with a TMDB match; "
          f"{len(cache)} already cached; {len(todo)} to fetch.")

    # ---- FETCH ----
    if todo:
        api_key = os.environ.get("TMDB_API_KEY")
        if not api_key:
            print("\n  ! TMDB_API_KEY not set — skipping fetch. Set it and re-run to pull "
                  "the missing details. (Applying whatever is already cached below.)")
        else:
            session = requests.Session()
            fetched = 0
            try:
                for i, film in enumerate(todo, 1):
                    try:
                        details = fetch_details(session, api_key, film["tmdbId"], film.get("tmdbMediaType"))
                    except requests.RequestException as e:
                        print(f"    [error] {film['FilmTitle']}: {e}")
                        continue
                    cache[str(film["key"])] = details
                    fetched += 1
                    if fetched % 25 == 0:
                        save_cache(cache)
                        print(f"    ...{fetched}/{len(todo)} fetched")
                    time.sleep(SLEEP_BETWEEN)
            finally:
                save_cache(cache)
            print(f"  Fetched {fetched} film(s); cache now has {len(cache)} entries.")

    # ---- APPLY (fill only empty fields) ----
    filled = {"synopsis": 0, "runtime": 0, "genres": 0}
    for film in films:
        entry = cache.get(str(film["key"]))
        if not entry:
            continue
        if not film.get("synopsis") and entry.get("synopsis"):
            film["synopsis"] = entry["synopsis"]
            filled["synopsis"] += 1
        if not film.get("runtime") and entry.get("runtime"):
            film["runtime"] = entry["runtime"]
            filled["runtime"] += 1
        if not film.get("genres") and entry.get("genres"):
            film["genres"] = entry["genres"]
            filled["genres"] += 1

    tmp = FILMS_JSON.with_suffix(".json.tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(films, f, ensure_ascii=False, indent=2)
    tmp.replace(FILMS_JSON)

    print(f"\n[OK] Applied to films.json — filled "
          f"{filled['synopsis']} synopses, {filled['runtime']} runtimes, {filled['genres']} genre sets.")


if __name__ == "__main__":
    main()
