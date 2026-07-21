// Image-URL helpers with a MUBI → TMDB → none fallback chain.
//
// films.json carries up to four image sources per film:
//   imageUrl         MUBI artwork — 16:9 LANDSCAPE key art, not a poster (~41%)
//   stillUrl         MUBI backdrop (~98% coverage)
//   tmdbPosterPath   TMDB poster path, e.g. "/abc.jpg" — true 2:3 portrait (~96%)
//   tmdbBackdropPath TMDB backdrop path                  (fills ~25 backdrop gaps)
//
// NOTE: imageUrl is landscape artwork despite the "image" name — it is a
// backdrop-shaped source, NOT a portrait poster. Poster slots must use
// tmdbPosterPath; feeding imageUrl into a 2:3 frame crops it into a "wide shot
// jammed into a poster" (see posterUrl).
//
// TMDB paths are size-agnostic — choose the size at render time by prefixing
// https://image.tmdb.org/t/p/<size>. MUBI stills come as ".../image-w1280.jpg";
// MUBI also serves a small "image-w320.jpg" variant (the only two widths it
// offers). Request the small one for dense grids so the browser isn't loading
// and compositing full-size textures at thumbnail dimensions.

const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p'

// Valid TMDB sizes (width in px). Backdrops: w300 w780 w1280 original.
// Posters: w92 w154 w185 w342 w500 w780 original.
const tmdb = (path, size) => (path ? `${TMDB_IMG_BASE}/${size}${path}` : null)

// MUBI stills are only served at these two widths.
const MUBI_STILL_WIDTHS = [320, 1280]

/** Swap the width token in a MUBI still URL to the smallest available ≥ target. */
function mubiStillAt(url, targetWidth) {
  if (!url || !/image-w\d+\.jpg$/.test(url)) return url
  const pick = MUBI_STILL_WIDTHS.find(w => w >= targetWidth) ?? MUBI_STILL_WIDTHS[MUBI_STILL_WIDTHS.length - 1]
  return url.replace(/image-w\d+\.jpg$/, `image-w${pick}.jpg`)
}

/**
 * Landscape backdrop. MUBI still → TMDB backdrop → null.
 * mubiWidth picks the MUBI still size (320 for grids, 1280 for heroes);
 * tmdbSize is the TMDB backdrop size for the ~25 films that fall back to it.
 */
export function backdropUrl(film, { mubiWidth = 1280, tmdbSize = 'w780' } = {}) {
  if (film.stillUrl) return mubiStillAt(film.stillUrl, mubiWidth)
  return tmdb(film.tmdbBackdropPath, tmdbSize) || null
}

/**
 * Vertical 2:3 poster. Uses ONLY the TMDB poster (true portrait, ~96% coverage).
 * MUBI's imageUrl is 16:9 landscape artwork, so it is deliberately excluded — a
 * poster gap should fall back to a blurred backdrop + title card, not a cropped
 * wide shot.
 */
export function posterUrl(film, size = 'w342') {
  return tmdb(film.tmdbPosterPath, size) || null
}

/**
 * Best image for a wide/landscape slot (explore cards, detail hero).
 * Prefers a backdrop; falls back to a poster if no backdrop exists.
 * Returns { url, kind: 'backdrop' | 'poster' | 'none' } so the UI can adapt
 * object-fit (backdrops fill; poster fallbacks letterbox/blur to avoid distortion).
 */
export function landscapeImage(film, { mubiWidth = 1280, tmdbBackdropSize = 'w780', posterSize = 'w342' } = {}) {
  const b = backdropUrl(film, { mubiWidth, tmdbSize: tmdbBackdropSize })
  if (b) return { url: b, kind: 'backdrop' }
  const p = posterUrl(film, posterSize)
  if (p) return { url: p, kind: 'poster' }
  return { url: null, kind: 'none' }
}
