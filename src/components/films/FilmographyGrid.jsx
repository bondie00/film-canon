import { useState, useMemo, useEffect, useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import GridTile, { withCurrent } from '../search/GridTile'
import { exploreUrl } from '../../lib/exploreUrl'

/**
 * Columns the grid runs at each breakpoint. The row caps below are expressed in
 * ROWS, which is what reads on screen, and converted to a tile count per
 * breakpoint through this — three rows is 6 tiles on a phone and 12 on a wide
 * desktop, and a single fixed count would be three rows on one and six on the
 * other.
 */
const COLUMNS = [
  { cols: 2, show: '' },              // base
  { cols: 3, show: 'hidden sm:block' },
  { cols: 4, show: 'hidden xl:block' },
]
const MAX_COLUMNS = 4

/** Rows shown before the reader asks for more. */
export const PREVIEW_ROWS = 3

/**
 * Rows shown after expanding a COUNTRY. Directors expand to their whole
 * filmography — the largest is 43 films, which is a page you can read. The United
 * States has 1,780, which is not, so the country page opens twelve rows and sends
 * you to /explore for the rest, where paging and cross-filtering already exist.
 */
export const COUNTRY_EXPANDED_ROWS = 12

/**
 * Which breakpoints a tile at `index` is visible at, given a row cap.
 *
 * Tiles past the cap for a given column count are display:none there and visible
 * wider, so every breakpoint shows exactly `rows` rows. Only the widest layout's
 * worth of tiles is ever rendered.
 */
function tileVisibility(index, rows) {
  if (rows == null) return ''
  for (const { cols, show } of COLUMNS) {
    if (index < cols * rows) return show
  }
  return 'hidden'
}

/**
 * Whether the expand/collapse button is needed — and where. With 10 films and a
 * 3-row preview there's more to see at 2 and 3 columns but not at 4, so the
 * button hides itself at exactly the widths where it would do nothing. The same
 * answer governs "Show less": a width where expanding changed nothing is a width
 * with nothing to collapse.
 */
function moreButtonVisibility(total, rows) {
  if (total > 4 * rows) return ''            // more to see at every width
  if (total > 3 * rows) return 'xl:hidden'   // ...except at 4 columns
  if (total > 2 * rows) return 'sm:hidden'   // ...only at 2 columns
  return null                                // fits in the preview everywhere
}

/** Production year as a number; ranges like "1960-1964" resolve to their start. */
const startYear = film => parseInt(String(film.Year ?? ''), 10)

const entryFor = (film, poll) =>
  film.pollHistory?.find(x => x.year === (poll === 'all' ? 'all' : parseInt(poll, 10)))

/**
 * Rank first, then chronological — the canon's own ordering is the more useful
 * opening read. Films with no rank in the active poll sort to the back on votes,
 * which is what the 'all' view is entirely made of (an aggregate rank across
 * polls isn't meaningful, so `all` carries votes only).
 */
export function sortFilms(films, poll, sort) {
  const list = [...films]
  if (sort === 'chrono') {
    return list.sort((a, b) => {
      const ya = startYear(a)
      const yb = startYear(b)
      if (Number.isNaN(ya) && Number.isNaN(yb)) return 0
      if (Number.isNaN(ya)) return 1
      if (Number.isNaN(yb)) return -1
      return ya - yb || (a.FilmTitle || '').localeCompare(b.FilmTitle || '')
    })
  }
  return list.sort((a, b) => {
    const pa = entryFor(a, poll) || {}
    const pb = entryFor(b, poll) || {}
    if (pa.rank != null && pb.rank != null) return pa.rank - pb.rank
    if (pa.rank != null) return -1
    if (pb.rank != null) return 1
    return (pb.votes || 0) - (pa.votes || 0)
  })
}

/**
 * The poster grid a detail page opens with: every film this country or director
 * placed in the selected poll, as tiles that link to the film pages.
 *
 * Opens at three rows and expands on request, so the section is a glance before
 * it's a list and the material below it stays reachable. Where expansion ends
 * differs by subject — see COUNTRY_EXPANDED_ROWS.
 *
 * Replaced the country page's bespoke text-card grid, which showed no poster, no
 * cross-poll rank strip, and — the reason it had to go — didn't link to the film
 * pages at all, on the one section of the site whose entire subject is films.
 */
export default function FilmographyGrid({
  films,
  poll,
  sort = 'rank',
  previewRows = PREVIEW_ROWS,
  expandedRows = null,
  explore,
  emptyMessage = 'No films match the current filters.',
}) {
  const [expanded, setExpanded] = useState(false)
  const containerRef = useRef(null)
  // Set when a collapse needs the viewport pulled back up; consumed once the
  // shorter grid has actually been laid out.
  const restoreScroll = useRef(false)

  // A new poll is a new set of films; fold the section back up rather than
  // leaving it expanded around content the reader didn't ask to see.
  useEffect(() => { setExpanded(false) }, [poll])

  /**
   * Collapsing from a button below twelve rows removes thousands of pixels
   * ABOVE the viewport, so without this the reader is thrown somewhere further
   * down the page — usually past the section entirely. Pull the section heading
   * back into view, but only when it has scrolled off the top: collapsing while
   * the whole section is already visible should not move the page at all.
   */
  useLayoutEffect(() => {
    if (!restoreScroll.current) return
    restoreScroll.current = false
    const el = containerRef.current
    if (el && el.getBoundingClientRect().top < 0) {
      el.scrollIntoView({ block: 'start' })
    }
  }, [expanded])

  const collapse = () => {
    restoreScroll.current = true
    setExpanded(false)
  }

  const sorted = useMemo(() => sortFilms(films, poll, sort), [films, poll, sort])

  const total = films.length
  const activeRows = expanded ? expandedRows : previewRows
  const renderCount = activeRows == null ? total : activeRows * MAX_COLUMNS
  const shown = sorted.slice(0, renderCount)
  const toggleVisibility = moreButtonVisibility(total, previewRows)

  if (!total) {
    return (
      <div className="bg-white border-2 border-black p-10 text-center">
        <p className="font-bold text-black">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div ref={containerRef}>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
        {shown.map((film, i) => (
          <div key={film.key} className={tileVisibility(i, activeRows)}>
            <GridTile film={withCurrent(film, poll)} activePoll={poll} />
          </div>
        ))}
      </div>

      {toggleVisibility != null && (
        <button
          type="button"
          onClick={expanded ? collapse : () => setExpanded(true)}
          aria-expanded={expanded}
          className={`mt-4 block w-full text-center px-4 py-3 bg-white text-black border-2 border-black font-bold text-sm uppercase tracking-wide hover:bg-black hover:text-white transition-colors ${toggleVisibility}`}
        >
          {expanded
            ? 'Show less'
            : `Show more (${total.toLocaleString()} ${total === 1 ? 'film' : 'films'})`}
        </button>
      )}

      {/* Explore takes over where the grid stops. Held back until the grid is
          expanded, so the reader meets one next step at a time. */}
      {explore && (toggleVisibility == null || expanded) && (
        <Link
          to={exploreUrl({ poll, ...explore })}
          className="mt-4 block w-full text-center px-4 py-3 bg-black text-white border-2 border-black font-bold text-sm uppercase tracking-wide hover:bg-gray-900 transition-colors"
        >
          {total > shown.length
            ? `View all ${total.toLocaleString()} films in Explore →`
            : 'Open in Explore →'}
        </Link>
      )}
    </div>
  )
}
