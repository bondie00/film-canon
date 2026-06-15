// Image-URL helpers with a MUBI → TMDB → none fallback chain.
//
// films.json carries up to four image sources per film:
//   imageUrl         MUBI poster   (~41% coverage)
//   stillUrl         MUBI backdrop (~98% coverage)
//   tmdbPosterPath   TMDB poster path, e.g. "/abc.jpg"   (fills ~2,700 poster gaps)
//   tmdbBackdropPath TMDB backdrop path                  (fills ~25 backdrop gaps)
//
// TMDB paths are size-agnostic — choose the size at render time by prefixing
// https://image.tmdb.org/t/p/<size>. MUBI urls are already fully-formed.

const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p'

// Valid TMDB sizes (width in px). Backdrops: w300 w780 w1280 original.
// Posters: w92 w154 w185 w342 w500 w780 original.
const tmdb = (path, size) => (path ? `${TMDB_IMG_BASE}/${size}${path}` : null)

/** Landscape backdrop. MUBI still → TMDB backdrop → null. */
export function backdropUrl(film, size = 'w780') {
  return film.stillUrl || tmdb(film.tmdbBackdropPath, size) || null
}

/** Vertical poster. MUBI poster → TMDB poster → null. */
export function posterUrl(film, size = 'w342') {
  return film.imageUrl || tmdb(film.tmdbPosterPath, size) || null
}

/**
 * Best image for a wide/landscape slot (explore cards, detail hero).
 * Prefers a backdrop; falls back to a poster if no backdrop exists.
 * Returns { url, kind: 'backdrop' | 'poster' | 'none' } so the UI can adapt
 * object-fit (backdrops fill; poster fallbacks letterbox/blur to avoid distortion).
 */
export function landscapeImage(film, { backdropSize = 'w780', posterSize = 'w342' } = {}) {
  const b = backdropUrl(film, backdropSize)
  if (b) return { url: b, kind: 'backdrop' }
  const p = posterUrl(film, posterSize)
  if (p) return { url: p, kind: 'poster' }
  return { url: null, kind: 'none' }
}
