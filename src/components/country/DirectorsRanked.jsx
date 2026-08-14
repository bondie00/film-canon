import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { tallyDirectors } from './countryDirectors'
import Pagination from '../search/Pagination'

// The section is one page tall, always. Deep enough to be worth turning to,
// shallow enough that the country with 762 directors takes exactly as much room
// as the one with 22.
const PAGE_ROWS = 20
const NAME_WIDTH = 190

/**
 * The country's directors, ranked, one bar each.
 *
 * Replaced a circle pack, for three reasons that were all structural rather than
 * cosmetic:
 *
 * - NAMES. In a pack, a circle's area is its value, so the smallest values get
 *   the least room for the longest thing they have to say. Most circles held a
 *   truncated fragment or nothing, and the fix — labels floated outside with
 *   leader lines — is a lot of machinery to recover what a bar gives away for
 *   free by putting the name in a gutter.
 * - LINKS. The country page listed 30 directors with no way to reach any of them.
 *   A name in a gutter is an ordinary link; a 9px circle is not a click target.
 * - REDUNDANCY. The pack shipped with a top-ten list underneath it, because the
 *   pack alone couldn't be read. These bars ARE that list, so the duplicate went.
 *
 * Dominance still reads instantly, in fact better: Bergman's bar running nine
 * times the length of the next is a plainer statement than a big circle among
 * small ones, because length is judged far more accurately than area.
 *
 * Bar length is VOTES, matching the standing chart and the treemap it replaces —
 * within one country a film count is mostly ties down the tail. The film count
 * rides along as secondary text, since it's what explains a total.
 *
 * Follows the poll rail and the rank-depth filter, both already applied to the
 * `films` it's handed.
 *
 * PAGINATED FROM THE OUTSET, 20 at a time. Two earlier shapes failed. Expanding
 * the whole list in place is untenable at the top of the field — the United
 * States has 762 directors in the 2022 poll, about twenty thousand pixels of
 * them. A fixed cap can't replace it either, because concentration varies far
 * too much for one number to serve: the top twenty are 98% of Belgium's votes and
 * 41% of America's. And handing off to the directors hub arrives somewhere that
 * structurally cannot deliver, since that chart tops out at its Top 50 filter.
 *
 * Paging solves all three at once — the whole ranking stays reachable and the
 * section is the same height on every country page. No preview-then-expand step,
 * because with 20 rows there's nothing to protect the reader from. Reuses
 * /explore's Pagination, so the control is one they've already met.
 *
 * The hub link stays, demoted to what it actually offers: the ranked chart with
 * its own controls, scoped to this country.
 */
export default function DirectorsRanked({
  films, selectedPoll, continentColor, country, topTarget = null,
}) {
  const { ranked } = useMemo(
    // The cutoff is already baked into `films` by the page, so none is applied
    // again here.
    () => tallyDirectors(films, selectedPoll, null),
    [films, selectedPoll]
  )

  const [page, setPage] = useState(1)

  // Changing the poll or the depth rebuilds the ranking underneath the pager, so
  // page 14 of the old list would silently become page 14 of a different one —
  // and at a tighter depth may not exist at all.
  useEffect(() => { setPage(1) }, [films, selectedPoll])

  const totalPages = Math.max(1, Math.ceil(ranked.length / PAGE_ROWS))
  const clampedPage = Math.min(page, totalPages)
  // Rank numbers count from the top of the whole ranking, not the top of the
  // page — #241 on page 13, not #1 again.
  const firstIndex = (clampedPage - 1) * PAGE_ROWS
  const shown = ranked.slice(firstIndex, firstIndex + PAGE_ROWS)

  if (!ranked.length) {
    return (
      <p className="text-sm text-gray-500 py-6">
        No directors match the current filters.
      </p>
    )
  }

  // Bars stay scaled to the LEADER of the whole ranking, never to the top of the
  // current page. Rescaling per page would give page 20's one-vote directors
  // full-length bars and make the tail look like the summit.
  const max = ranked[0].votes

  // Carries the country, poll and depth through, so the hub opens on the same
  // slice this section is showing rather than resetting to its own defaults.
  const params = new URLSearchParams({ country, poll: String(selectedPoll) })
  if (topTarget != null) params.set('top', String(topTarget))
  const chartHref = `/directors?${params.toString()}`

  return (
    <div>
      <ul className="divide-y divide-gray-100 border-y border-gray-200">
        {shown.map((d, i) => {
          return (
            <li key={d.name} className="flex items-center gap-3 py-1.5 group">
              <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-gray-400">
                {firstIndex + i + 1}
              </span>
              <Link
                to={`/director/${encodeURIComponent(d.name)}`}
                title={d.name}
                className="shrink-0 text-xs font-bold text-black truncate hover:underline"
                style={{ width: NAME_WIDTH }}
              >
                {d.name}
              </Link>
              <span className="flex-1 min-w-[60px] h-[18px] bg-gray-50 border border-gray-200">
                <span
                  className="block h-full border-r border-black/20"
                  style={{
                    width: `${Math.max((d.votes / max) * 100, 1.5)}%`,
                    backgroundColor: continentColor,
                  }}
                />
              </span>
              <span className="w-[132px] shrink-0 text-[11px] tabular-nums text-gray-600 text-right">
                <span className="font-bold text-black">{d.votes.toLocaleString()}</span>
                {d.votes === 1 ? ' vote · ' : ' votes · '}
                {d.films} {d.films === 1 ? 'film' : 'films'}
              </span>
            </li>
          )
        })}
      </ul>

      {totalPages > 1 && (
        <div className="mt-4">
          <Pagination
            currentPage={clampedPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
        <span className="text-xs text-gray-500 tabular-nums">
          {(firstIndex + 1).toLocaleString()}–
          {(firstIndex + shown.length).toLocaleString()} of{' '}
          {ranked.length.toLocaleString()}{' '}
          {ranked.length === 1 ? 'director' : 'directors'}
        </span>

        {/* Not the tail's home — the pager is. This is the ranked CHART, with the
            hub's own poll, depth and metric controls. */}
        <Link
          to={chartHref}
          className="text-xs font-medium text-gray-600 underline decoration-gray-300 hover:decoration-black hover:text-black"
        >
          See them charted →
        </Link>
      </div>
    </div>
  )
}
