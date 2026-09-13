import { useState, useMemo, useRef, useEffect } from 'react'
import { FilterLabel, ClearButton } from './FilterCard'
import { isFormatTag } from '../../lib/genres'

/**
 * The genre picker: a search box over a grouped, expandable checkbox list, with
 * the selection as removable chips above it. Built as the CountryFilter's
 * sibling — same label row, chips, search box and rows with a count — because
 * they sit next to each other in the rail.
 *
 * ## Two groups, neither selectable
 *
 * GENRE (what kind of film, what it's about) and FORMAT (Short, Silent,
 * Animation, TV…: what the work IS). The split mirrors lib/genres.js. Unlike a
 * continent, a group is not itself a filter — "any format" isn't a question —
 * so its header only expands and collapses. Genre opens expanded; Format starts
 * collapsed, since it's the less common reach.
 *
 * ## Picks narrow
 *
 * A film must carry every selected tag (see filterFilmsByGenres). So each row's
 * count is what you'd get by ADDING that tag to the current picks, and it shrinks
 * as you pick — the list itself shows the narrowing. A row that would leave
 * nothing is disabled rather than hidden.
 *
 * The ORDER doesn't follow those counts. It's fixed by each tag's count before
 * any genre is picked, and the row set is fixed the same way, so ticking a box
 * never reshuffles or removes the rows under your cursor.
 *
 * `films` is the caller's view MINUS the genre filter.
 */
export default function GenreFilter({ films, selected = [], onChange, label = 'Genre' }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState({ Genre: true, Format: false })
  const rootRef = useRef(null)
  const listRef = useRef(null)

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

  // The list opens in flow inside the scrolling filter rail (see FilterCard),
  // pushing the controls below it down; bring it into view when it opens.
  useEffect(() => {
    if (open) listRef.current?.scrollIntoView({ block: 'nearest' })
  }, [open])

  const selectedSet = useMemo(() => new Set(selected), [selected])

  // Base counts (no genre picked) fix the rows and their order; narrowed counts
  // (every current pick plus this tag) are what each row displays.
  const groups = useMemo(() => {
    const base = new Map()
    const narrowed = new Map()
    ;(films || []).forEach(film => {
      const tags = film.genres || []
      const matchesPicks = selected.every(g => tags.includes(g))
      tags.forEach(tag => {
        base.set(tag, (base.get(tag) || 0) + 1)
        if (matchesPicks) narrowed.set(tag, (narrowed.get(tag) || 0) + 1)
      })
    })
    // A picked tag stays listed even if the rest of the view no longer has it.
    selected.forEach(tag => { if (!base.has(tag)) base.set(tag, 0) })

    const rows = [...base.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name]) => ({ name, count: narrowed.get(name) || 0 }))

    return [
      { name: 'Genre', tags: rows.filter(r => !isFormatTag(r.name)) },
      { name: 'Format', tags: rows.filter(r => isFormatTag(r.name)) },
    ].filter(g => g.tags.length > 0)
  }, [films, selected])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return groups
    return groups
      .map(g => ({ ...g, tags: g.tags.filter(t => t.name.toLowerCase().includes(q)) }))
      .filter(g => g.tags.length > 0)
  }, [groups, search])

  // Searching opens every group that still has matches.
  const openGroups = search.trim()
    ? Object.fromEntries(visible.map(g => [g.name, true]))
    : expanded

  const toggle = name => {
    onChange(selectedSet.has(name) ? selected.filter(g => g !== name) : [...selected, name])
    setSearch('')
  }

  return (
    <div ref={rootRef}>
      <div className="flex items-center justify-between mb-2">
        <FilterLabel>{label}</FilterLabel>
        <ClearButton count={selected.length} onClick={() => onChange([])} />
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {selected.map(name => (
            <span
              key={name}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-black text-white text-xs font-medium max-w-full"
            >
              <span className="truncate">{name}</span>
              <button
                onClick={() => toggle(name)}
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
        placeholder={selected.length > 0 ? 'Add more…' : 'Search genres…'}
        className="w-full px-2 py-1.5 border-2 border-black text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black"
      />

      {open && (
        <div ref={listRef} className="bg-white border-2 border-black border-t-0 max-h-56 overflow-y-auto">
          {visible.map(group => {
            const isOpen = openGroups[group.name]
            return (
              <div key={group.name}>
                <button
                  type="button"
                  onClick={() => setExpanded(prev => ({ ...prev, [group.name]: !prev[group.name] }))}
                  aria-expanded={!!isOpen}
                  className="w-full flex items-center gap-1.5 px-2 py-1.5 hover:bg-gray-50 border-b border-gray-100 text-left"
                >
                  <span className="text-xs text-black font-bold flex-shrink-0">{isOpen ? '▼' : '▶'}</span>
                  <span className="text-xs font-bold text-black uppercase tracking-wide flex-1">{group.name}</span>
                  <span className="text-xs text-gray-500 flex-shrink-0">{group.tags.length}</span>
                </button>

                {isOpen && (
                  <div className="bg-gray-50">
                    {group.tags.map(tag => {
                      const checked = selectedSet.has(tag.name)
                      const disabled = !checked && tag.count === 0
                      return (
                        <label
                          key={tag.name}
                          className={`flex items-center gap-1.5 px-5 py-1 text-xs ${
                            disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-gray-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => toggle(tag.name)}
                            className="w-3 h-3"
                          />
                          <span className={`font-medium flex-1 truncate ${disabled ? 'text-gray-400' : 'text-black'}`}>
                            {tag.name}
                          </span>
                          <span className="text-gray-400 flex-shrink-0 tabular-nums">{tag.count.toLocaleString()}</span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          {visible.length === 0 && (
            <div className="px-3 py-4 text-xs text-gray-500 text-center">
              No genre matches “{search}”
            </div>
          )}
        </div>
      )}
    </div>
  )
}
