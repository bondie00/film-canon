/**
 * A link into /explore carrying the filters the caller is already showing.
 *
 * Every surface that offers "see the rest of these films" goes through here, so
 * the handoff is identical from a panel, a chart or a page section — and so the
 * param names stay in one place if /explore ever renames one.
 *
 * `country` and `director` are repeatable on /explore, so each takes either one
 * name or an array (the world map selects a whole continent at once).
 */
const listOf = (value) => (value == null ? [] : Array.isArray(value) ? value : [value])

export function exploreUrl({ poll, top = null, country = null, director = null, yearRange = null } = {}) {
  const params = new URLSearchParams()
  if (poll) params.set('poll', String(poll))
  listOf(country).forEach(name => params.append('country', name))
  listOf(director).forEach(name => params.append('director', name))
  if (top != null) params.set('top', String(top))
  if (yearRange) {
    params.set('yearStart', String(yearRange.start))
    params.set('yearEnd', String(yearRange.end))
  }
  return `/explore?${params.toString()}`
}
