# Source Data

This folder contains the **source data files** for the Sight & Sound Canon Explorer.

## Files

- **`sight and sound data new.xlsx`** — the master dataset: 4,842 films from the
  Sight & Sound polls (1952–2022), plus a sheet of ballots per poll year.
- **`tmdb_matches.json`** — reviewed TMDB matches (ids, poster/backdrop paths).
- **`tmdb_details.json`** — cached TMDB synopsis/runtime/genre lookups.
- **`full_mubi_data.csv`** — *archival, untracked.* MUBI's export, the original
  source of the genre/runtime/synopsis/image fields. Those are now baked into
  the workbook (see below), so nothing in the build reads this file any more.

## Workbook structure

- **"main data"** — primary sheet, 4,842 films × 32 columns. **Source of truth.**
- **Poll sheets** — `1952` … `2022`, one row per voter, their ballot across the
  columns to the right. The 1952 sheet's ballot columns have blank headers by
  design (variable-length ballots); `build_voter_ballots.py` reads them by
  position, so don't add headers.

### Editable descriptive columns

`Genre`, `Runtime`, `Synopsis`, `ImageUrl` and `StillUrl` are edited **here**,
exactly like `Country` and `CoProductionCountries`. They used to be re-derived on
every build from `full_mubi_data.csv`, which meant edits to the sheet's `Genre`
column were silently discarded. `scripts/bake_mubi_fields.py` baked the current
values in and `convert-data.py` now reads them from the sheet.

`Genre` is a comma-separated list. Keep to the existing vocabulary — run the
"distinct genres" check in `bake_mubi_fields.py`'s notes if you're unsure.

## Important notes

- This workbook is the **source of truth** for everything the site shows.
- Always edit the workbook first, then regenerate the JSON.
- Never hand-edit files in `/public/data` — they are generated and will be
  overwritten.

## Regenerating the JSON

```bash
python scripts/convert-data.py       # workbook  -> films/countries/directors/polls.json
python scripts/merge_tmdb_images.py  # + tmdbId and poster/backdrop paths
```

Occasional, not part of a normal build:

```bash
python scripts/backfill_tmdb_details.py   # fills BLANK Genre/Runtime/Synopsis
                                          # cells in the workbook from TMDB.
                                          # Re-run convert-data.py afterwards.
```
