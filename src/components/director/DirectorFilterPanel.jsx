const POLL_YEARS = [1952, 1962, 1972, 1982, 1992, 2002, 2012, 2022]

/**
 * Sticky control rail for the director page.
 *
 * A variation on the /explore FilterPanel — same shell (border-4, sticky top-8)
 * and same section language — but with the poll selector integrated as a button
 * grid rather than living in a separate full-width strip. Explore keeps its
 * prominent top timeline; here the poll has to stay reachable while you're
 * scrolled down at the decade chart, which is what the rail buys.
 *
 * Only controls that drive the WHOLE page belong here. Sort order lives on the
 * filmography itself, since it reorders that grid and nothing else.
 *
 * Polls the director missed are rendered disabled rather than hidden, so the
 * gaps in a career are visible in the control itself.
 */
export default function DirectorFilterPanel({ poll, onPollChange, counts, showing }) {
  const options = ['all', ...POLL_YEARS]

  return (
    <div className="bg-white border-4 border-black p-4 lg:sticky lg:top-8">
      <div className="flex items-center justify-between mb-3 pb-3 border-b-2 border-gray-300">
        <h2 className="text-xl font-black text-black uppercase tracking-wider">Filters</h2>
      </div>

      {/* Poll */}
      <div>
        <label className="block text-xs font-semibold text-black mb-1.5 uppercase tracking-wide">
          Poll
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {options.map(opt => {
            const value = String(opt)
            const active = value === String(poll)
            const count = counts[opt] ?? 0
            const empty = count === 0
            return (
              <button
                key={value}
                type="button"
                disabled={empty}
                onClick={() => onPollChange(value)}
                title={empty ? `No films in the ${value} poll` : `${count} ${count === 1 ? 'film' : 'films'}`}
                className={`py-2 text-sm font-black border-2 transition-colors ${
                  empty
                    ? 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed'
                    : active
                      ? 'border-black bg-black text-white'
                      : 'border-black bg-white text-black hover:bg-black hover:text-white'
                }`}
              >
                {opt === 'all' ? 'All' : opt}
              </button>
            )
          })}
        </div>
        <div className="mt-2 text-xs text-gray-500">
          <span className="font-bold text-black tabular-nums">{showing}</span>{' '}
          {showing === 1 ? 'film' : 'films'}
          {poll === 'all' ? ' across all polls' : ` in the ${poll} poll`}
        </div>
      </div>
    </div>
  )
}
