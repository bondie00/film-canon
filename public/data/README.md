# Public Data Files (JSON)

This folder contains **processed JSON data files** optimized for web application use.

## Files (to be generated)

These files are generated from `/data/sight_and_sound.xlsx`:

- **`films.json`** - All 4,851 films with complete metadata
- **`countries.json`** - Pre-aggregated country statistics by poll/decade
- **`directors.json`** - Pre-aggregated director statistics
- **`polls.json`** - Poll summary and metadata
- **`top-films.json`** - Top 100/250/500 films for quick access

## Why JSON?

- ✅ Faster loading in browser (no Excel parsing library needed)
- ✅ Native JavaScript format
- ✅ Can be fetched directly via HTTP
- ✅ Smaller file sizes with compression
- ✅ Can be split into smaller chunks

## Usage in React

```javascript
// Fetch films data
const response = await fetch('/data/films.json');
const films = await response.json();

// Or with import (if using bundler)
import films from '/data/films.json';
```

## Regenerating Data

Whenever `/data/sight and sound data new.xlsx` is updated:
1. `python scripts/convert-data.py`
2. `python scripts/merge_tmdb_images.py`  (re-applies tmdbId + image paths)
3. Commit the updated JSON files

There is no `npm run convert-data` script; run the Python steps directly.
See `/data/README.md` for the full pipeline and which columns are editable.

## Notes

- These files are auto-generated - **do not edit manually**
- Always edit the source Excel file instead
- JSON files should be committed to git for deployment
