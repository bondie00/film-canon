import { useMemo } from 'react'
import { POLL_YEARS } from '../../utils/polls'

/**
 * A cell per poll: where the subject ranked that year, with the detail beneath
 * it. Greyed when it drew no votes at all.
 *
 * One strip for all three pages — a film's rank among films, a director's among
 * directors, a country's among countries. It takes rows rather than a subject,
 * so each page supplies its own ranking (see lib/standings.js).
 *
 * Rank leads and the detail sits under it in smaller grey type. That hierarchy is
 * the house metric rule (see CLAUDE.md) — votes are a secondary detail — and it
 * earns its keep because the chart below is rank-only: the strip is where the
 * counts live, as a per-poll lookup rather than a trend.
 *
 * Two other shapes were tried and rejected. Giving both figures equal weight left
 * two big numerals stacked in a small box with nothing saying which was which;
 * splitting each cell into labelled halves fixed that but broke the horizontal
 * run. A transposed two-row table fixed the scanning, then became redundant once
 * the chart took over the rank trajectory — and scanning votes across polls was
 * never meaningful anyway, given the electorate grew 35x.
 *
 * Eight columns also put each cell directly above its point on the chart.
 *
 * The secondary line leads with FILMS where a row carries a film count, which is
 * the aggregate case: the number that makes a director's or country's rank
 * legible is how many films it landed — Godard is #5 in 2022 off 21 films,
 * Akerman #2 off 3. Votes still follow, since they're what set the rank. A film's
 * own row has no such count and shows votes alone.
 */
export default function StandingStrip({ rows }) {
  const byYear = useMemo(() => new Map((rows || []).map(r => [r.year, r])), [rows])

  if (!rows?.some(r => r.rank != null)) return null

  return (
    <div className="grid grid-cols-4 sm:grid-cols-8 border-2 border-black divide-x divide-y sm:divide-y-0 divide-gray-200 mb-6">
      {POLL_YEARS.map(year => {
        const row = byYear.get(year)
        const appeared = row && row.rank != null
        const votes = row?.votes || 0
        const detail = !appeared
          ? '—'
          : `${row.films != null ? `${row.films.toLocaleString()} ${row.films === 1 ? 'film' : 'films'} · ` : ''}${votes.toLocaleString()} ${votes === 1 ? 'vote' : 'votes'}`
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
              {detail}
            </div>
          </div>
        )
      })}
    </div>
  )
}
