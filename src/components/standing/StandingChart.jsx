import { useMemo } from 'react'
import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Dot,
} from 'recharts'
import {
  TOOLTIP_BOX_SM, TOOLTIP_TITLE_SM, TOOLTIP_VALUE_SM, TOOLTIP_DETAIL_SM,
} from '../../utils/tooltip'

/**
 * Rank across the eight polls, one point per poll.
 *
 * One chart for all three pages — a film's rank among films, a director's among
 * directors, a country's among countries. It takes rows rather than a subject, so
 * each page supplies its own ranking (see lib/standings.js).
 *
 * Sits under StandingStrip: the strip is the per-poll lookup, the chart is the
 * trend and the positional context. That context is the whole reason both exist —
 * a rank means nothing without the size of the field it was drawn from, and a
 * cell has no room to say so where a band can say it continuously.
 *
 * Carries no heading of its own; the axis format ('#12') names the measure and
 * the section heading frames the block.
 *
 * Rank only, deliberately. Vote counts aren't comparable between polls — the
 * electorate grew from 47 critics to 1,635 — so a rising vote line reads as
 * growing support when it can mean the opposite. A rank/votes toggle was tried
 * and removed: with the depth band in place the rank view answers the positional
 * question properly, and a votes view mostly offered a misleading second reading
 * of the same eight points. The counts live in the strip above.
 *
 * On the director and country pages the section also ignores the poll rail. This
 * is a series OVER the polls, so a single poll isn't an input to it — narrowing
 * to 2022 would leave one point and destroy the only thing it shows.
 *
 * Three encoding decisions, all settled on the film page first:
 *
 * - Reversed LOG axis anchored at #1. The axis used to rescale to each subject's
 *   own range, which drew relative movement but read as absolute standing: a film
 *   hovering around #1,200 filled the plot exactly like Vertigo. Anchoring a
 *   LINEAR axis at #1 fixes that but inverts the problem — against a domain of
 *   [1, 1652] a top-100 film's real movement collapses into a few pixels. Log
 *   escapes the trade because rank is already perceptually logarithmic (#1 to #10
 *   matters far more than #1,200 to #1,210): height always means absolute
 *   standing, while movement stays legible at every depth.
 * - A shaded band marks ranks each poll never reached. Fields differ enormously
 *   between polls — films bottom out at #83 in 1952 and #1,652 in 2022, directors
 *   at #61 and #1,035, countries at #12 and #82 — so a raw rank is no more
 *   comparable across polls than a raw vote count is. The Third Man's #83 in 1952
 *   and Hitchcock's #61 both read as mid-table without the band; both were dead
 *   last. For the leading countries the band is the entire content: the US is #1
 *   and France #2 in all eight polls, so their lines are flat and only the field
 *   growing underneath them says anything.
 * - No connectNulls. A poll the subject drew no votes in is a real absence —
 *   Akerman charts nothing before 1992, Belgium nothing in 1952, 1962 or 1982 —
 *   and bridging it draws a trajectory through polls where they simply weren't
 *   there. Gaps break the line, and a lone appearance renders as an unconnected
 *   dot.
 *
 * The tooltip is the poll year and the figures. It also carried each poll's share
 * of voters and its deepest rank; both were dropped once the depth band landed,
 * since the band shows positional context continuously and in place, where the
 * tooltip only offered it one hover at a time.
 */
export default function StandingChart({
  rows,
  noun = 'film',
  nounPlural = 'films',
  color = '#000000',
}) {
  const data = useMemo(
    () => (rows || []).map(r => ({ ...r, label: `'${String(r.year).slice(2)}` })),
    [rows]
  )

  // The SAME domain for every subject of a kind, so two pages of that kind can be
  // read directly against each other. An earlier pass scoped the floor to the
  // subject's own polls, to keep a 1952-only film off a #1,652 baseline it could
  // never have reached. The depth band makes that unnecessary and is the better
  // answer: rather than hiding the depth the subject couldn't reach, it draws it,
  // so the subject reads as sitting at the edge of what existed instead of
  // floating in blank space.
  const yDomain = useMemo(() => {
    const floors = data.map(d => d.floor).filter(f => f != null)
    return [1, Math.max(10, ...floors)]
  }, [data])

  // Decade strata (#1, #10, #100, #1000) — the natural reading of a log rank axis,
  // and steadier than letting Recharts pick its own. Except where the domain is
  // too shallow to yield enough of them: the country field bottoms out around #82,
  // which would label just #1 and #10, so under two and a half decades the axis
  // steps 1-3-10-30 instead, the standard half-decade log ticks.
  const rankTicks = useMemo(() => {
    const max = yDomain[1]
    const steps = Math.log10(max) < 2.5 ? [1, 3] : [1]
    const ticks = []
    for (let decade = 1; decade <= max; decade *= 10) {
      steps.forEach(s => { if (decade * s <= max) ticks.push(decade * s) })
    }
    return ticks
  }, [yDomain])

  const charted = data.filter(d => d.rank != null)
  const withFloors = data.filter(d => d.floor != null)
  if (!charted.length || !withFloors.length) return null

  // The site's shared tooltip, in its compact size — see utils/tooltip. Rank is
  // the value because rank is what the chart plots; the field it was drawn from
  // and the votes behind it are the detail line.
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <div className={TOOLTIP_BOX_SM}>
        <p className={TOOLTIP_TITLE_SM}>{d.year} Poll</p>
        {d.rank != null ? (
          <>
            <p className={`${TOOLTIP_VALUE_SM} tabular-nums`}>
              #{d.rank.toLocaleString()}
            </p>
            <p className={`${TOOLTIP_DETAIL_SM} tabular-nums`}>
              {/* Field size only where the page knows it. A film page ranks
                  against every film in the poll, a figure the strip's own header
                  already implies; the aggregate pages need it said. */}
              {d.field != null &&
                `of ${d.field.toLocaleString()} ${d.field === 1 ? noun : nounPlural}`}
              {d.field != null && d.votes ? ' · ' : ''}
              {d.votes
                ? `${d.votes.toLocaleString()} ${d.votes === 1 ? 'vote' : 'votes'}`
                : ''}
            </p>
          </>
        ) : (
          <p className={TOOLTIP_DETAIL_SM}>No votes</p>
        )}
      </div>
    )
  }

  // Both ends of the depth range, for the caption. Named from the data rather
  // than hardcoded so the sentence can't drift from what's drawn.
  const shallowest = withFloors.reduce((a, b) => (b.floor < a.floor ? b : a))
  const deepest = withFloors.reduce((a, b) => (b.floor > a.floor ? b : a))

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={false}
          />
          <YAxis
            reversed
            scale="log"
            domain={yDomain}
            ticks={rankTicks}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            width={48}
            allowDecimals={false}
            allowDataOverflow={false}
            tickFormatter={v => `#${v.toLocaleString()}`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#d1d5db' }} />
          {/* Depth band. Declared before the Line so it paints behind it.
              gray-200 on the page's gray-50 background — gray-100 was only ~2% off
              the backdrop and read as nothing. The boundary is dashed and darker
              than the fill so it reads as a threshold rather than a second data
              series competing with the subject's line. */}
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
            stroke={color}
            strokeWidth={2}
            dot={<Dot r={3} fill={color} stroke="#fff" strokeWidth={1.5} />}
            activeDot={{ r: 5, fill: color, stroke: '#fff', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <p className="mt-2 text-xs text-gray-500 italic">
        Shading marks ranks that poll never reached — the field ran{' '}
        {shallowest.floor.toLocaleString()} {nounPlural} deep in {shallowest.year}, and{' '}
        {deepest.floor.toLocaleString()} in {deepest.year}. A point at the edge of the
        shading placed last that year.
      </p>
    </div>
  )
}
