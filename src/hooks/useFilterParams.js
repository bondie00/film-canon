import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * The poll + rank-depth filter state, read from and written to the URL.
 *
 * `?poll=` and `?top=` mean the same thing on every page that has them —
 * /explore, both hubs, both detail pages — which is what makes the handoff
 * between them exact. This hook is that shared reading, so the parsing rules
 * (which polls are valid, what an absent or malformed value falls back to) live
 * in one place instead of once per page.
 *
 * It was extracted when the two detail pages needed URL filters too: the block
 * was already duplicated verbatim across the two hubs, and adding it by hand to
 * the detail pages would have made four copies of the same twenty lines.
 *
 * WRITES ARE `replace`, never `push`. Changing a filter is adjusting the view
 * you're on, not travelling somewhere new — with push, leaving a page you'd
 * filtered meant pressing back once per adjustment to escape it.
 *
 * The returned `filters` object is what the route builders in lib/routes.js
 * take, so carrying the current filters through a link is `countryUrl(name,
 * filters)` rather than each caller assembling a query string.
 */
export const POLL_YEARS = [1952, 1962, 1972, 1982, 1992, 2002, 2012, 2022]
export const VALID_POLLS = ['all', ...POLL_YEARS.map(String)]
export const DEFAULT_POLL = '2022'

export default function useFilterParams({ defaultPoll = DEFAULT_POLL } = {}) {
  const [searchParams, setSearchParams] = useSearchParams()

  const rawPoll = searchParams.get('poll')
  const poll = VALID_POLLS.includes(rawPoll) ? rawPoll : defaultPoll

  // A film COUNT, not a rank — see lib/rankDepth.js. null means "all films".
  // Any positive integer is valid, not just the stops the slider offers, so a
  // hand-written ?top=200 resolves and displays correctly.
  const rawTop = searchParams.get('top')
  const top = rawTop && /^\d+$/.test(rawTop) ? parseInt(rawTop, 10) : null

  const setParam = useCallback((key, value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (value == null) next.delete(key)
      else next.set(key, String(value))
      return next
    }, { replace: true })
  }, [setSearchParams])

  const setPoll = useCallback(value => setParam('poll', value), [setParam])
  const setTop = useCallback(value => setParam('top', value), [setParam])

  const filters = useMemo(() => ({ poll, top }), [poll, top])

  return { poll, setPoll, top, setTop, filters }
}
