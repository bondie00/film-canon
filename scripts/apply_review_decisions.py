"""
Apply approve/reject decisions from data/review_decisions.json to the
TMDB matches cache.

Pairs with build_review_page.py + the downloaded review_decisions.json.

Usage:
  python scripts/apply_review_decisions.py
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MATCHES_JSON = ROOT / "data" / "tmdb_matches.json"
DECISIONS_JSON = ROOT / "data" / "review_decisions.json"


def main():
    if not DECISIONS_JSON.exists():
        print(f"ERROR: expected decisions file at {DECISIONS_JSON.relative_to(ROOT)}")
        print("Save the downloaded JSON from review.html there first.")
        return

    with DECISIONS_JSON.open(encoding="utf-8") as f:
        decisions = json.load(f)
    with MATCHES_JSON.open(encoding="utf-8") as f:
        cache = json.load(f)

    approved = 0
    rejected = 0
    pending = 0

    for d in decisions:
        key = str(d["ss_key"])
        entry = cache.get(key, {})
        cand = d["candidate"]
        if d["decision"] == "approve":
            entry.update({
                "tmdb_id": cand["tmdb_id"],
                "tmdb_title": cand["title"],
                "tmdb_release_year": cand["year"],
                "poster_path": cand["poster_path"],
                "backdrop_path": cand["backdrop_path"],
                "media_type": cand["media_type"],
                "confidence": "medium",
                "director_verified": "verified",
            })
            entry.pop("tmdb_directors", None)
            entry.pop("ss_directors_at_check", None)
            cache[key] = entry
            approved += 1
        elif d["decision"] == "reject":
            for k in ("tmdb_id", "tmdb_title", "tmdb_release_year", "poster_path", "backdrop_path", "media_type"):
                entry.pop(k, None)
            entry["confidence"] = "unmatched"
            entry["director_verified"] = "rejected_in_review"
            cache[key] = entry
            rejected += 1
        else:
            pending += 1

    tmp = MATCHES_JSON.with_suffix(".json.tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)
    tmp.replace(MATCHES_JSON)

    print(f"Applied decisions:")
    print(f"  approved: {approved}")
    print(f"  rejected: {rejected}")
    print(f"  pending:  {pending}")


if __name__ == "__main__":
    main()
