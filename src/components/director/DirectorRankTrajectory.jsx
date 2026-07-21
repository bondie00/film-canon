import { useState, useEffect, useMemo, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Dot } from 'recharts'
import { SERIES_COLORS } from './filmColors'
import { rankIn, votesIn } from './rankTiers'

const POLL_YEARS = [1952, 1962, 1972, 1982, 1992, 2002, 2012, 2022]
const DEFAULT_LINES = 3
const MAX_LINES = SERIES_COLORS.length // 8 — the categorical palette's ceiling

/**
 * Rank across the eight polls, one line per film, with the films chosen by
 * checkbox.
 *
 * Which films are OFFERED follows the poll rail (2022 selected → only films that
 * drew a vote in 2022), but every line still spans all eight polls: the point of
 * the chart is the trajectory, so clipping the x-axis to one poll would leave
 * nothing to see.
 *
 * Colors are assigned per SLOT, claimed on check and released on uncheck, so
 * turning one film off never repaints the films still on screen. Eight is the
 * cap because that is where the categorical palette stops — past it, hues stop
 * being reliably distinguishable, and eight lines is already a busy plot.
 *
 * The y-axis rescales to whatever is currently checked, so a top-heavy default
 * doesn't flatten the long-tail films you add to it.
 */
export default function DirectorRankTrajectory({ films, poll = 'all' }) {
  // Films that drew a vote in the active poll AND were ranked somewhere.
  const candidates = useMemo(() => {
    const list = films.filter(
      f =>
        votesIn(f, poll) > 0 &&
        f.pollHistory.some(p => p.year !== 'all' && p.votes > 0 && p.rank != null)
    )
    return list.sort((a, b) => {
      if (poll !== 'all') {
        const ra = rankIn(a, poll)
        const rb = rankIn(b, poll)
        if (ra != null && rb != null && ra !== rb) return ra - rb
        if (ra != null && rb == null) return -1
        if (ra == null && rb != null) return 1
      }
      return votesIn(b, 'all') - votesIn(a, 'all')
    })
  }, [films, poll])

  // filmKey -> palette slot. Membership IS selection.
  const [slots, setSlots] = useState(() => new Map())

  // Reset to the strongest few whenever the offered set changes.
  useEffect(() => {
    const next = new Map()
    candidates.slice(0, DEFAULT_LINES).forEach((f, i) => next.set(f.key, i))
    setSlots(next)
  }, [candidates])

  const toggle = useCallback(key => {
    setSlots(prev => {
      const next = new Map(prev)
      if (next.has(key)) {
        next.delete(key)
        return next
      }
      const used = new Set(next.values())
      let slot = 0
      while (used.has(slot)) slot++
      if (slot >= MAX_LINES) return prev // at the cap — ignore
      next.set(key, slot)
      return next
    })
  }, [])

  const selected = useMemo(
    () => candidates.filter(f => slots.has(f.key)),
    [candidates, slots]
  )
  const colorOf = useCallback(key => SERIES_COLORS[slots.get(key) ?? 0], [slots])
  const atCap = slots.size >= MAX_LINES

  const data = useMemo(
    () =>
      POLL_YEARS.map(year => {
        const row = { year: `'${String(year).slice(2)}`, yearNum: year }
        selected.forEach(film => {
          const p = film.pollHistory.find(x => x.year === year)
          row[`k${film.key}`] = p && p.votes > 0 && p.rank != null ? p.rank : null
        })
        return row
      }),
    [selected]
  )

  // Scaled to the checked films only, so adding a long-tail film opens the axis
  // up rather than squashing everything against the top.
  const yDomain = useMemo(() => {
    const ranks = []
    selected.forEach(f =>
      f.pollHistory.forEach(p => {
        if (p.year !== 'all' && p.votes > 0 && p.rank != null) ranks.push(p.rank)
      })
    )
    if (!ranks.length) return [1, 100]
    const min = Math.min(...ranks)
    const max = Math.max(...ranks)
    return [Math.max(1, min - 1), Math.ceil(Math.max(max * 1.15, min + 5))]
  }, [selected])

  if (!candidates.length) return null

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const rows = payload.filter(p => p.value != null).sort((a, b) => a.value - b.value)
    if (!rows.length) return null
    const year = payload[0].payload.yearNum
    return (
      <div className="bg-black text-white text-xs px-3 py-2 border border-white/20 max-w-[20rem]">
        <div className="font-bold mb-1">{year} poll</div>
        {rows.map(r => {
          const film = selected.find(f => `k${f.key}` === r.dataKey)
          const votes = film ? votesIn(film, String(year)) : 0
          return (
            <div key={r.dataKey} className="flex items-baseline gap-2">
              <span className="w-2 h-2 flex-shrink-0" style={{ backgroundColor: r.stroke }} />
              <span className="truncate">{film?.FilmTitle}</span>
              <span className="ml-auto flex-shrink-0 tabular-nums">
                #{r.value}
                <span className="text-white/60"> · {votes} {votes === 1 ? 'vote' : 'votes'}</span>
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="bg-white border-2 border-black p-5">
      <div className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2">
        Rank by poll
      </div>

      {selected.length > 0 ? (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="year"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
            />
            <YAxis
              reversed
              domain={yDomain}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              width={48}
              allowDecimals={false}
              tickFormatter={v => `#${v}`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#d1d5db' }} />
            {selected.map(film => {
              const color = colorOf(film.key)
              return (
                <Line
                  key={film.key}
                  type="monotone"
                  dataKey={`k${film.key}`}
                  stroke={color}
                  strokeWidth={2}
                  connectNulls
                  dot={<Dot r={3} fill={color} stroke="#fff" strokeWidth={1.5} />}
                  activeDot={{ r: 5, fill: color, stroke: '#fff', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              )
            })}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[260px] flex items-center justify-center text-sm text-gray-500">
          Tick a film below to plot it.
        </div>
      )}

      {/* Checkbox legend — every film on offer, strongest first */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="flex items-baseline justify-between gap-3 mb-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
            Films
          </span>
          <span className="text-[11px] tabular-nums text-gray-400">
            {slots.size} of {MAX_LINES} lines{atCap ? ' — untick one to add another' : ''}
          </span>
        </div>

        {/* Scroll lives on the wrapper, not the column box: a height-constrained
            multi-column element spills sideways into extra columns instead of
            scrolling. Columns flow down the left, then down the right. */}
        <div className="max-h-56 overflow-y-auto">
        <ul className="columns-1 sm:columns-2 gap-x-6">
          {candidates.map(film => {
            const on = slots.has(film.key)
            const disabled = !on && atCap
            return (
              <li key={film.key} className="break-inside-avoid">
                <label
                  className={`flex items-baseline gap-2 py-0.5 ${
                    disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={disabled}
                    onChange={() => toggle(film.key)}
                    className="accent-black translate-y-0.5 flex-shrink-0"
                  />
                  <span
                    aria-hidden="true"
                    className="w-3 h-3 flex-shrink-0 translate-y-0.5 border"
                    style={{
                      backgroundColor: on ? colorOf(film.key) : 'transparent',
                      borderColor: on ? colorOf(film.key) : '#d1d5db',
                    }}
                  />
                  {/* Title and year only — vote counts are per-poll, so they
                      belong in the tooltip where a poll is in scope. */}
                  <span className="text-xs text-gray-800 min-w-0">
                    <span className="font-bold">{film.FilmTitle}</span>
                    <span className="text-gray-400"> {film.Year}</span>
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
        </div>
      </div>
    </div>
  )
}
