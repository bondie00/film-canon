#!/usr/bin/env python3
"""
Build per-VOTER ballots from the Sight & Sound poll sheets.

The mirror image of build_voters.py: that script answers "who voted for this
film", this one answers "what did this person vote for". Pick matching is
imported from build_voters.py rather than reimplemented, so both surfaces agree
on which title means which film.

Identity handling (see data/voter_identities.json):
  - names are matched across polls on a normalized form (case, accents,
    punctuation and the Polish/Nordic letters that do not decompose under NFKD)
  - `aliases` maps a variant to the name the voter is listed under, for cases
    that cannot be fixed at source because both spellings are legitimate
  - `joint` splits a shared ballot onto each participant's page, flagged
  - the display name is the most frequent raw spelling, unless an alias sets it

Usage:
    python scripts/build_voter_ballots.py

Generates:
    public/data/voters.json   { slug: {name, countries, ballots:[...], polls} }
"""

import json
import re
import sys
import unicodedata
from collections import defaultdict, Counter
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_voters import build_lookup, match_pick, POLLS  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
EXCEL_PATH = ROOT / "data" / "sight and sound data new.xlsx"
FILMS_JSON = ROOT / "public" / "data" / "films.json"
IDENTITIES = ROOT / "data" / "voter_identities.json"
OUT_JSON = ROOT / "public" / "data" / "voters.json"
SLUGS_JSON = ROOT / "public" / "data" / "voter-slugs.json"

# Letters that do not decompose under NFKD, so stripping accents alone would let
# the a-z filter delete them outright (Michał -> "micha").
NON_DECOMPOSING = str.maketrans({
    "ł": "l", "Ł": "L", "ø": "o", "Ø": "O", "đ": "d", "Đ": "D",
    "ð": "d", "Ð": "D", "ı": "i", "ħ": "h", "ŧ": "t",
})
EXPANSIONS = {"ß": "ss", "æ": "ae", "Æ": "AE", "œ": "oe", "Œ": "OE", "þ": "th"}


def norm_name(s):
    """Normalized identity key for a voter name."""
    s = str(s).translate(NON_DECOMPOSING)
    for k, v in EXPANSIONS.items():
        s = s.replace(k, v)
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    s = re.sub(r"[^a-z ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def slugify(name):
    n = norm_name(name).replace(" ", "-")
    return re.sub(r"-+", "-", n).strip("-")


def film_year(film):
    y = str(film.get("Year") or "")
    if "-" in y:
        y = y.split("-")[0]
    try:
        return int(y)
    except ValueError:
        return None


def main():
    with FILMS_JSON.open(encoding="utf-8") as f:
        films = json.load(f)
    films_by_key = {f["key"]: f for f in films}
    by_title_year, by_title = build_lookup(films)
    print(f"{len(films):,} films indexed.")

    with IDENTITIES.open(encoding="utf-8") as f:
        ident = json.load(f)
    aliases = {norm_name(k): v for k, v in ident.get("aliases", {}).items()}
    joint = {norm_name(k): v for k, v in ident.get("joint", {}).items()}
    print(f"identity rules: {len(aliases)} alias(es), {len(joint)} joint ballot(s)")

    xl = pd.ExcelFile(EXCEL_PATH)

    # identity key -> {"raw": Counter, "ballots": [...]}
    voters = defaultdict(lambda: {"raw": Counter(), "ballots": []})
    # Exact raw spelling as it appears in film-voters.json -> the people it means.
    # Keyed by the literal string so the film page can look a voter up without
    # reimplementing this normalization in JS, where any drift would silently
    # break every link. A joint ballot maps to more than one person.
    raw_to_people = defaultdict(set)
    unmatched_picks = 0
    total_picks = 0
    joint_applied = 0

    for poll in POLLS:
        df = xl.parse(poll, header=0)
        pick_cols = list(df.columns)[2:]
        for _, row in df.iterrows():
            name, first = row.iloc[0], row.iloc[2]
            # Ballot rows only: a name AND a first pick (skips the tally rows
            # some sheets append below the ballots).
            if pd.isna(name) or pd.isna(first):
                continue
            raw = str(name).strip()
            country = str(row.iloc[1]).strip() if pd.notna(row.iloc[1]) else None

            picks, misses = [], []
            for c in pick_cols:
                v = row[c]
                if pd.isna(v):
                    continue
                sv = str(v).strip()
                if not sv or sv.replace(".", "", 1).isdigit():
                    continue  # blank, or a stray tally number
                total_picks += 1
                key = match_pick(sv, by_title_year, by_title)
                if key is None:
                    misses.append(sv)
                    unmatched_picks += 1
                    continue
                film = films_by_key.get(key)
                if not film:
                    continue
                entry = {"key": key, "title": film["FilmTitle"], "year": film_year(film)}
                if entry not in picks:
                    picks.append(entry)

            # A joint ballot is recorded on each participant's page.
            nk = norm_name(raw)
            if nk in joint:
                people = joint[nk]
                joint_applied += 1
            else:
                people = [raw]

            for person in people:
                pk = norm_name(person)
                display = aliases.get(pk, person)
                pk = norm_name(display)
                others = [p for p in people if p != person]
                raw_to_people[raw].add(pk)
                voters[pk]["raw"][display] += 1
                voters[pk]["ballots"].append({
                    "poll": int(poll),
                    "country": country,
                    "films": picks,
                    **({"jointWith": others, "as": raw} if others else {}),
                })

    out = {}
    for pk, v in voters.items():
        # Display name: the spelling used most often, ties broken by the longer
        # form ("J. Hoberman" over "J Hoberman").
        display = sorted(v["raw"].items(), key=lambda kv: (-kv[1], -len(kv[0])))[0][0]
        ballots = sorted(v["ballots"], key=lambda b: b["poll"])
        countries = []
        for b in ballots:
            if b["country"] and b["country"] not in countries:
                countries.append(b["country"])
        out[slugify(display)] = {
            "name": display,
            "countries": countries,
            "polls": [b["poll"] for b in ballots],
            "ballots": ballots,
        }

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with OUT_JSON.open("w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False)

    # identity key -> slug, so raw spellings can resolve to the built pages
    key_to_slug = {norm_name(v["name"]): slug for slug, v in out.items()}
    slugs = {}
    for raw, keys in raw_to_people.items():
        people = [{"name": out[key_to_slug[k]]["name"], "slug": key_to_slug[k]}
                  for k in sorted(keys) if k in key_to_slug]
        if people:
            slugs[raw] = people
    with SLUGS_JSON.open("w", encoding="utf-8") as f:
        json.dump(slugs, f, ensure_ascii=False)

    size = OUT_JSON.stat().st_size
    multi = sum(1 for v in out.values() if len(v["ballots"]) > 1)
    print(f"\n[OK] Wrote {OUT_JSON.relative_to(ROOT)} — {len(out):,} voters, {size/1024:.0f} KB")
    print(f"[OK] Wrote {SLUGS_JSON.relative_to(ROOT)} — {len(slugs):,} raw spellings, "
          f"{SLUGS_JSON.stat().st_size/1024:.0f} KB")
    print(f"  voters with more than one ballot: {multi:,}")
    print(f"  joint ballots split onto both pages: {joint_applied}")
    print(f"  picks matched: {total_picks - unmatched_picks:,}/{total_picks:,} "
          f"({100*(total_picks-unmatched_picks)/total_picks:.2f}%)")


if __name__ == "__main__":
    main()
