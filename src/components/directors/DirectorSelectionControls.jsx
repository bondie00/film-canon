export const TOP_N_OPTIONS = [10, 25, 50]

/**
 * How deep into the ranking to draw.
 *
 * Where the country controls offer continents, these offer depth: a director has
 * no continent, and useDirectorAggregates deliberately refuses to give them one
 * (98 directors in the 2022 poll have films on more than one continent, and 48
 * more have an outright tie for their commonest country).
 *
 * When the rail pins an explicit set of directors these go unlit, because the
 * pinned set replaces the top N rather than combining with it. Pressing one is
 * the way back: it clears the pin and returns to a ranking. Nothing here
 * announces the pin — the rail shows the chips and carries the Clear, and
 * repeating it on the chart said the same thing twice.
 */
export function DirectorQuickFilters({ value, onChange, pinnedCount = 0 }) {
  const pinned = pinnedCount > 0

  return (
    <div className="flex flex-wrap items-center gap-2">
      {TOP_N_OPTIONS.map(n => (
        <div key={n} className="bg-white border-2 border-black p-1 flex-shrink-0">
          <button
            onClick={() => onChange(n)}
            className={`py-2 px-3 text-sm font-bold uppercase tracking-wide transition-all border-2 border-black ${
              !pinned && value === n
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-black hover:text-white'
            }`}
          >
            Top {n}
          </button>
        </div>
      ))}
    </div>
  )
}

/**
 * Which quantity orders the ranking.
 *
 * This was the page-level Metric toggle in the filter rail, and it is labelled
 * "Sort by" now because that is all it was ever doing here: the chart's bar
 * length is a film count by construction and its color is a rank tier, so unlike
 * the Countries hub there is no encoding for a metric switch to change.
 *
 * Lighter than the Top-N buttons beside it on purpose. Those change WHAT you're
 * looking at; this only changes the order of what's already there, and giving
 * both the same weight made the heading read as six equal choices.
 */
export function DirectorSortToggle({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Sort by</span>
      <div className="flex border-2 border-black">
        {[['votes', 'Votes'], ['films', 'Films']].map(([optValue, label]) => (
          <button
            key={optValue}
            type="button"
            onClick={() => onChange(optValue)}
            aria-pressed={value === optValue}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
              value === optValue ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
