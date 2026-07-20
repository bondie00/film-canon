import { useState, useMemo, useRef, useEffect } from 'react'
import SearchSelect from './SearchSelect'

const continentColors = {
  'Europe': '#3b82f6',
  'Asia': '#10b981',
  'North America': '#8b5cf6',
  'South America': '#f59e0b',
  'Africa': '#ef4444',
  'Oceania': '#ec4899',
}

const POLL_OPTIONS = [
  { value: 'all', label: 'All Polls Combined' },
  { value: '2022', label: '2022' },
  { value: '2012', label: '2012' },
  { value: '2002', label: '2002' },
  { value: '1992', label: '1992' },
  { value: '1982', label: '1982' },
  { value: '1972', label: '1972' },
  { value: '1962', label: '1962' },
  { value: '1952', label: '1952' },
]

export default function FilterPanel({
  filters,
  onFilterChange,
  onClear,
  countriesData,
  activePoll,
  onPollChange,
  filmCounts,
  titleOptions,
  directorOptions,
  filmsForCountryCounts,
  showPoll = true,
}) {
  const [expandedContinents, setExpandedContinents] = useState({})
  const [countrySearch, setCountrySearch] = useState('')
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false)
  const countryDropdownRef = useRef(null)

  // Close country dropdown on outside click
  useEffect(() => {
    if (!countryDropdownOpen) return
    const handleClick = (e) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target)) {
        setCountryDropdownOpen(false)
        setCountrySearch('')
        setExpandedContinents({})
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [countryDropdownOpen])

  // Compute country film counts from the filtered film list (excludes country filter itself)
  const countriesByContinent = useMemo(() => {
    if (!countriesData || !filmsForCountryCounts) return []

    // Count films per country from the filtered list
    const countryFilmCounts = {}
    filmsForCountryCounts.forEach(film => {
      film.countries?.forEach(c => {
        countryFilmCounts[c] = (countryFilmCounts[c] || 0) + 1
      })
    })

    // Group by continent using countriesData for continent mapping
    const grouped = {}
    Object.entries(countriesData).forEach(([countryName, countryInfo]) => {
      if (countryName.startsWith('_')) return

      const filmCount = countryFilmCounts[countryName] || 0
      if (filmCount === 0) return

      const continent = countryInfo.continent
      if (!grouped[continent]) {
        grouped[continent] = []
      }
      grouped[continent].push({ name: countryName, filmCount })
    })

    return Object.entries(grouped)
      .map(([continent, countries]) => ({
        continent,
        countries: countries.sort((a, b) => b.filmCount - a.filmCount),
        totalFilms: countries.reduce((sum, c) => sum + c.filmCount, 0),
      }))
      .filter(c => c.countries.length > 0)
      .sort((a, b) => b.totalFilms - a.totalFilms)
  }, [countriesData, filmsForCountryCounts])

  // Filter continents by search
  const filteredContinents = useMemo(() => {
    if (!countrySearch.trim()) return countriesByContinent

    const query = countrySearch.toLowerCase()
    return countriesByContinent
      .map(continent => {
        if (continent.continent.toLowerCase().includes(query)) return continent
        return {
          ...continent,
          countries: continent.countries.filter(c =>
            c.name.toLowerCase().includes(query)
          ),
        }
      })
      .filter(c => c.countries.length > 0)
  }, [countriesByContinent, countrySearch])

  // Auto-expand continents when searching
  const effectiveExpanded = useMemo(() => {
    if (countrySearch.trim()) {
      const autoExpanded = {}
      filteredContinents.forEach(c => { autoExpanded[c.continent] = true })
      return autoExpanded
    }
    return expandedContinents
  }, [countrySearch, filteredContinents, expandedContinents])

  const toggleContinent = (continentName) => {
    setExpandedContinents(prev => ({
      ...prev,
      [continentName]: !prev[continentName],
    }))
  }

  const handleToggleCountry = (countryName) => {
    const current = filters.selectedCountries
    const updated = current.includes(countryName)
      ? current.filter(c => c !== countryName)
      : [...current, countryName]
    onFilterChange({ selectedCountries: updated })
    setCountrySearch('')
  }

  const handleToggleContinent = (continent) => {
    const continentCountries = continent.countries.map(c => c.name)
    const current = filters.selectedCountries
    const anySelected = continentCountries.some(name => current.includes(name))

    if (anySelected) {
      onFilterChange({
        selectedCountries: current.filter(name => !continentCountries.includes(name)),
      })
    } else {
      onFilterChange({
        selectedCountries: [...current, ...continentCountries.filter(name => !current.includes(name))],
      })
    }
    setCountrySearch('')
  }

  const selectedCount = filters.selectedCountries.length

  // Build poll label with count
  const getPollLabel = (value) => {
    const count = filmCounts?.[value] || 0
    const base = POLL_OPTIONS.find(o => o.value === value)?.label || value
    return `${base} (${count.toLocaleString()})`
  }

  // Check if any filters are active
  const hasActiveFilters = filters.selectedTitles.length > 0 || filters.selectedDirectors.length > 0 ||
    filters.selectedCountries.length > 0 || filters.yearStart || filters.yearEnd ||
    filters.sortBy !== 'votes'

  return (
    <div className="bg-white border-4 border-black p-4 lg:sticky lg:top-8">
      {/* Header row: title + clear */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b-2 border-gray-300">
        <h2 className="text-xl font-black text-black uppercase tracking-wider">Filters</h2>
        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="text-xs font-bold text-red-600 hover:text-red-800 uppercase tracking-wide"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Poll Selector — hidden on the unified /explore page, where the prominent
          poll timeline drives poll selection instead. */}
      {showPoll && (
        <div className="mb-3 pb-3 border-b border-gray-200">
          <label className="block text-xs font-semibold text-black mb-1.5 uppercase tracking-wide">
            Poll
          </label>
          <select
            value={activePoll}
            onChange={(e) => onPollChange(e.target.value)}
            className="w-full px-2 py-1.5 border-2 border-black text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black"
          >
            {POLL_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {getPollLabel(opt.value)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Title Search */}
      <div className="mb-3 pb-3 border-b border-gray-200">
        <label className="block text-xs font-semibold text-black mb-1.5 uppercase tracking-wide">
          Title
        </label>
        <SearchSelect
          placeholder="Search film titles..."
          options={titleOptions}
          selected={filters.selectedTitles}
          onChange={(titles) => onFilterChange({ selectedTitles: titles })}
        />
      </div>

      {/* Director Search */}
      <div className="mb-3 pb-3 border-b border-gray-200">
        <label className="block text-xs font-semibold text-black mb-1.5 uppercase tracking-wide">
          Director
        </label>
        <SearchSelect
          placeholder="Search directors..."
          options={directorOptions}
          selected={filters.selectedDirectors}
          onChange={(directors) => onFilterChange({ selectedDirectors: directors })}
        />
      </div>

      {/* Country Filter */}
      <div className="mb-3 pb-3 border-b border-gray-200 relative" ref={countryDropdownRef}>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-black uppercase tracking-wide">
            Country
          </label>
          {selectedCount > 0 && (
            <button
              onClick={() => onFilterChange({ selectedCountries: [] })}
              className="text-xs font-bold text-red-600 hover:text-red-800 uppercase tracking-wide"
            >
              Clear ({selectedCount})
            </button>
          )}
        </div>

        {/* Selected country chips */}
        {selectedCount > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {filters.selectedCountries.map(name => (
              <span
                key={name}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-black text-white text-xs font-medium"
              >
                <span className="truncate">{name}</span>
                <button
                  onClick={() => {
                    onFilterChange({
                      selectedCountries: filters.selectedCountries.filter(c => c !== name),
                    })
                  }}
                  className="flex-shrink-0 text-gray-400 hover:text-white font-bold"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Trigger input */}
        <input
          type="text"
          value={countrySearch}
          onChange={(e) => setCountrySearch(e.target.value)}
          onFocus={() => setCountryDropdownOpen(true)}
          placeholder={selectedCount > 0 ? 'Add more countries...' : 'Search countries...'}
          className="w-full px-2 py-1.5 border-2 border-black text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black"
        />

        {/* Floating dropdown overlay */}
        {countryDropdownOpen && (
          <div className="absolute left-0 right-0 top-full z-50 bg-white border-2 border-black shadow-[0_8px_24px_rgba(0,0,0,0.25)] max-h-48 overflow-y-auto">
            {filteredContinents.map((continent) => {
              const continentCountries = continent.countries.map(c => c.name)
              const selectedInContinent = continentCountries.filter(name =>
                filters.selectedCountries.includes(name)
              ).length
              const allSelected = selectedInContinent === continentCountries.length
              const someSelected = selectedInContinent > 0 && selectedInContinent < continentCountries.length
              const isExpanded = countrySearch.trim()
                ? effectiveExpanded[continent.continent]
                : expandedContinents[continent.continent]

              return (
                <div key={continent.continent}>
                  <div
                    className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                    style={{ borderLeft: `3px solid ${continentColors[continent.continent] || '#999'}` }}
                  >
                    <button
                      onClick={() => toggleContinent(continent.continent)}
                      className="text-xs text-black focus:outline-none font-bold flex-shrink-0"
                    >
                      {isExpanded ? '▼' : '▶'}
                    </button>
                    <div
                      className="flex items-center gap-1.5 flex-1 min-w-0"
                      onClick={() => handleToggleContinent(continent)}
                    >
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = someSelected }}
                        onChange={() => handleToggleContinent(continent)}
                        className="w-3 h-3 cursor-pointer flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="text-xs font-bold text-black uppercase tracking-wide truncate">
                        {continent.continent}
                      </span>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {selectedInContinent > 0 ? `${selectedInContinent}/` : ''}{continentCountries.length}
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="bg-gray-50">
                      {continent.countries.map((country) => {
                        const isSelected = filters.selectedCountries.includes(country.name)
                        return (
                          <label
                            key={country.name}
                            className="flex items-center gap-1.5 px-5 py-1 cursor-pointer hover:bg-gray-100 text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleCountry(country.name)}
                              className="w-3 h-3"
                            />
                            <span className="text-black font-medium flex-1 truncate">
                              {country.name}
                            </span>
                            <span className="text-gray-400 flex-shrink-0">
                              {country.filmCount}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {filteredContinents.length === 0 && (
              <div className="text-center text-gray-500 py-3 text-xs">
                No countries found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Year Range */}
      <div className="mb-3 pb-3 border-b border-gray-200">
        <label className="block text-xs font-semibold text-black mb-1.5 uppercase tracking-wide">
          Year
        </label>
        <div className="flex gap-1.5 items-center">
          <input
            type="number"
            value={filters.yearStart}
            onChange={(e) => onFilterChange({ yearStart: e.target.value })}
            placeholder="From"
            min="1888"
            max="2025"
            className="w-full px-2 py-1.5 border-2 border-black text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black"
          />
          <span className="text-gray-400 text-xs">–</span>
          <input
            type="number"
            value={filters.yearEnd}
            onChange={(e) => onFilterChange({ yearEnd: e.target.value })}
            placeholder="To"
            min="1888"
            max="2025"
            className="w-full px-2 py-1.5 border-2 border-black text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
      </div>

      {/* Sort */}
      <div>
        <label className="block text-xs font-semibold text-black mb-1.5 uppercase tracking-wide">
          Sort
        </label>
        <select
          value={filters.sortBy}
          onChange={(e) => onFilterChange({ sortBy: e.target.value })}
          className="w-full px-2 py-1.5 border-2 border-black text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black"
        >
          <option value="votes">Most Votes</option>
          <option value="title-az">Title A–Z</option>
          <option value="year-newest">Year (Newest)</option>
          <option value="year-oldest">Year (Oldest)</option>
        </select>
      </div>
    </div>
  )
}
