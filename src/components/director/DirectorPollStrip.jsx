import { useMemo } from 'react'
import { POLL_YEARS } from '../../utils/polls'
import { standingByPoll } from './directorStandings'

/**
 * A cell per poll: where the director ranked among all directors that year, with
 * the films they placed beneath it. Greyed when they drew no votes at all.
 *
 * Follows the film page's PollHistoryStrip — same eight-column run, same
 * rank-leads-and-detail-beneath hierarchy — with one change the director case
 * needs: the secondary line leads with FILMS, not votes. On the film page the
 * strip is where vote counts live because the chart beside it is rank-only. Here
 * the number that makes a rank legible is how many films the director landed —
 * Godard is #5 in 2022 off 21 films, Akerman #2 off 3. Votes still follow, since
 * they're what actually set the rank.
 *
 * Standing is by votes; see directorStandings.js for why a per-poll film-count
 * ranking would be nearly all ties.
 */
export default function DirectorPollStrip({ standings, name }) {
  const rows = useMemo(() => standingByPoll(standings, name), [standings, name])
  const byYear = useMemo(() => new Map(rows.map(r => [r.year, r])), [rows])

  if (!rows.some(r => r.rank != null)) return null

  return (
    <div className="grid grid-cols-4 sm:grid-cols-8 border-2 border-black divide-x divide-y sm:divide-y-0 divide-gray-200">
      {POLL_YEARS.map(year => {
        const row = byYear.get(year)
        const appeared = row && row.rank != null
        return (
          <div key={year} className={`p-3 text-center ${appeared ? 'bg-white' : 'bg-gray-50'}`}>
            <div className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
              {year}
            </div>
            <div
              className={`text-xl font-black tabular-nums leading-tight mt-1 ${
                appeared ? 'text-black' : 'text-gray-300'
              }`}
            >
              {appeared ? `#${row.rank.toLocaleString()}` : '—'}
            </div>
            <div className={`text-xs tabular-nums ${appeared ? 'text-gray-600' : 'text-gray-300'}`}>
              {appeared
                ? `${row.films} ${row.films === 1 ? 'film' : 'films'} · ${row.votes.toLocaleString()} ${
                    row.votes === 1 ? 'vote' : 'votes'
                  }`
                : '—'}
            </div>
          </div>
        )
      })}
    </div>
  )
}
