"""
The one place genre rules live: the controlled vocabulary, and the alias map
that folds older and foreign spellings into it.

The workbook's "main data" sheet owns the Genre column and is hand-edited, so the
vocabulary is not decoration -- it's what catches a typo before it ships as a 38th
genre nobody meant to create.

WHERE THE VOCABULARY COMES FROM
  MUBI's own taxonomy is the primary source (~98% of films). It is cinephile-shaped:
  it carries Avant-Garde, Silent, Cult, Erotica and LGBTQ+, none of which exist in
  TMDB's mass-market list. TMDB backfilled ~86 films MUBI never covered. Seven tags
  were hand-added in the sheet for works neither service has a record of: Newsreel,
  Social Media, VR, Installation, YouTube Video, Unmade Film, Curated Program.

SETTLED 2026-09-02 / 2026-09-12, after a six-pass review (see genre_compose.py):
  Action + Adventure merged to "Action & Adventure"; History + Biography to
  "History & Biography", and the merged tag is applied only when the film is
  primarily a period / true-story film.
  "Film noir" retired outright: a style, not a genre, and not wanted as an attribute.
  "Cult" retired outright (2026-09-12): it was the ONE tag in the vocabulary whose
  criterion lived entirely outside the work. "Is this a children's film", "is this
  about a sport", "is there a documentary apparatus" can all be checked against the
  film; "did an audience adopt this" cannot. It was also time-dependent in a way the
  others are not -- Blade Runner was a flop, then cult, then canon; Pulp Fiction is
  mainstream canon now. Removing it cost nothing structurally: of its 157 films, ZERO
  had it as their only tag and ZERO were left without a genre. The reception question
  is better answered by this dataset's own eight-poll vote trajectories than by a label.
  "Docufiction" retired unused: it belonged to an earlier residual-Drama scheme
  (GENRE_TAXONOMY_SPEC.md) that was superseded before anything was written.
  Horror vs Thriller is decided per film, never by rule.

NOTE ON MEANING, since two tags read as era markers and aren't:
  Silent  = no dialogue, not "made before 1930". Correctly applied to The Artist
            (2011), Deadpan (1997) and Brakhage's The Text of Light (1974).
  Short   = MUBI's own line, looser than the Academy's 40 minutes; a few
            medium-length films (Zero for Conduct, 49m) carry it. Left as MUBI had
            it rather than re-cut to a rule they weren't using.
"""

# Older and foreign spellings -> the settled vocabulary. A value may expand to
# more than one tag. Keeps previously-valid data loadable after the merges.
GENRE_ALIASES = {
    "Science Fiction": ["Sci-Fi"],
    "Sci-Fi & Fantasy": ["Sci-Fi", "Fantasy"],
    "Avant Garde": ["Avant-Garde"],          # unhyphenated variant found in the sheet
    "Action": ["Action & Adventure"],        # merged 2026-09-02
    "Adventure": ["Action & Adventure"],
    "History": ["History & Biography"],
    "Biography": ["History & Biography"],
}

# TWO FAMILIES FOR THE READER, THREE SETS FOR THE CODE.
#
# The Genre column mixes what a film IS with what it's ABOUT, and the two do not
# compete: sorted by count, "Short" (530) lands 5th, above Avant-Garde, Crime and
# Thriller -- but "under 40 minutes" is not an alternative to "crime film"; a work
# is both. Every tag below is correctly applied. What these sets record is that
# they answer different questions.
#
# WHAT THE READER SEES IS CONTENT vs FORMAT (decided 2026-09-12). Everything in
# CONTENT_TAGS is one list: one ranked chart, one kind of detail page, one filter.
# LGBTQ+ (163) sits beside Mystery (166) because they are the same kind of thing.
# All of it is filterable and sortable the same way -- /genres/short works like
# /genres/western. Only FORMAT is held out of a content ranking, and only in charts:
#   1. Any single ranked axis. Including format puts Short 5th and Silent 11th
#      among things they don't compete with -- a film is both Short and a Western.
#   2. Share-over-time lines. Silent falling 27% -> 3.9% is a production-era fact;
#      Documentary rising 10% -> 13.6% is a taste fact. One legend implies they
#      are the same kind of change.

# What it IS -- medium, length, delivery.
FORMAT_TAGS = {
    "Short",             # MUBI's line, looser than the Academy's 40 minutes
    "Silent",            # no dialogue, NOT "made before 1930" -- cf. The Artist
    "Animation",         # a medium, not a subject: an animated film is also a comedy
    "Anthology",         # portmanteau / omnibus
    "TV Movie",          # one-off made for television (Histoire(s) du cinema)
    "TV Mini-series",    # closed run (The Decalogue, Berlin Alexanderplatz)
    "TV Series",         # ongoing (Twin Peaks: The Return)
    "Newsreel",
    "Music Video",
    "Social Media",      # posted to a platform: a livestream, a party broadcast
    "YouTube Video",     # made FOR YouTube -- the first upload, a video-essay series
    "Installation",      # a gallery object: multi-screen, durational, walk-in
    "VR",
    "Unmade Film",       # voted for, never shot -- see Land Without Evil (2003)
    "Curated Program",   # a screening programme, not a film
}

# THEME: content, but not SUFFICIENT to say what kind of film this is.
#
# This is the real line, and it is NOT the line that governs Drama (2026-09-12).
# Measured against the data, family membership does not predict Drama-displacement
# at all: Comedy co-lists with Drama on 362 films (40%) and Avant-Garde on 114 (21%),
# both FORM tags behaving exactly like theme tags, while Documentary, Crime, Thriller,
# Horror and Western displace it on 0-1%. Displacement is its own rule, below.
#
# What IS true of every tag here: it names a subject, an audience or a truth-relation,
# never a form. So it can never stand alone as the answer to "what kind of film is
# this", and Drama survives beside it. Verified across the 94 films where Drama plus
# one of these is the whole content description -- displacing Drama would leave
# Moonlight as "LGBTQ+", Whiplash as "Music", Fat City as "Sport". All worse.
#
# Not lesser, just insufficient: at 163 films LGBTQ+ is larger than Mystery,
# Musical, Sci-Fi, Fantasy or Western.
#
#   LGBTQ+  desire or identity in the TEXT, not in the reception. Admitting coded
#           readings would add ~30 films and cannot be applied to one film only,
#           so Persona and Fanny and Alexander are out while Merry Christmas Mr
#           Lawrence, Midnight Cowboy and Dog Day Afternoon are in.
#   Music   three bounded clauses: about music or musicians; a concert film; or a
#           setting of a score, where the music co-authors the film (Koyaanisqatsi,
#           Lemonade, The Color of Pomegranates). NOT "the score is famous".
#   Sport   the most accurate tag in the set; its smallness (34) is a finding
#           about this canon, not a defect.
#   Docufiction  the film's own nonfiction claim is deliberately crossed: a
#           documentary that stages what it presents as observed (Nanook, Man of
#           Aran, The Act of Killing), a fiction that wears documentary clothes
#           (Zelig, Punishment Park, Blair Witch), or real people playing themselves
#           in scripted situations (Close-Up, Moi un noir). It sits BESIDE the
#           primary form rather than displacing it, because for most of these films
#           Documentary is true -- staged is HOW, not WHETHER, and dropping
#           Documentary would take Nanook and F for Fake out of the documentary list
#           a reader expects to find them in. NOT for historical fiction that
#           reconstructs events (October, All the President's Men), essay films
#           (Histoire(s), Handsworth Songs), or neorealist casting of amateurs
#           (La Terra Trema) -- none of those makes a nonfiction claim to cross.
THEME_TAGS = {
    "LGBTQ+", "Music", "Family", "Erotica", "Sport", "Docufiction",
}

# FORM: content that IS sufficient -- each of these answers "what kind of film is
# this" on its own, which is why one of them can stand in for Drama.
# Documentary sits here by convention -- arguably a mode rather than a genre, but
# universally read as one and behaves like one.
#
# Drama is RESIDUAL: serious narrative fiction with no other defining genre. It is
# co-listed with exactly two tags unconditionally, in both cases because the tag
# marks an exception to that genre's default tone rather than restating it:
#   Comedy + Drama       the dramedy (Certified Copy, Le Havre) vs broad comedy
#   Avant-Garde + Drama  narrative art film (Jeanne Dielman) vs non-narrative
# Romance joined that list 2026-09-02 but is judged per film: it survives beside
# Drama only when the love story is the spine. Every other genre tag displaces Drama.
FORM_TAGS = {
    "Action & Adventure", "Avant-Garde", "Comedy", "Crime", "Documentary", "Drama",
    "Fantasy", "History & Biography", "Horror", "Musical", "Mystery", "Romance",
    "Sci-Fi", "Thriller", "War", "Western",
}

# THE COMPOSITION RULE, in one place instead of implied by family membership.
# Drama is residual -- "serious narrative fiction with no other defining genre" -- so
# a tag that names the form replaces it. These ten do so unconditionally; measured,
# they co-list with Drama on 0-2% of their films, and those are the known mistags.
DISPLACES_DRAMA = {
    "Documentary", "Crime", "Thriller", "Action & Adventure", "Horror",
    "History & Biography", "War", "Sci-Fi", "Fantasy", "Western",
}
# Musical, Mystery and Romance are judged per film (they co-list at 9%, 20% and 55%).
# Comedy and Avant-Garde never displace Drama -- the dramedy and the narrative art
# film -- and neither does anything in THEME_TAGS.

# What the reader browses as one list: 22 tags.
CONTENT_TAGS = FORM_TAGS | THEME_TAGS

# Everything valid.
GENRE_VOCABULARY = FORMAT_TAGS | CONTENT_TAGS

# Back-compat for scripts written before the 2026-09-12 rename. GENRE_TAGS meant
# exactly FORM_TAGS, so the older passes keep selecting the films they selected.
GENRE_TAGS = FORM_TAGS
SUBJECT_TAGS = THEME_TAGS


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
