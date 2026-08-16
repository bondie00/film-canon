/**
 * Addresses of the entity and hub pages, in one place.
 *
 * Separate from lib/exploreUrl.js on purpose, and the split is not arbitrary:
 * exploreUrl builds a QUERY over the whole film set (repeatable country and
 * director params, year ranges — /explore's own filter vocabulary), while these
 * build the ADDRESS of one page, with the shared poll/depth filters carried
 * along as a passenger. Only the second kind needs to agree with the router.
 *
 * ## Carrying filters
 *
 * Every builder takes an optional `filters` — the object useFilterParams
 * returns. Pass it and the poll and rank depth ride along; omit it and you get
 * the bare path.
 *
 * The rule for WHEN to pass it: filters travel between pages that share the
 * filter vocabulary, along the hub-to-detail axis and back. A country panel on
 * the Countries hub passes them, because you picked a poll and clicking a
 * country should not silently discard it. The crumb back up passes them, for
 * the same reason in reverse.
 *
 * Global search does NOT pass them — a search is a jump from anywhere to
 * anywhere, and inheriting a Top 10 depth from the page you happened to be on
 * would hide almost everything on the page you asked for. Nor does the film
 * page, which has no poll filter of its own and so has nothing to carry.
 *
 * `top` is dropped for targets that have no rank-depth control (the director
 * detail page), rather than being carried invisibly: a filter you cannot see or
 * change should not be shaping what you're looking at.
 */

export const COUNTRIES_HUB = '/countries'
export const DIRECTORS_HUB = '/directors'
export const EXPLORE = '/explore'

/** Append whichever of the shared filters are set. `keep` narrows which apply. */
function withFilters(path, filters, keep = ['poll', 'top']) {
  if (!filters) return path
  const params = new URLSearchParams()
  if (keep.includes('poll') && filters.poll) params.set('poll', String(filters.poll))
  if (keep.includes('top') && filters.top != null) params.set('top', String(filters.top))
  const query = params.toString()
  return query ? `${path}?${query}` : path
}

export const countriesHubUrl = filters => withFilters(COUNTRIES_HUB, filters)
export const directorsHubUrl = filters => withFilters(DIRECTORS_HUB, filters)

export const countryUrl = (name, filters) =>
  withFilters(`${COUNTRIES_HUB}/${encodeURIComponent(name)}`, filters)

/**
 * The director detail page takes only the poll: it has no rank-depth control,
 * so a `top` carried in would filter the filmography with nothing on the page
 * to reveal or undo it.
 */
export const directorUrl = (name, filters) =>
  withFilters(`${DIRECTORS_HUB}/${encodeURIComponent(name)}`, filters, ['poll'])

export const filmUrl = key => `/film/${key}`
export const voterUrl = slug => `/voter/${encodeURIComponent(slug)}`
