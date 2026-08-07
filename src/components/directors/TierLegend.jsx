import { TIER_COLORS, tierLabels } from '../director/rankTiers'

/**
 * The rank ramp, labelled with the poll's own snapped cutoffs.
 *
 * Tier boundaries are percentiles of each poll's field, not fixed rank numbers
 * (see rankTiers.js), so 2022 reads Top 40 / 200 / 500 / 1000 while 1952 reads
 * Top 2 / 10 / 25 / 50. The legend therefore has to be drawn from the active
 * cuts — hardcoding it would be wrong in seven polls out of eight.
 */
export default function TierLegend({ cuts, className = '' }) {
  const labels = tierLabels(cuts)
  if (!labels.length) return null

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${className}`}>
      <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Film rank</span>
      {labels.map((label, i) => (
        <span key={label} className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 border border-gray-300 flex-shrink-0"
            style={{ backgroundColor: TIER_COLORS[i] }}
          />
          <span className="text-[10px] font-bold tabular-nums text-gray-600">{label}</span>
        </span>
      ))}
    </div>
  )
}
