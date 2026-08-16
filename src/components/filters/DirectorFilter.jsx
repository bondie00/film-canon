import { useState, useMemo, useRef, useEffect } from 'react'

const VISIBLE_ROWS = 120

/**
 * The director picker: a checkbox list in ranking order, searchable.
 *
 * Deliberately the CountryFilter's sibling — same chips, same search box, same
 * checkbox rows with a count on the right — because they sit in the same rail
 * and pick the same kind of thing. It replaced a SearchSelect that showed
 * nothing until you typed, and before that a search-and-add bar under the chart.
 *
 * Two things could NOT be copied from the country picker, both for the same
 * reason: there are 110 countries and 2,464 directors.
 *
 * - NO GROUPING. Countries group by continent. Directors have no equivalent, and
 *   useDirectorAggregates refuses on principle to give them a nationality (98
 *   directors in the 2022 poll have films on more than one continent; 48 more
 *   have an outright tie for their commonest country).
 * - NO BROWSING THE WHOLE LIST. You can scroll 110 countries; 2,071 is not a
 *   list anyone reads to the end. So the list opens in RANKING ORDER, deepest
 *   cut first, and is capped — you see the directors worth seeing immediately,
 *   and search is how you reach the tail.
 *
 * ## Why the rows are pre-ticked before you've chosen anything
 *
 * The chart defaults to a Top N nobody selected by name. Showing that list here,
 * ticked, is what makes the control honest: it answers "what is on the chart
 * right now", which is the question the old bar under the chart answered and the
 * empty search box did not.
 *
 * Ticking or unticking then MATERIALIZES that implicit set into a real selection
 * (the caller writes it to `?director=`), so "the top ten plus Bergman" is one
 * click rather than eleven. Same rule as the continent token in lib/geo.js: keep
 * the compact form while it is true, expand it the moment it stops being.
 */
export default function DirectorFilter({
  rows,
  checked = [],
  onToggle,
  onClear,
  pinned = false,
  label = 'Director',
}) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = e => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const checkedSet = useMemo(() => new Set(checked), [checked])

  // Accent-insensitive, so "bunuel" finds Buñuel and "godard" finds Jean-Luc.
  const fold = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

  const visible = useMemo(() => {
    const q = fold(search.trim())
    const pool = q ? (rows || []).filter(r => fold(r.name).includes(q)) : rows || []
    return pool.slice(0, VISIBLE_ROWS)
  }, [rows, search])

  const hiddenCount = Math.max(0, (rows?.length || 0) - visible.length)

  return (
    <div className="relative" ref={rootRef}>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold text-black uppercase tracking-wide">{label}</label>
        {pinned && (
          <button
            onClick={onClear}
            className="text-xs font-bold text-red-600 hover:text-red-800 uppercase tracking-wide"
          >
            Clear ({checked.length})
          </button>
        )}
      </div>

      {/* Chips only once the selection is REAL. While it's still the chart's own
          Top N, ten chips would look like ten decisions you'd made — and the
          ticked rows in the dropdown already say what's charted, so no caption
          has to. */}
      {pinned && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {checked.map(name => (
            <span
              key={name}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-black text-white text-xs font-medium max-w-full"
            >
              <span className="truncate">{name}</span>
              <button
                onClick={() => onToggle(name)}
                aria-label={`Remove ${name}`}
                className="flex-shrink-0 text-white/60 hover:text-white font-bold"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={pinned ? 'Add more…' : 'Search directors…'}
        className="w-full px-2 py-1.5 border-2 border-black text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black"
      />

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 bg-white border-2 border-black shadow-[0_8px_24px_rgba(0,0,0,0.25)] max-h-56 overflow-y-auto">
          {visible.map(row => (
            <label
              key={row.name}
              className="flex items-center gap-1.5 px-2 py-1 cursor-pointer hover:bg-gray-100 text-xs border-b border-gray-100 last:border-b-0"
            >
              <input
                type="checkbox"
                checked={checkedSet.has(row.name)}
                onChange={() => onToggle(row.name)}
                className="w-3 h-3 flex-shrink-0"
              />
              <span className="text-black font-medium flex-1 truncate">{row.name}</span>
              <span className="text-gray-400 flex-shrink-0 tabular-nums">
                {row.films}f · {row.votes.toLocaleString()}v
              </span>
            </label>
          ))}

          {visible.length === 0 && (
            <div className="px-3 py-4 text-xs text-gray-500 text-center">
              No director matches “{search}”
            </div>
          )}

          {/* Never silently truncate — say the tail is there and how to reach it. */}
          {hiddenCount > 0 && (
            <div className="px-2 py-1.5 text-[11px] text-gray-500 bg-gray-50 border-t border-gray-200 text-center">
              {hiddenCount.toLocaleString()} more — search by name
            </div>
          )}
        </div>
      )}
    </div>
  )
}
