#!/usr/bin/env python3
"""
Build per-film voter lists from the Sight & Sound ballot sheets.

Each poll sheet (1952..2022) in the workbook holds one row per voter:
  Voter Name | Voter Country | Film 1 | Film 2 | ... (~10 picks)
Below the ballots some sheets append a per-film vote tally — those rows have a
value in the name column but NOT in the first-pick column, so we skip them.

Ballot picks are free-text titles, often carrying a disambiguating year in
parentheses ("The River (1997)"). We match each pick to a canonical film key
using a (normalized-title, year) lookup, falling back to title-only (choosing
the highest-voted film when a bare title is ambiguous).

Usage:
    python scripts/build_voters.py

Generates:
    public/data/film-voters.json   { "<key>": { "1952": [{ "n": name, "c": country }, ...], ... } }
    data/voter_unmatched.json       QA report of picks that matched no film
"""

import json
import re
from collections import defaultdict
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
EXCEL_PATH = ROOT / "data" / "sight and sound data new.xlsx"
FILMS_JSON = ROOT / "public" / "data" / "films.json"
OUT_JSON = ROOT / "public" / "data" / "film-voters.json"
UNMATCHED_JSON = ROOT / "data" / "voter_unmatched.json"

POLLS = ["1952", "1962", "1972", "1982", "1992", "2002", "2012", "2022"]


def norm(s):
    """Lowercase, drop a trailing (year), keep alphanumerics only."""
    s = str(s).lower().strip()
    s = re.sub(r"\(\d{4}\)", "", s)
    s = re.sub(r"[^a-z0-9]+", " ", s).strip()
    return s


def extract_year(s):
    """Pull a 4-digit year out of a "(1997)" style suffix, if present."""
    m = re.search(r"\((\d{4})\)", str(s))
    return int(m.group(1)) if m else None


def film_year(film):
    """Film Year may be a range ("1960-1964"); take the start year."""
    y = film.get("Year")
    if not y:
        return None
    y = str(y)
    if "-" in y:
        y = y.split("-")[0]
    try:
        return int(y)
    except ValueError:
        return None


def build_lookup(films):
    """Two indexes: (title, year) -> key, and title -> keys ranked by total votes."""
    by_title_year = {}
    by_title = defaultdict(list)  # norm -> list of (total_votes, key)
    for f in films:
        key = f["key"]
        fy = film_year(f)
        total = sum(p["votes"] for p in f["pollHistory"]
                    if isinstance(p.get("votes"), int) and p["year"] != "all")
        titles = {f.get("FilmTitle"), f.get("databaseFilmTitle"), f.get("AlternateTitle")}
        for t in titles:
            if not t:
                continue
            n = norm(t)
            if not n:
                continue
            if fy is not None:
                by_title_year.setdefault((n, fy), key)
            by_title[n].append((total, key))
    # Rank the title-only fallback so the most-voted film wins an ambiguous bare title.
    by_title = {n: sorted(v, reverse=True) for n, v in by_title.items()}
    return by_title_year, by_title


def match_pick(pick, by_title_year, by_title):
    n = norm(pick)
    if not n:
        return None
    py = extract_year(pick)
    if py is not None and (n, py) in by_title_year:
        return by_title_year[(n, py)]
    if n in by_title:
        return by_title[n][0][1]  # highest-voted film with this title
    return None


def main():
    print(f"Reading films from {FILMS_JSON.name}...")
    with FILMS_JSON.open(encoding="utf-8") as f:
        films = json.load(f)
    by_title_year, by_title = build_lookup(films)
    print(f"  {len(films):,} films indexed.")

    xl = pd.ExcelFile(EXCEL_PATH)
    # voters[key][pollYear] = [ {n, c}, ... ]
    voters = defaultdict(lambda: defaultdict(list))
    unmatched = defaultdict(int)
    stats = {}

    for poll in POLLS:
        df = xl.parse(poll, header=0)
        pick_cols = list(df.columns)[2:]  # everything after Name, Country
        ballots = picks = matched = 0
        for _, row in df.iterrows():
            name = row.iloc[0]
            first = row.iloc[2]
            # Ballot rows only: real voter name AND a first pick (skips tally rows).
            if pd.isna(name) or pd.isna(first):
                continue
            ballots += 1
            country = row.iloc[1]
            country = str(country).strip() if pd.notna(country) else None
            name = str(name).strip()
            for c in pick_cols:
                v = row[c]
                if pd.isna(v):
                    continue
                sv = str(v).strip()
                if not sv or sv.replace(".", "", 1).isdigit():
                    continue  # blank or a stray tally number
                picks += 1
                key = match_pick(sv, by_title_year, by_title)
                if key is None:
                    unmatched[sv] += 1
                    continue
                matched += 1
                voters[key][poll].append({"n": name, "c": country})
        stats[poll] = (ballots, picks, matched)
        print(f"  {poll}: {ballots:5d} ballots · {picks:5d} picks · {matched:5d} matched")

    # Sort each film's per-poll voter list by country then name for stable output.
    out = {}
    for key in sorted(voters.keys()):
        polls = {}
        for poll in POLLS:
            lst = voters[key].get(poll)
            if lst:
                polls[poll] = sorted(lst, key=lambda x: ((x["c"] or "~"), x["n"]))
        out[str(key)] = polls

    with OUT_JSON.open("w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False)
    size = OUT_JSON.stat().st_size
    print(f"\n[OK] Wrote {OUT_JSON} — {len(out):,} films, {size/1024/1024:.2f} MB")

    total_picks = sum(s[1] for s in stats.values())
    total_matched = sum(s[2] for s in stats.values())
    print(f"  match rate: {100*total_matched/total_picks:.2f}%  ({total_picks - total_matched} unmatched picks)")

    unmatched_sorted = dict(sorted(unmatched.items(), key=lambda kv: -kv[1]))
    with UNMATCHED_JSON.open("w", encoding="utf-8") as f:
        json.dump(unmatched_sorted, f, ensure_ascii=False, indent=2)
    print(f"  unmatched titles ({len(unmatched_sorted)} distinct) -> {UNMATCHED_JSON.name}")
    for title, cnt in list(unmatched_sorted.items())[:10]:
        print(f"    {cnt:3d}  {title}")


if __name__ == "__main__":
    main()
