import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSearchIndex } from '../../hooks/useSearchIndex'

const GROUP_LABELS = {
  film: 'Films',
  director: 'Directors',
  voter: 'Voters',
  country: 'Countries',
  poll: 'Polls',
}

// Turn the grouped search result into a flat, ordered list of navigable rows.
// Order = Films, Directors, Voters, Countries, Polls — the two kinds of people
// sit together. Each row carries its destination.
function flatten(results) {
  if (!results) return []
  const rows = []
  results.films.forEach(f =>
    rows.push({ type: 'film', label: f.title, sub: [f.year, f.director].filter(Boolean).join(' · '), to: `/film/${f.key}` })
  )
  results.directors.forEach(d =>
    rows.push({ type: 'director', label: d, sub: 'Director', to: `/director/${encodeURIComponent(d)}` })
  )
  results.voters?.forEach(v =>
    rows.push({ type: 'voter', label: v.name, sub: 'Voter', to: `/voter/${v.slug}` })
  )
  results.countries.forEach(c =>
    rows.push({ type: 'country', label: c, sub: 'Country', to: `/countries/${encodeURIComponent(c)}` })
  )
  results.polls.forEach(p =>
    rows.push({ type: 'poll', label: `${p} poll`, sub: 'Poll year', to: `/explore?poll=${p}` })
  )
  return rows
}

export default function GlobalSearch({ variant = 'nav', className = '' }) {
  const navigate = useNavigate()
  const { ready, activate, search } = useSearchIndex()

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const containerRef = useRef(null)

  const isHero = variant === 'hero'

  // Re-run search whenever the query changes or the index finishes loading.
  const rows = useMemo(() => flatten(search(query)), [query, search, ready])

  // Reset the highlighted row when the result set changes.
  useEffect(() => { setActive(0) }, [query])

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    const onClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const go = useCallback((row) => {
    if (!row) return
    setOpen(false)
    setQuery('')
    navigate(row.to)
  }, [navigate])

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive(a => Math.min(a + 1, rows.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(a => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      go(rows[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const showDropdown = open && query.trim().length > 0

  return (
    <div ref={containerRef} className={`relative ${isHero ? 'w-full max-w-2xl' : 'w-full max-w-xs'} ${className}`}>
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => { activate(); setOpen(true) }}
        onKeyDown={onKeyDown}
        placeholder={isHero ? 'Search films, directors, countries…' : 'Search films, directors…'}
        aria-label="Search the canon"
        className={`w-full border-2 border-black bg-white text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black ${
          isHero ? 'px-5 py-4 text-lg' : 'px-3 py-1.5 text-sm'
        }`}
      />

      {showDropdown && (
        <div
          className={`absolute left-0 right-0 z-50 mt-1 bg-white border-2 border-black shadow-[0_8px_24px_rgba(0,0,0,0.25)] overflow-y-auto ${
            isHero ? 'max-h-96' : 'max-h-80'
          }`}
        >
          {rows.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              {ready ? 'No matches' : 'Loading…'}
            </div>
          ) : (
            rows.map((row, i) => {
              const prev = rows[i - 1]
              const showHeader = !prev || prev.type !== row.type
              return (
                <div key={`${row.type}-${row.to}`}>
                  {showHeader && (
                    <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-gray-50 border-b border-gray-100">
                      {GROUP_LABELS[row.type]}
                    </div>
                  )}
                  <button
                    onMouseDown={(e) => { e.preventDefault(); go(row) }}
                    onMouseEnter={() => setActive(i)}
                    className={`w-full text-left px-4 py-2 flex items-baseline justify-between gap-3 ${
                      i === active ? 'bg-black text-white' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-bold text-sm truncate">{row.label}</span>
                    <span className={`text-xs flex-shrink-0 ${i === active ? 'text-gray-300' : 'text-gray-500'}`}>
                      {row.sub}
                    </span>
                  </button>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
