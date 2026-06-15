"""
Fold reviewed TMDB image data into public/data/films.json.

MUBI imagery already in films.json:
  - imageUrl  : MUBI poster   (~41% coverage)
  - stillUrl  : MUBI backdrop (~98% coverage)

TMDB (data/tmdb_matches.json) is layered in as a FALLBACK, not a replacement:
its real contribution is posters (fills ~2,700 gaps) plus ~25 backdrop holes.

Adds these fields to each film (only when a confident, non-rejected match exists):
  - tmdbId           : TMDB id (int)
  - tmdbMediaType    : "movie" | "tv"
  - tmdbPosterPath   : "/abc.jpg"  (size-agnostic; prefix with https://image.tmdb.org/t/p/<size>)
  - tmdbBackdropPath : "/xyz.jpg"

Idempotent: re-running overwrites the tmdb* fields from the current cache.

Usage:  python scripts/merge_tmdb_images.py
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FILMS_JSON = ROOT / "public" / "data" / "films.json"
MATCHES_JSON = ROOT / "data" / "tmdb_matches.json"

MATCHED = {"high", "medium"}


def main():
    with FILMS_JSON.open(encoding="utf-8") as f:
        films = json.load(f)
    with MATCHES_JSON.open(encoding="utf-8") as f:
        cache = json.load(f)

    stats = {"poster": 0, "backdrop": 0, "linked": 0, "no_match": 0}

    for film in films:
        entry = cache.get(str(film["key"]), {})
        confident = entry.get("confidence") in MATCHED
        rejected = entry.get("director_verified") == "rejected_in_review"

        # Always clear stale tmdb fields first (keeps re-runs clean).
        for k in ("tmdbId", "tmdbMediaType", "tmdbPosterPath", "tmdbBackdropPath"):
            film.pop(k, None)

        if not confident or rejected:
            stats["no_match"] += 1
            continue

        film["tmdbId"] = entry.get("tmdb_id")
        film["tmdbMediaType"] = entry.get("media_type", "movie")
        if entry.get("poster_path"):
            film["tmdbPosterPath"] = entry["poster_path"]
            stats["poster"] += 1
        if entry.get("backdrop_path"):
            film["tmdbBackdropPath"] = entry["backdrop_path"]
            stats["backdrop"] += 1
        stats["linked"] += 1

    tmp = FILMS_JSON.with_suffix(".json.tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(films, f, ensure_ascii=False, indent=2)
    tmp.replace(FILMS_JSON)

    n = len(films)
    print(f"Merged TMDB images into {FILMS_JSON.relative_to(ROOT)}")
    print(f"  films total:        {n}")
    print(f"  TMDB-linked:        {stats['linked']}")
    print(f"  + TMDB poster:      {stats['poster']}")
    print(f"  + TMDB backdrop:    {stats['backdrop']}")
    print(f"  no confident match: {stats['no_match']}")

    # Report effective coverage after layering MUBI + TMDB.
    poster = sum(1 for f in films if f.get("imageUrl") or f.get("tmdbPosterPath"))
    backdrop = sum(1 for f in films if f.get("stillUrl") or f.get("tmdbBackdropPath"))
    any_img = sum(1 for f in films if f.get("imageUrl") or f.get("stillUrl")
                  or f.get("tmdbPosterPath") or f.get("tmdbBackdropPath"))
    print()
    print("Effective coverage (MUBI + TMDB combined):")
    print(f"  any poster:   {poster} ({100*poster/n:.1f}%)")
    print(f"  any backdrop: {backdrop} ({100*backdrop/n:.1f}%)")
    print(f"  any image:    {any_img} ({100*any_img/n:.1f}%)")


if __name__ == "__main__":
    main()
