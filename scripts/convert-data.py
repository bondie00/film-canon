#!/usr/bin/env python3
"""
Sight & Sound Data Conversion Script
Converts sight_and_sound.xlsx to optimized JSON files for web use

Usage:
    python scripts/convert-data.py

Generates:
    - public/data/films.json
    - public/data/countries.json
    - public/data/directors.json
    - public/data/polls.json
"""

import pandas as pd
import json
from collections import defaultdict
from pathlib import Path

# Poll years constant
POLL_YEARS = [1952, 1962, 1972, 1982, 1992, 2002, 2012, 2022]

# Country to continent mapping
CONTINENT_MAP = {
    # North America
    'United States': 'North America', 'Canada': 'North America', 'Mexico': 'North America',
    'Cuba': 'North America', 'Dominican Republic': 'North America', 'Greenland': 'North America',
    'Haiti': 'North America', 'Jamaica': 'North America', 'Martinique': 'North America',

    # Latin America
    'Argentina': 'Latin America', 'Brazil': 'Latin America', 'Chile': 'Latin America',
    'Colombia': 'Latin America', 'Peru': 'Latin America', 'Bolivia': 'Latin America',
    'Uruguay': 'Latin America', 'Venezuela': 'Latin America', 'Ecuador': 'Latin America',
    'Paraguay': 'Latin America', 'Guatemala': 'Latin America', 'Nicaragua': 'Latin America',
    'Costa Rica': 'Latin America', 'Panama': 'Latin America', 'El Salvador': 'Latin America',
    'Guyana': 'Latin America',

    # Europe
    'United Kingdom': 'Europe', 'France': 'Europe', 'Germany': 'Europe', 'Italy': 'Europe',
    'Spain': 'Europe', 'Poland': 'Europe', 'Russia': 'Europe', 'Sweden': 'Europe',
    'Denmark': 'Europe', 'Norway': 'Europe', 'Finland': 'Europe', 'Netherlands': 'Europe',
    'Belgium': 'Europe', 'Austria': 'Europe', 'Switzerland': 'Europe', 'Greece': 'Europe',
    'Portugal': 'Europe', 'Czech Republic': 'Europe', 'Hungary': 'Europe', 'Romania': 'Europe',
    'Serbia': 'Europe', 'Croatia': 'Europe', 'Ireland': 'Europe', 'Slovakia': 'Europe',
    'Bulgaria': 'Europe', 'Slovenia': 'Europe', 'Lithuania': 'Europe', 'Latvia': 'Europe',
    'Estonia': 'Europe', 'Iceland': 'Europe', 'Bosnia and Herzegovina': 'Europe',
    'Albania': 'Europe', 'Macedonia': 'Europe', 'Montenegro': 'Europe', 'Kosovo': 'Europe',
    'Belarus': 'Europe', 'Ukraine': 'Europe', 'Moldova': 'Europe', 'Armenia': 'Europe',
    'Georgia': 'Europe', 'Luxembourg': 'Europe', 'Malta': 'Europe', 'Cyprus': 'Europe',
    'Faroe Islands': 'Europe',

    # Historic Europe
    'West Germany': 'Europe', 'East Germany': 'Europe', 'Soviet Union': 'Europe',
    'Yugoslavia': 'Europe', 'Czechoslovakia': 'Europe',

    # Asia
    'Japan': 'Asia', 'China': 'Asia', 'South Korea': 'Asia', 'India': 'Asia',
    'Iran': 'Asia', 'Taiwan': 'Asia', 'Hong Kong': 'Asia', 'Thailand': 'Asia',
    'Vietnam': 'Asia', 'Indonesia': 'Asia', 'Philippines': 'Asia', 'Malaysia': 'Asia',
    'Singapore': 'Asia', 'Pakistan': 'Asia', 'Bangladesh': 'Asia', 'Afghanistan': 'Asia',
    'Lebanon': 'Asia', 'Israel': 'Asia', 'Palestine': 'Asia', 'Syria': 'Asia',
    'Iraq': 'Asia', 'Jordan': 'Asia', 'Saudi Arabia': 'Asia', 'Turkey': 'Asia',
    'Kazakhstan': 'Asia', 'Uzbekistan': 'Asia', 'Cambodia': 'Asia', 'Laos': 'Asia',
    'Myanmar': 'Asia', 'Sri Lanka': 'Asia', 'Nepal': 'Asia', 'Mongolia': 'Asia',
    'North Korea': 'Asia', 'Kyrgyzstan': 'Asia', 'Tajikistan': 'Asia',

    # Africa
    'South Africa': 'Africa', 'Egypt': 'Africa', 'Nigeria': 'Africa', 'Kenya': 'Africa',
    'Morocco': 'Africa', 'Algeria': 'Africa', 'Tunisia': 'Africa', 'Senegal': 'Africa',
    'Mali': 'Africa', 'Burkina Faso': 'Africa', 'Cameroon': 'Africa', 'Chad': 'Africa',
    'Angola': 'Africa', 'Zimbabwe': 'Africa', 'Ghana': 'Africa', 'Ethiopia': 'Africa',
    'Democratic Republic of the Congo': 'Africa', 'Mauritania': 'Africa',
    'Ivory Coast': 'Africa', 'Sudan': 'Africa', 'Niger': 'Africa', 'Guinea-Bissau': 'Africa',
    'Lesotho': 'Africa', 'Mozambique': 'Africa', 'Rwanda': 'Africa', 'Somalia': 'Africa',

    # Oceania
    'Australia': 'Oceania', 'New Zealand': 'Oceania', 'Fiji': 'Oceania'
}


def generate_films_json(df, output_path):
    """Generate films.json with all film data"""
    print("Generating films.json...")

    films = []
    for _, row in df.iterrows():
        # Parse directors array
        directors = []
        if pd.notna(row['ARR_DirectorArray']) and str(row['ARR_DirectorArray']).strip():
            directors = [d.strip() for d in str(row['ARR_DirectorArray']).split(';')]
            directors = [d for d in directors if d and d != 'N/A']

        # Parse countries array
        countries = []
        if pd.notna(row['ARR_CountryArray']) and str(row['ARR_CountryArray']).strip():
            countries = [c.strip() for c in str(row['ARR_CountryArray']).split(';')]
            countries = [c for c in countries if c]

        # Build poll history
        poll_history = []
        for year in POLL_YEARS:
            rank = int(row[f'{year}rank']) if pd.notna(row[f'{year}rank']) else None
            votes = int(row[f'{year}votes']) if pd.notna(row[f'{year}votes']) else 0
            poll_history.append({
                'year': year,
                'rank': rank,
                'votes': votes
            })

        film = {
            'key': int(row['key']),
            'FilmTitle': str(row['FilmTitle']),
            'databaseFilmTitle': str(row['databaseFilmTitle']),
            'Year': str(row['Year']) if pd.notna(row['Year']) else None,
            'directors': directors,
            'countries': countries,
            'pollHistory': poll_history
        }
        films.append(film)

    # Write to file
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(films, f, ensure_ascii=False, indent=2)

    file_size = Path(output_path).stat().st_size
    print(f"✓ Generated {output_path}")
    print(f"  Total films: {len(films):,}")
    print(f"  File size: {file_size:,} bytes ({file_size/1024/1024:.1f}M)")


def generate_countries_json(df, output_path):
    """Generate countries.json with country statistics"""
    print("\nGenerating countries.json...")

    # Collect all unique countries
    all_countries = set()
    for countries_str in df['ARR_CountryArray'].dropna():
        if pd.notna(countries_str) and str(countries_str).strip():
            countries = [c.strip() for c in str(countries_str).split(';')]
            all_countries.update([c for c in countries if c])

    countries_data = {}

    for country in sorted(all_countries):
        # Count total films
        total_films = sum(1 for _, row in df.iterrows()
                         if pd.notna(row['ARR_CountryArray']) and
                         country in [c.strip() for c in str(row['ARR_CountryArray']).split(';')])

        # Get continent
        continent = CONTINENT_MAP.get(country, 'Unknown')

        # Count by poll
        by_poll = {}
        for year in POLL_YEARS:
            votes_col = f'{year}votes'
            count = 0
            top100 = top250 = top500 = 0

            for _, row in df.iterrows():
                if pd.notna(row['ARR_CountryArray']) and str(row['ARR_CountryArray']).strip():
                    countries = [c.strip() for c in str(row['ARR_CountryArray']).split(';')]
                    if country in countries and row[votes_col] > 0:
                        count += 1
                        rank = row[f'{year}rank']
                        if pd.notna(rank):
                            if rank <= 100: top100 += 1
                            if rank <= 250: top250 += 1
                            if rank <= 500: top500 += 1

            by_poll[str(year)] = {
                'total': count,
                'top100': top100,
                'top250': top250,
                'top500': top500
            }

        # Count by decade
        by_decade = {}
        for _, row in df.iterrows():
            if pd.notna(row['ARR_CountryArray']) and str(row['ARR_CountryArray']).strip():
                countries = [c.strip() for c in str(row['ARR_CountryArray']).split(';')]
                if country in countries:
                    year_val = row['Year']
                    if pd.notna(year_val) and str(year_val).strip() and str(year_val) != 'nan':
                        year_str = str(year_val)
                        # Handle year ranges (take start year)
                        if '-' in year_str:
                            year_str = year_str.split('-')[0]

                        try:
                            year_int = int(year_str)
                            decade = (year_int // 10) * 10
                            decade_key = f"{decade}s"
                            by_decade[decade_key] = by_decade.get(decade_key, 0) + 1
                        except:
                            pass

        countries_data[country] = {
            'continent': continent,
            'totalFilms': total_films,
            'byPoll': by_poll,
            'byDecade': by_decade
        }

    # Write to file
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(countries_data, f, ensure_ascii=False, indent=2)

    file_size = Path(output_path).stat().st_size
    print(f"✓ Generated {output_path}")
    print(f"  Total countries: {len(countries_data):,}")
    print(f"  File size: {file_size:,} bytes ({file_size/1024:.1f}K)")

    # Show top 10 countries
    print("\n  Top 10 countries by total films:")
    sorted_countries = sorted(countries_data.items(), key=lambda x: x[1]['totalFilms'], reverse=True)
    for i, (country, data) in enumerate(sorted_countries[:10], 1):
        print(f"    {i:2}. {country:25s} - {data['totalFilms']:4d} films ({data['continent']})")


def generate_directors_json(df, output_path):
    """Generate directors.json with director statistics (optimized)"""
    print("\nGenerating directors.json...")

    # Initialize director data structure
    directors_data = defaultdict(lambda: {
        'films': [],
        'pollsAppeared': set(),
        'bestRank': None
    })

    # Single pass through all films
    for _, row in df.iterrows():
        directors_str = str(row['ARR_DirectorArray'])

        if pd.notna(row['ARR_DirectorArray']) and str(row['ARR_DirectorArray']).strip() and str(row['ARR_DirectorArray']) != 'nan':
            directors = [d.strip() for d in directors_str.split(';')]
            directors = [d for d in directors if d and d != 'N/A']

            # Film data
            film_data = {
                'key': int(row['key']),
                'title': str(row['FilmTitle']),
                'year': str(row['Year']) if pd.notna(row['Year']) else None,
                'rank2022': int(row['2022rank']) if pd.notna(row['2022rank']) else None,
                'votes2022': int(row['2022votes']) if pd.notna(row['2022votes']) else 0
            }

            # Process each director for this film
            for director in directors:
                # Add film to director's filmography
                directors_data[director]['films'].append(film_data)

                # Track which polls this director appeared in
                for year in POLL_YEARS:
                    votes = row[f'{year}votes']
                    if pd.notna(votes) and votes > 0:
                        directors_data[director]['pollsAppeared'].add(year)

                    # Track best rank
                    rank = row[f'{year}rank']
                    if pd.notna(rank):
                        current_best = directors_data[director]['bestRank']
                        if current_best is None or rank < current_best:
                            directors_data[director]['bestRank'] = int(rank)

    # Convert to final format
    final_data = {}
    for director, data in directors_data.items():
        # Sort films by 2022 votes (descending) and take top 10
        sorted_films = sorted(data['films'], key=lambda x: x['votes2022'], reverse=True)

        final_data[director] = {
            'totalFilms': len(data['films']),
            'films': sorted_films[:10],  # Top 10 films only
            'pollsAppeared': len(data['pollsAppeared']),
            'bestRank': data['bestRank']
        }

    # Write to file
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(final_data, f, ensure_ascii=False, indent=2)

    file_size = Path(output_path).stat().st_size
    print(f"✓ Generated {output_path}")
    print(f"  Total directors: {len(final_data):,}")
    print(f"  File size: {file_size:,} bytes ({file_size/1024:.1f}K)")

    # Show top 10 directors
    print("\n  Top 10 directors by film count:")
    sorted_directors = sorted(final_data.items(), key=lambda x: x[1]['totalFilms'], reverse=True)
    for i, (director, data) in enumerate(sorted_directors[:10], 1):
        best_rank = data['bestRank'] if data['bestRank'] else 'N/A'
        print(f"    {i:2}. {director:35s} - {data['totalFilms']:3d} films (best rank: {best_rank})")


def generate_polls_json(df, output_path):
    """Generate polls.json with poll metadata"""
    print("\nGenerating polls.json...")

    polls_data = {}

    for year in POLL_YEARS:
        votes_col = f'{year}votes'
        rank_col = f'{year}rank'

        # Count films with votes in this poll
        films_with_votes = sum(1 for _, row in df.iterrows() if row[votes_col] > 0)

        # Find top film (rank 1)
        top_film_row = df[df[rank_col] == 1]
        top_film = None
        if len(top_film_row) > 0:
            top_film = {
                'title': str(top_film_row.iloc[0]['FilmTitle']),
                'rank': 1,
                'votes': int(top_film_row.iloc[0][votes_col])
            }

        polls_data[str(year)] = {
            'year': year,
            'filmsWithVotes': films_with_votes,
            'topFilm': top_film
        }

    # Write to file
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(polls_data, f, ensure_ascii=False, indent=2)

    file_size = Path(output_path).stat().st_size
    print(f"✓ Generated {output_path}")
    print(f"  Total polls: {len(polls_data)}")
    print(f"  File size: {file_size:,} bytes ({file_size/1024:.1f}K)")


def main():
    """Main conversion function"""
    print("=" * 60)
    print("Sight & Sound Data Conversion")
    print("=" * 60)

    # Read Excel file
    excel_path = 'data/sight and sound.xlsx'
    print(f"\nReading {excel_path}...")
    df = pd.read_excel(excel_path, sheet_name='main data')
    print(f"Loaded {len(df):,} films from Excel")

    # Ensure output directory exists
    output_dir = Path('public/data')
    output_dir.mkdir(parents=True, exist_ok=True)

    # Generate all JSON files
    generate_films_json(df, output_dir / 'films.json')
    generate_countries_json(df, output_dir / 'countries.json')
    generate_directors_json(df, output_dir / 'directors.json')
    generate_polls_json(df, output_dir / 'polls.json')

    print("\n" + "=" * 60)
    print("✓ All JSON files generated successfully!")
    print("=" * 60)
    print("\nNext steps:")
    print("  1. Review the generated files in public/data/")
    print("  2. Commit the updated JSON files to git")
    print("  3. The web app will now use the latest data")


if __name__ == '__main__':
    main()
