export const POLL_YEARS = [1952, 1962, 1972, 1982, 1992, 2002, 2012, 2022]
export const POLL_OPTIONS = ['all', ...POLL_YEARS]

const COLUMN_CLASS = {
  3: 'grid-cols-3',
  9: 'grid-cols-5 sm:grid-cols-9',
}

/**
 * The poll picker, as a grid of year buttons. Used in the filter rail on the hub
 * pages (3 columns) and as a wide strip at the head of a section on the detail
 * pages (9 columns).
 *
 * Pass `counts` on a page scoped to one subject: polls that subject missed render
 * disabled rather than hidden, so the gaps in a country's or a director's run are
 * visible in the control itself.
 */
export default function PollGrid({ value, onChange, counts = null, columns = 3, emptyLabel }) {
  return (
    <div className={`grid ${COLUMN_CLASS[columns] || COLUMN_CLASS[3]} gap-1.5`}>
      {POLL_OPTIONS.map(opt => {
        const key = String(opt)
        const active = key === String(value)
        const count = counts ? counts[opt] ?? 0 : null
        const empty = counts != null && count === 0

        return (
          <button
            key={key}
            type="button"
            disabled={empty}
            onClick={() => onChange(key)}
            title={
              counts == null
                ? undefined
                : empty
                  ? emptyLabel?.(key) ?? `No films in the ${key} poll`
                  : `${count.toLocaleString()} ${count === 1 ? 'film' : 'films'}`
            }
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
  )
}
