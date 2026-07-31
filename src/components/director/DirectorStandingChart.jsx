import { useMemo } from 'react'
import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Dot,
} from 'recharts'
import { standingByPoll } from './directorStandings'

/**
 * The director's rank among all directors, one point per poll.
 *
 * Sits under DirectorPollStrip in the "Among all directors" section, the pairing
 * the film page uses for the same eight numbers (PollHistoryStrip above,
 * PollTrendChart below): the strip is the per-poll lookup, the chart is the trend
 * and the positional context. That context is the whole reason both exist here —
 * a rank means nothing without the size of the field it was drawn from, and a
 * cell has no room to say so where a band can say it continuously.
 *
 * Carries no heading of its own; the axis format ('#12') names the measure and
 * the section heading frames the block. Same reason the film page's chart has
 * none.
 *
 * The section ignores the poll rail. This is a series OVER the polls, so a single
 * poll isn't an input to it — narrowing to 2022 would leave one point and destroy
 * the only thing it shows.
 *
 * Encoding follows the film page's rank chart, which faced the same problem and
 * settled it:
 *
 * - Reversed LOG axis anchored at #1. A linear axis against a domain reaching
 *   #1,035 collapses all movement inside the top 50 into a few pixels, while an
 *   axis fitted to the director's own range makes everyone look like Hitchcock.
 *   Rank is perceptually logarithmic anyway, so height reads as absolute
 *   standing while movement stays legible at every depth.
 * - A shaded band marks ranks each poll never reached. Fields differ by 17x
 *   (1952 bottoms out at #61, 2022 runs to #1,035), so a raw rank is no more
 *   comparable across polls than a raw vote count is: Hitchcock's #61 in 1952
 *   was dead last, and reads as mid-table without the band.
 * - No connectNulls. A poll a director drew no votes in is a real absence —
 *   Akerman charts nothing before 1992 — and bridging it draws a trajectory
 *   through polls where they simply weren't there.
 *
 * Votes, not film count: see directorStandings.js for why a per-poll count
 * ranking is nearly all ties.
 */
export default function DirectorStandingChart({ standings, name }) {
  const data = useMemo(() => {
    const rows = standingByPoll(standings, name)
    return rows.map(r => ({
      ...r,
      label: `'${String(r.year).slice(2)}`,
    }))
  }, [standings, name])

  // One domain for every director, so two director pages can be read against
  // each other — the band explains any depth a given poll couldn't reach.
  const yDomain = useMemo(() => {
    const floors = data.map(d => d.floor).filter(f => f != null)
    return [1, Math.max(10, ...floors)]
  }, [data])

  const rankTicks = useMemo(() => {
    const ticks = []
    for (let t = 1; t <= yDomain[1]; t *= 10) ticks.push(t)
    return ticks
  }, [yDomain])

  const charted = data.filter(d => d.rank != null)
  if (!charted.length) return null

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <div className="bg-black text-white text-xs px-3 py-2 border border-white/20">
        <div className="font-bold mb-0.5">{d.year} poll</div>
        {d.rank != null ? (
          <div className="tabular-nums">
            #{d.rank.toLocaleString()} of {d.field.toLocaleString()} directors
            <span className="text-white/60">
              {' · '}{d.votes.toLocaleString()} {d.votes === 1 ? 'vote' : 'votes'}
            </span>
          </div>
        ) : (
          <div className="text-white/60">No votes</div>
        )}
      </div>
    )
  }

  // Both ends of the depth range, for the caption. Named from the data rather
  // than hardcoded so the sentence can't drift from what's drawn.
  const withFloors = data.filter(d => d.floor != null)
  const shallowest = withFloors.reduce((a, b) => (b.floor < a.floor ? b : a))
  const deepest = withFloors.reduce((a, b) => (b.floor > a.floor ? b : a))

  return (
    <div className="mt-4">
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={false}
          />
          <YAxis
            reversed
            scale="log"
            domain={yDomain}
            ticks={rankTicks}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            width={44}
            allowDecimals={false}
            allowDataOverflow={false}
            tickFormatter={v => `#${v.toLocaleString()}`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#d1d5db' }} />
          {/* Declared before the Line so it paints behind it. */}
          <Area
            type="monotone"
            dataKey="floor"
            baseValue={yDomain[1]}
            fill="#e5e7eb"
            stroke="#9ca3af"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            activeDot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="rank"
            stroke="#000000"
            strokeWidth={2}
            dot={<Dot r={3} fill="#000" stroke="#fff" strokeWidth={1.5} />}
            activeDot={{ r: 5, fill: '#000', stroke: '#fff', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <p className="mt-2 text-xs text-gray-500 italic">
        Shading marks ranks that poll never reached — the field ran{' '}
        {shallowest.floor.toLocaleString()} directors deep in {shallowest.year}, and{' '}
        {deepest.floor.toLocaleString()} in {deepest.year}. A point at the edge of the
        shading placed last that year.
      </p>
    </div>
  )
}
