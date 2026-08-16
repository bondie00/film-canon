import { useState, useMemo, useRef, useEffect } from 'react'
import { buildContinentIndex } from '../../lib/geo'

const continentColors = {
  'Europe': '#3b82f6',
  'Asia': '#10b981',
  'North America': '#8b5cf6',
  'South America': '#f59e0b',
  'Africa': '#ef4444',
  'Oceania': '#ec4899',
}

const uniq = list => [...new Set(list)]

/**
 * The country picker: a search box over a continent-grouped, expandable list,
 * with the current selection shown as removable chips above it.
 *
 * Shared by /explore and the Directors hub. It was /explore's alone, written
 * inline in FilterPanel; the Directors hub needed the same control and the
 * alternative was a second copy of 130 lines of dropdown behaviour.
 *
 * ## Continents are tokens, not shorthand for their countries
 *
 * Ticking a continent used to add all of its countries individually — Europe
 * meant 40 chips here and forty names spelled out in /explore's result summary,
 * which is what made that page too wide. A continent is now one chip. See
 * lib/geo.js for the model, and for why unticking a country inside a selected
 * continent expands that continent back into explicit countries.
 *
 * ## Counts
 *
 * `films` is whatever the caller currently has in view MINUS its own country
 * filter — otherwise every count would read as the number already selected.
 * Countries with no films in view are dropped, so the list narrows as the poll
 * and depth tighten rather than offering choices that lead nowhere.
 */
export default function CountryFilter({
  countriesData,
  films,
  countries = [],
  continents = [],
  onChange,
  label = 'Country',
  placeholder = 'Search countries…',
}) {
  const [expanded, setExpanded] = useState({})
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = e => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false)
        setSearch('')
        setExpanded({})
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  // Per-country film counts from the caller's current view, grouped by continent.
  const grouped = useMemo(() => {
    if (!countriesData || !films) return []

    const counts = new Map()
    films.forEach(film => {
      (film.countries || []).forEach(c => counts.set(c, (counts.get(c) || 0) + 1))
    })

    const byContinent = new Map()
    Object.entries(countriesData).forEach(([name, info]) => {
      if (name.startsWith('_')) return
      const count = counts.get(name) || 0
      if (count === 0) return
      const continent = info?.continent
      if (!continent) return
      if (!byContinent.has(continent)) byContinent.set(continent, [])
      byContinent.get(continent).push({ name, count })
    })

    return [...byContinent.entries()]
      .map(([continent, list]) => ({
        continent,
        countries: list.sort((a, b) => b.count - a.count),
        total: list.reduce((sum, c) => sum + c.count, 0),
      }))
      .sort((a, b) => b.total - a.total)
  }, [countriesData, films])

  // Continent membership limited to what's on offer, so expanding a continent
  // can never produce a chip for a country with no films in view.
  const index = useMemo(() => {
    const available = new Set()
    grouped.forEach(g => g.countries.forEach(c => available.add(c.name)))
    return buildContinentIndex(countriesData, available)
  }, [countriesData, grouped])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return grouped
    return grouped
      .map(g =>
        g.continent.toLowerCase().includes(q)
          ? g
          : { ...g, countries: g.countries.filter(c => c.name.toLowerCase().includes(q)) }
      )
      .filter(g => g.countries.length > 0)
  }, [grouped, search])

  // Searching auto-opens every group that still has matches.
  const openGroups = useMemo(() => {
    if (!search.trim()) return expanded
    const all = {}
    visible.forEach(g => { all[g.continent] = true })
    return all
  }, [search, visible, expanded])

  const countrySet = useMemo(() => new Set(countries), [countries])
  const continentSet = useMemo(() => new Set(continents), [continents])

  const emit = (nextCountries, nextContinents) => {
    onChange({ countries: uniq(nextCountries), continents: uniq(nextContinents) })
    setSearch('')
  }

  const toggleContinent = continent => {
    if (continentSet.has(continent)) {
      // Drop the token and any countries it covered, so one click undoes it.
      const covered = new Set(index.countriesIn.get(continent) || [])
      emit(countries.filter(n => !covered.has(n)), continents.filter(c => c !== continent))
    } else {
      // Absorb any of its countries already chosen individually — leaving them
      // would show a continent chip and its own members side by side.
      const covered = new Set(index.countriesIn.get(continent) || [])
      emit(countries.filter(n => !covered.has(n)), [...continents, continent])
    }
  }

  const toggleCountry = name => {
    const continent = index.continentOf.get(name)

    // Covered by a continent token: expand it to everything BUT this one, which
    // is the only way the selection can express the exclusion at all.
    if (continent && continentSet.has(continent)) {
      const siblings = (index.countriesIn.get(continent) || []).filter(n => n !== name)
      emit([...countries, ...siblings], continents.filter(c => c !== continent))
      return
    }

    if (countrySet.has(name)) emit(countries.filter(n => n !== name), continents)
    else emit([...countries, name], continents)
  }

  const chips = [
    ...continents.map(name => ({ name, kind: 'continent' })),
    ...countries.map(name => ({ name, kind: 'country' })),
  ]
  const selectedCount = chips.length

  return (
    <div className="relative" ref={rootRef}>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold text-black uppercase tracking-wide">{label}</label>
        {selectedCount > 0 && (
          <button
            onClick={() => onChange({ countries: [], continents: [] })}
            className="text-xs font-bold text-red-600 hover:text-red-800 uppercase tracking-wide"
          >
            Clear ({selectedCount})
          </button>
        )}
      </div>

      {/* Continent chips lead and carry their colour, so a selection of one
          continent plus three countries reads as two different kinds of thing. */}
      {selectedCount > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {chips.map(chip => (
            <span
              key={`${chip.kind}:${chip.name}`}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-white text-xs font-medium"
              style={{
                backgroundColor:
                  chip.kind === 'continent' ? continentColors[chip.name] || '#374151' : '#000000',
              }}
            >
              <span className="truncate">{chip.name}</span>
              <button
                onClick={() =>
                  chip.kind === 'continent'
                    ? onChange({ countries, continents: continents.filter(c => c !== chip.name) })
                    : onChange({ countries: countries.filter(c => c !== chip.name), continents })
                }
                aria-label={`Remove ${chip.name}`}
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
        placeholder={selectedCount > 0 ? 'Add more…' : placeholder}
        className="w-full px-2 py-1.5 border-2 border-black text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black"
      />

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 bg-white border-2 border-black shadow-[0_8px_24px_rgba(0,0,0,0.25)] max-h-48 overflow-y-auto">
          {visible.map(group => {
            const members = group.countries.map(c => c.name)
            const wholeContinent = continentSet.has(group.continent)
            const individually = members.filter(n => countrySet.has(n)).length
            const isOpen = openGroups[group.continent]

            return (
              <div key={group.continent}>
                <div
                  className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-gray-50 border-b border-gray-100"
                  style={{ borderLeft: `3px solid ${continentColors[group.continent] || '#999'}` }}
                >
                  <button
                    onClick={() => setExpanded(prev => ({ ...prev, [group.continent]: !prev[group.continent] }))}
                    aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${group.continent}`}
                    className="text-xs text-black focus:outline-none font-bold flex-shrink-0"
                  >
                    {isOpen ? '▼' : '▶'}
                  </button>
                  <div
                    className="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer"
                    onClick={() => toggleContinent(group.continent)}
                  >
                    <input
                      type="checkbox"
                      checked={wholeContinent}
                      ref={el => { if (el) el.indeterminate = !wholeContinent && individually > 0 }}
                      onChange={() => toggleContinent(group.continent)}
                      className="w-3 h-3 cursor-pointer flex-shrink-0"
                      onClick={e => e.stopPropagation()}
                    />
                    <span className="text-xs font-bold text-black uppercase tracking-wide truncate">
                      {group.continent}
                    </span>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {individually > 0 ? `${individually}/` : ''}{members.length}
                    </span>
                  </div>
                </div>

                {isOpen && (
                  <div className="bg-gray-50">
                    {group.countries.map(country => (
                      <label
                        key={country.name}
                        className="flex items-center gap-1.5 px-5 py-1 cursor-pointer hover:bg-gray-100 text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={wholeContinent || countrySet.has(country.name)}
                          onChange={() => toggleCountry(country.name)}
                          className="w-3 h-3"
                        />
                        <span className="text-black font-medium flex-1 truncate">{country.name}</span>
                        <span className="text-gray-400 flex-shrink-0">{country.count}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {visible.length === 0 && (
            <div className="px-3 py-4 text-xs text-gray-500 text-center">
              No country matches “{search}”
            </div>
          )}
        </div>
      )}
    </div>
  )
}
