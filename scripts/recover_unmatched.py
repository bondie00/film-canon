"""
Recovery pass for films still unmatched after the title + director rounds.

Strategy: pivot from title-based search to director-based search.
  1. Look up the director on TMDB.
  2. Fetch their movie + TV filmography.
  3. Search the filmography for a title/year match.

This handles three pain points at once:
  - TV miniseries (uses /tv_credits).
  - Foreign-language original titles (TMDB indexes the original; we have English).
  - Transliterated director names (we don't need to compare names — the
    person ID anchors everything to the right human).

Outcomes per film:
  - auto-accepted   -> title/year close enough that it's clearly the same film.
                       Cache entry is updated; director_verified="verified".
  - needs_review    -> a plausible candidate exists but not a slam dunk.
                       Saved to data/tmdb_review.json for manual confirmation.
  - still_unmatched -> nothing plausible turned up.
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
REVIEW_JSON = ROOT / "data" / "tmdb_review.json"

TMDB_API = "https://api.themoviedb.org/3"
REQUEST_TIMEOUT = 15
SLEEP_BETWEEN = 0.05

AUTO_TITLE_THRESHOLD = 0.90
REVIEW_TITLE_THRESHOLD = 0.55
AUTO_YEAR_TOLERANCE = 3
REVIEW_YEAR_TOLERANCE = 5


def _get(session, url, params):
    resp = session.get(url, params=params, timeout=REQUEST_TIMEOUT)
    if resp.status_code == 429:
        time.sleep(int(resp.headers.get("Retry-After", "2")) + 1)
        resp = session.get(url, params=params, timeout=REQUEST_TIMEOUT)
    if resp.status_code == 404:
        return {}
    resp.raise_for_status()
    return resp.json()


def normalize_title(t: str) -> str:
    if not t:
        return ""
    nfkd = unicodedata.normalize("NFKD", t)
    ascii_only = "".join(c for c in nfkd if not unicodedata.combining(c))
    s = ascii_only.lower()
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    for prefix in ("the ", "a ", "an "):
        if s.startswith(prefix):
            s = s[len(prefix):]
    return s


def title_similarity(a: str, b: str) -> float:
    na, nb = normalize_title(a), normalize_title(b)
    if not na or not nb:
        return 0.0
    if na == nb:
        return 1.0
    return SequenceMatcher(None, na, nb).ratio()


def parse_year(year_str):
    if not year_str:
        return None
    m = re.search(r"\d{4}", str(year_str))
    return int(m.group(0)) if m else None


def credit_year(c: dict, media_type: str) -> int | None:
    field = "release_date" if media_type == "movie" else "first_air_date"
    d = c.get(field) or ""
    return int(d[:4]) if len(d) >= 4 and d[:4].isdigit() else None


def credit_title(c: dict, media_type: str) -> str:
    return c.get("title") if media_type == "movie" else c.get("name", "")


def find_person_id(session, api_key, name: str) -> int | None:
    data = _get(session, f"{TMDB_API}/search/person", {"api_key": api_key, "query": name, "include_adult": "false"})
    results = data.get("results") or []
    if not results:
        return None
    return results[0]["id"]


def fetch_filmography(session, api_key, person_id: int) -> list[dict]:
    """Return list of {title, year, tmdb_id, media_type, poster_path, backdrop_path, job}."""
    out = []
    for endpoint, media_type in (("movie_credits", "movie"), ("tv_credits", "tv")):
        data = _get(session, f"{TMDB_API}/person/{person_id}/{endpoint}", {"api_key": api_key})
        for c in data.get("crew", []):
            if c.get("job") not in ("Director", "Series Director", "Creator"):
                continue
            out.append({
                "tmdb_id": c["id"],
                "title": credit_title(c, media_type),
                "year": credit_year(c, media_type),
                "media_type": media_type,
                "poster_path": c.get("poster_path"),
                "backdrop_path": c.get("backdrop_path"),
                "job": c.get("job"),
            })
    return out


def best_filmography_match(filmography: list[dict], ss_title: str, ss_year: int | None) -> tuple[dict | None, float, str]:
    """Return (best_credit, similarity, status) where status is auto|review|none."""
    if not filmography:
        return None, 0.0, "none"

    scored = []
    for c in filmography:
        sim = title_similarity(ss_title, c["title"])
        if ss_year and c["year"] is not None:
            year_diff = abs(c["year"] - ss_year)
        else:
            year_diff = 99
        scored.append((sim, year_diff, c))

    # Sort by similarity desc, then year_diff asc
    scored.sort(key=lambda x: (-x[0], x[1]))
    best_sim, best_diff, best = scored[0]

    if best_sim >= AUTO_TITLE_THRESHOLD and best_diff <= AUTO_YEAR_TOLERANCE:
        return best, best_sim, "auto"
    if best_sim >= REVIEW_TITLE_THRESHOLD and best_diff <= REVIEW_YEAR_TOLERANCE:
        return best, best_sim, "review"
    return None, best_sim, "none"


def save_cache(cache):
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

    # Targets: unmatched + no_match_found (the truly-dropped from rematch pass)
    targets = [
        (k, v) for k, v in cache.items()
        if v.get("confidence") == "unmatched" or v.get("director_verified") == "no_match_found"
    ]
    print(f"{len(targets)} unmatched films to attempt recovery.\n")

    session = requests.Session()
    person_id_cache: dict[str, int | None] = {}
    auto_count = 0
    review_count = 0
    none_count = 0
    review_items = []

    for i, (key, entry) in enumerate(targets, 1):
        film = films_by_key.get(key, {})
        ss_title = film.get("databaseFilmTitle") or film.get("FilmTitle") or ""
        ss_year = parse_year(film.get("Year"))
        ss_dirs = [d for d in film.get("directors", []) if d]

        if not ss_dirs:
            none_count += 1
            continue

        # Gather candidate filmography across all S&S directors for this film.
        filmography = []
        for d in ss_dirs:
            if d not in person_id_cache:
                try:
                    person_id_cache[d] = find_person_id(session, api_key, d)
                except requests.RequestException:
                    person_id_cache[d] = None
                time.sleep(SLEEP_BETWEEN)
            pid = person_id_cache[d]
            if pid is None:
                continue
            try:
                filmography.extend(fetch_filmography(session, api_key, pid))
            except requests.RequestException:
                pass
            time.sleep(SLEEP_BETWEEN)

        best, sim, status = best_filmography_match(filmography, ss_title, ss_year)

        if status == "auto" and best:
            entry["tmdb_id"] = best["tmdb_id"]
            entry["tmdb_title"] = best["title"]
            entry["tmdb_release_year"] = best["year"]
            entry["poster_path"] = best["poster_path"]
            entry["backdrop_path"] = best["backdrop_path"]
            entry["media_type"] = best["media_type"]
            entry["confidence"] = "medium"
            entry["director_verified"] = "verified"
            entry.pop("tmdb_directors", None)
            entry.pop("ss_directors_at_check", None)
            auto_count += 1
        elif status == "review" and best:
            review_items.append({
                "ss_key": key,
                "ss_title": ss_title,
                "ss_year": ss_year,
                "ss_directors": ss_dirs,
                "candidate": {
                    "tmdb_id": best["tmdb_id"],
                    "title": best["title"],
                    "year": best["year"],
                    "media_type": best["media_type"],
                    "poster_path": best["poster_path"],
                    "backdrop_path": best["backdrop_path"],
                    "tmdb_url": f"https://www.themoviedb.org/{best['media_type']}/{best['tmdb_id']}",
                    "title_similarity": round(sim, 3),
                },
            })
            review_count += 1
        else:
            none_count += 1

        if i % 25 == 0:
            save_cache(cache)
            print(f"  [{i}/{len(targets)}] auto:{auto_count} review:{review_count} none:{none_count}")

    save_cache(cache)
    REVIEW_JSON.parent.mkdir(parents=True, exist_ok=True)
    with REVIEW_JSON.open("w", encoding="utf-8") as f:
        json.dump(review_items, f, ensure_ascii=False, indent=2)

    print()
    print("=" * 50)
    print("Recovery summary:")
    print(f"  targeted:        {len(targets)}")
    print(f"  auto-accepted:   {auto_count}")
    print(f"  needs review:    {review_count} (saved to {REVIEW_JSON.relative_to(ROOT)})")
    print(f"  no candidate:    {none_count}")
    print()
    if review_items[:10]:
        print("--- sample of needs-review items ---")
        for r in review_items[:10]:
            cand = r["candidate"]
            print(f"  ss: {r['ss_title']} ({r['ss_year']}) by {', '.join(r['ss_directors'])}")
            print(f"  -> tmdb: {cand['title']} ({cand['year']}) {cand['media_type']} sim={cand['title_similarity']}")
            print(f"     {cand['tmdb_url']}")


if __name__ == "__main__":
    main()
