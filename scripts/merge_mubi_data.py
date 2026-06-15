"""
Merge selected MUBI columns into the Sight & Sound main data sheet.

Joins data/full_mubi_data.csv to data/sight and sound.xlsx via mubi_id <-> id,
adding three new columns to the "main data" sheet:
  - mubi_image_url   (from artworks/0/image_url)
  - mubi_genres      (genres/0..genres/6 combined, comma-separated)
  - mubi_still_url   (from still_url)

All other sheets in the workbook are preserved unchanged.
"""

from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
XLSX_PATH = ROOT / "data" / "sight and sound.xlsx"
MUBI_PATH = ROOT / "data" / "full_mubi_data.csv"

MUBI_COLS = [
    "id",
    "artworks/0/image_url",
    "genres/0", "genres/1", "genres/2", "genres/3",
    "genres/4", "genres/5", "genres/6",
    "still_url",
]
GENRE_COLS = [f"genres/{i}" for i in range(7)]


def combine_genres(row):
    values = [str(row[c]).strip() for c in GENRE_COLS if pd.notna(row[c]) and str(row[c]).strip()]
    return ", ".join(values) if values else ""


def main():
    print(f"Reading MUBI data from {MUBI_PATH.name}...")
    mubi = pd.read_csv(MUBI_PATH, usecols=MUBI_COLS, low_memory=False)
    mubi["mubi_genres"] = mubi.apply(combine_genres, axis=1)
    mubi = mubi.rename(columns={
        "id": "mubi_id",
        "artworks/0/image_url": "mubi_image_url",
        "still_url": "mubi_still_url",
    })
    mubi = mubi[["mubi_id", "mubi_image_url", "mubi_genres", "mubi_still_url"]]
    # MUBI CSV has duplicate rows per id (one per locale). Keep the first
    # complete row per id so the merge doesn't fan out.
    before = len(mubi)
    mubi = mubi.drop_duplicates(subset="mubi_id", keep="first").reset_index(drop=True)
    print(f"  {before} MUBI rows loaded, {len(mubi)} after deduping on id.")

    print(f"Reading workbook {XLSX_PATH.name}...")
    sheets = pd.read_excel(XLSX_PATH, sheet_name=None)
    main = sheets["main data"]
    print(f"  'main data' has {len(main)} rows.")

    # Drop pre-existing merge columns so re-runs are idempotent.
    for col in ("mubi_image_url", "mubi_genres", "mubi_still_url"):
        if col in main.columns:
            main = main.drop(columns=col)

    # Normalize join key types (sight & sound mubi_id is float w/ NaNs).
    main["_join_id"] = pd.to_numeric(main["mubi_id"], errors="coerce").astype("Int64")
    mubi["_join_id"] = mubi["mubi_id"].astype("Int64")

    merged = main.merge(
        mubi.drop(columns="mubi_id"),
        on="_join_id",
        how="left",
    ).drop(columns="_join_id")
    sheets["main data"] = merged

    matched = merged["mubi_image_url"].notna().sum() + merged["mubi_still_url"].notna().sum()
    genres_filled = (merged["mubi_genres"].fillna("") != "").sum()
    has_id = main["_join_id"].notna().sum() if "_join_id" in main.columns else 0
    print(f"  films with mubi_id: {merged['mubi_id'].notna().sum()}")
    print(f"  rows with at least one mubi field populated: {((merged['mubi_image_url'].notna()) | (merged['mubi_still_url'].notna()) | (merged['mubi_genres'].fillna('') != '')).sum()}")
    print(f"  mubi_genres populated: {genres_filled}")

    print(f"Writing workbook back to {XLSX_PATH.name}...")
    with pd.ExcelWriter(XLSX_PATH, engine="openpyxl") as writer:
        for name, df in sheets.items():
            df.to_excel(writer, sheet_name=name, index=False)
    print("Done.")


if __name__ == "__main__":
    main()
