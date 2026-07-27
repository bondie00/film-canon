import { useMemo } from 'react'
import { buildStops, resolveTarget, stopIndexFor } from '../lib/rankDepth'

// Native range thumb width, used to inset the tick marks so they line up with the
// thumb's travel rather than the full track width.
const THUMB_WIDTH = 16

/**
 * The shared rank-depth control. Lives in the filter pane on every page that has
 * one, reads and writes a single film-count target, and always shows how many films
 * that target actually resolves to in the active poll — which is the only way the
 * user can tell that Top 1000 in 1952 is the same 199 films as All.
 *
 * Stops are poll-aware: redundant ones are pruned upstream in buildStops, so the
 * slider is shorter in the early polls than in 2022. The target itself is never
 * rewritten when the poll changes, so switching 2022 -> 1952 -> 2022 preserves it.
 *
 * The UI only offers the stops, but any target is valid — a ?top=200 link resolves
 * and displays correctly, landing the handle on the nearest stop.
 *
 * `dense` matches the compact Explore sidebar; the default suits the roomier
 * Countries filter pane.
 */
export default function RankDepthFilter({ index, target, onChange, dense = false }) {
  const stops = useMemo(() => buildStops(index), [index])
  const { filmCount, minVotes } = useMemo(() => resolveTarget(index, target), [index, target])
  const sliderIndex = stopIndexFor(stops, filmCount)

  const labelSize = dense ? 'text-xs' : 'text-sm'
  const hasData = index.total > 0
  // A hand-written ?top= larger than the poll is the whole poll — read it as All
  // rather than "Top 3,816 films · to #1652".
  const isAll = target == null || filmCount >= index.total

  return (
    <div>
      {/* Label and value stack rather than sharing a line — side by side they wrap in
          the narrow Countries sidebar, and stacking matches its sibling filters. */}
      <div className="mb-1.5">
        <label className={`block ${labelSize} font-semibold text-black uppercase tracking-wide`}>
          Rank Depth
        </label>
        <div className="text-xs font-bold text-black tabular-nums whitespace-nowrap overflow-hidden text-ellipsis">
          {isAll
            ? `All ${filmCount.toLocaleString()} films`
            : `Top ${filmCount.toLocaleString()} ${filmCount === 1 ? 'film' : 'films'}`}
          {!isAll && minVotes != null && (
            // The vote floor, not the rank — it's what actually causes the cutoff to
            // land here, and in the small polls it's the whole explanation for the
            // jumps (1972 goes 4+ votes -> 3+ -> 2+ -> everything).
            <span className="text-gray-500 font-medium">
              {' · '}{minVotes.toLocaleString()}+ {minVotes === 1 ? 'vote' : 'votes'}
            </span>
          )}
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={Math.max(0, stops.length - 1)}
        step={1}
        value={sliderIndex}
        disabled={!hasData}
        onChange={(e) => onChange(stops[Number(e.target.value)]?.value ?? null)}
        aria-label="Rank depth"
        className="block w-full accent-black cursor-pointer disabled:cursor-not-allowed"
      />

      {/* Tick per reachable stop, so the discrete positions are visible before you
          drag. The thumb's centre travels only between half-a-thumb from each end,
          so ticks are inset by the same amount to line up with where it lands. */}
      <div className="relative h-1.5" aria-hidden="true">
        {stops.map((stop, i) => {
          const pct = stops.length > 1 ? (i / (stops.length - 1)) * 100 : 0
          const isActive = i === sliderIndex
          return (
            <span
              key={stop.value ?? 'all'}
              className={`absolute top-0 w-px ${isActive ? 'h-1.5 bg-black' : 'h-1 bg-gray-300'}`}
              style={{ left: `calc(${pct}% + ${(0.5 - pct / 100) * THUMB_WIDTH}px)` }}
            />
          )
        })}
      </div>

      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wide text-gray-400">
        <span>{stops[0]?.value != null ? `Top ${stops[0].value}` : 'All'}</span>
        <span>All</span>
      </div>
    </div>
  )
}
