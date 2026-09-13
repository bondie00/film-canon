/**
 * The genre vocabulary, as the frontend needs it.
 *
 * A MIRROR of scripts/genre_vocab.py, which owns the rules and guards the
 * hand-edited GenreRevised column. If a tag is added or moved there, move it
 * here too. A tag missing from these sets is treated as content, so a new one
 * still shows up — just possibly in the wrong family.
 *
 * Two families for the reader:
 *   CONTENT  what kind of film it is, or what it's about — one list of 22.
 *   FORMAT   what the work IS: medium, length, delivery. "Short" is not an
 *            alternative to "crime film"; a work is both. So format is held out
 *            of anything that ranks genres against each other.
 *
 * Inside content, FORM vs THEME matters only for ordering: a form tag answers
 * "what kind of film is this" on its own, a theme tag (LGBTQ+, Music…) never
 * does, so forms read first.
 */

export const FORMAT_TAGS = new Set([
  'Short', 'Video Game', 'Silent', 'Animation', 'Anthology', 'TV Movie',
  'TV Mini-series', 'TV Series', 'Newsreel', 'Music Video', 'Social Media',
  'YouTube Video', 'Installation', 'VR', 'Unmade Film', 'Curated Program',
])

export const THEME_TAGS = new Set([
  'LGBTQ+', 'Music', 'Family', 'Erotica', 'Sport', 'Docufiction',
])

export const isFormatTag = tag => FORMAT_TAGS.has(tag)

/**
 * Keep films carrying EVERY selected tag.
 *
 * Genre picks narrow, where country and director picks add up, deliberately.
 * A film has one country (almost always) but ~1.7 genres, so "Japan + France"
 * can only mean either, while "Comedy + Romance" means romantic comedies; the
 * union of two genre lists is rarely a question anyone is asking. It is also the
 * rule BETWEEN filters on the page already (a country, then a year, narrows).
 */
export function filterFilmsByGenres(films, genres) {
  if (!films || !genres?.length) return films
  return films.filter(f => {
    const tags = f.genres || []
    return genres.every(g => tags.includes(g))
  })
}

/**
 * Split a film's tags into content and format, each in reading order.
 *
 * Content order: form tags, then Drama, then theme tags. Drama goes last among
 * forms because it is residual — "serious narrative fiction with no other
 * defining genre" — so beside Comedy or Avant-Garde it's the qualifier, and the
 * sheet's own order (Certified Copy is "Drama, Comedy") isn't meaningful enough
 * to preserve. Within each group the sheet order stands.
 */
export function splitGenres(genres = []) {
  const format = []
  const forms = []
  const themes = []
  let drama = false
  for (const tag of genres) {
    if (FORMAT_TAGS.has(tag)) format.push(tag)
    else if (tag === 'Drama') drama = true
    else if (THEME_TAGS.has(tag)) themes.push(tag)
    else forms.push(tag)
  }
  return { content: [...forms, ...(drama ? ['Drama'] : []), ...themes], format }
}
