"""
The one place genre rules live: the controlled vocabulary, and the alias map
that folds foreign spellings into it.

The workbook's "main data" sheet owns the Genre column (see bake_mubi_fields.py),
and it is hand-edited. So the vocabulary is not decoration -- it's what catches a
typo before it ships as a 38th genre nobody meant to create.

WHERE THE VOCABULARY COMES FROM
  33 tags  MUBI's own taxonomy, the primary source for genre. Cinephile-shaped:
           it carries Avant-Garde, Silent, Film noir, Cult, Erotica and LGBTQ+,
           none of which exist in TMDB's mass-market list.
   3 tags  Newsreel, Social Media, VR -- hand-added in the sheet for six films
           MUBI never covered. Kept: they describe those films accurately and
           nothing in MUBI's list does.

  ("Curated Program" was a seventh hand-added value, on one film. It was a MUBI
  *programming* label -- a Viennale 16mm sidebar -- not a genre, and was dropped;
  that film's Avant-Garde tag already says what it is.)

NOTE ON MEANING, since two tags read as era markers and aren't:
  Silent  = no dialogue, not "made before 1930". It is correctly applied to The
            Artist (2011), Deadpan (1997) and Brakhage's The Text of Light (1974).
  Short   = MUBI's own line, which is looser than the Academy's 40 minutes; a few
            medium-length films (Zero for Conduct, 49m) carry it. Left as MUBI
            had it rather than re-cut to a rule they weren't using.

TMDB, used only to backfill films MUBI missed, supplies 18 genre names. All but
three are already MUBI spellings; those three are the alias map below. Two of
them come from TMDB's separate *television* vocabulary, which is why they're
compounds that expand to two tags each.
"""

# TMDB spellings -> MUBI's. A value may expand to more than one tag.
GENRE_ALIASES = {
    "Science Fiction": ["Sci-Fi"],
    "Sci-Fi & Fantasy": ["Sci-Fi", "Fantasy"],
    "Action & Adventure": ["Action", "Adventure"],
    # Not from TMDB: an unhyphenated variant that was sitting in the sheet.
    "Avant Garde": ["Avant-Garde"],
}

# TWO AXES, ONE COLUMN.
#
# The Genre column mixes what a film IS with what it's ABOUT, and the two do not
# compete. Sorted by count, "Short" (514) lands between Avant-Garde and Crime --
# but "under 40 minutes" is not an alternative to "crime film"; a work is both.
# Every tag below is correctly applied. What was missing is the knowledge that
# they answer different questions, which is what these two sets record.
#
# Nothing needs to move between them in the data. Rank genres by GENRE_TAGS;
# offer FORMAT_TAGS as a separate filter. New categories for the things people
# vote for that aren't really films go in FORMAT_TAGS, and get handled as a
# separate axis for free.

# What it IS -- medium, length, delivery. 812 tag instances across ~700 films.
FORMAT_TAGS = {
    "Short",             # MUBI's line, looser than the Academy's 40 minutes
    "Silent",            # no dialogue, NOT "made before 1930" -- cf. The Artist
    "Anthology",         # portmanteau / omnibus
    "TV Movie",          # one-off made for television (Histoire(s) du cinema)
    "TV Mini-series",    # closed run (The Decalogue, Berlin Alexanderplatz)
    "TV Series",         # ongoing (Twin Peaks: The Return)
    "Newsreel",
    "Music Video",
    "Social Media",
    "VR",
    "Curated Program",   # a screening programme, not a film
}

# What it's ABOUT. Documentary sits here by convention -- it is arguably a mode
# rather than a genre, but it is universally read as one and behaves like one.
GENRE_TAGS = {
    "Action", "Adventure", "Animation", "Avant-Garde", "Biography", "Comedy",
    "Crime", "Cult", "Documentary", "Drama", "Erotica", "Family", "Fantasy",
    "Film noir", "History", "Horror", "LGBTQ+", "Music", "Musical", "Mystery",
    "Romance", "Sci-Fi", "Sport", "Thriller", "War", "Western",
}

# Everything valid. 33 of these are MUBI's own taxonomy, verified against every
# genres/0..6 value in full_mubi_data.csv; the other four (Newsreel, Social
# Media, VR, Curated Program) were hand-added in the sheet for six films MUBI
# has no record of, and are kept -- they describe those works and nothing in
# MUBI's list does.
GENRE_VOCABULARY = FORMAT_TAGS | GENRE_TAGS


def normalize_genres(genres):
    """Apply the alias map, then dedupe preserving first-seen order."""
    out = []
    for genre in genres or []:
        for mapped in GENRE_ALIASES.get(genre, [genre]):
            if mapped not in out:
                out.append(mapped)
    return out


def unknown_genres(genres):
    """The tags in `genres` that are outside the vocabulary. Empty tuple is good."""
    return tuple(g for g in (genres or []) if g not in GENRE_VOCABULARY)
