# Source Data

This folder contains the **source data files** for the Sight & Sound Canon Explorer.

## Files

- **`sight_and_sound.xlsx`** - The master dataset containing all 4,851 films from the Sight & Sound polls (1952-2022)

## Excel File Structure

The Excel file contains multiple sheets:
- **"main data"** - Primary sheet with 4,851 films × 26 columns (USE THIS FOR ALL ANALYSIS)
- **"votes per poll"** - Aggregated poll statistics
- **Individual poll sheets** - 1952, 1962, 1972, 1982, 1992, 2002, 2012, 2022

## Important Notes

- This Excel file is the **source of truth** for all data
- For production/web use, convert to JSON files in `/public/data`
- Always update this Excel file first, then regenerate JSON files
- File size: ~2-3 MB (too large for efficient web loading)

## Converting to JSON

To convert the Excel file to optimized JSON for web use, run:
```bash
# Future: Add conversion script here
npm run convert-data
```

This will generate optimized JSON files in `/public/data/`:
- `films.json` - All film records
- `countries.json` - Pre-aggregated country statistics
- `directors.json` - Pre-aggregated director statistics
- `polls.json` - Poll summary data
