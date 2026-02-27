import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

// Continent color mapping - matching the page's color scheme
const continentColors = {
  'Europe': '#3b82f6',        // blue-500
  'Asia': '#10b981',          // green-500
  'North America': '#8b5cf6', // purple-500
  'South America': '#f59e0b', // orange-500
  'Africa': '#ef4444',        // red-500
  'Oceania': '#ec4899',       // pink-500
}

export default function TopCountriesBarChart({ selectedPoll = '2022', rankRange = 'all', filmsData }) {
  // Country selection state - will be set to top 10 dynamically
  const [selectedCountries, setSelectedCountries] = useState([])
  const [selectedCountry, setSelectedCountry] = useState(null) // Country name for expanded view
  const chartContainerRef = useRef(null)

  // Dropdown and pending selection state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [pendingSelection, setPendingSelection] = useState([])
  const [searchQuery, setSearchQuery] = useState('')

  // Accordion state for continents (track which are expanded)
  const [expandedContinents, setExpandedContinents] = useState({})

  // Load countries data from JSON
  const [countriesData, setCountriesData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/data/countries.json')
      .then(response => response.json())
      .then(data => {
        setCountriesData(data)
        setLoading(false)
      })
      .catch(error => {
        console.error('Error loading countries data:', error)
        setLoading(false)
      })
  }, [])

  // Transform countries data based on current filters
  const transformedData = useMemo(() => {
    if (!countriesData) return []

    const data = []

    Object.entries(countriesData).forEach(([countryName, countryInfo]) => {
      // Skip metadata keys
      if (countryName.startsWith('_')) return

      let filmCount = 0
      let distinctFilms = 0

      // Get data for selected poll (including 'all')
      const pollData = countryInfo.byPoll[selectedPoll]
      if (pollData) {
        if (rankRange === 'all') {
          filmCount = pollData.total || 0
          distinctFilms = pollData.distinctFilms || 0
        } else if (rankRange === 'consensus') {
          filmCount = pollData.consensus || 0
          distinctFilms = pollData.distinctFilmsConsensus || 0
        }
      }

      data.push({
        name: countryName,
        filmCount,
        continent: countryInfo.continent,
        distinctFilms
      })
    })

    // Sort by filmCount descending and assign ranks
    const sorted = data.sort((a, b) => b.filmCount - a.filmCount)

    // Count countries with votes and assign ranks
    const countriesWithVotes = sorted.filter(c => c.filmCount > 0)
    const totalCountriesWithVotes = countriesWithVotes.length

    // Assign rank only to countries with votes
    let currentRank = 1
    sorted.forEach(country => {
      if (country.filmCount > 0) {
        country.rank = currentRank
        country.totalCountries = totalCountriesWithVotes
        currentRank++
      } else {
        country.rank = null
        country.totalCountries = totalCountriesWithVotes
      }
    })

    return sorted
  }, [countriesData, selectedPoll, rankRange])

  const defaultCount = rankRange === 'consensus' ? 5 : 10

  // Explicitly track whether user is in "Top N" mode
  const [isTopNMode, setIsTopNMode] = useState(true)

  // Set initial top N only on first data load
  const [hasInitialized, setHasInitialized] = useState(false)
  useEffect(() => {
    if (transformedData.length > 0 && !hasInitialized) {
      const topN = transformedData.slice(0, defaultCount).map(c => c.name)
      setSelectedCountries(topN)
      setHasInitialized(true)
    }
  }, [transformedData])

  // When defaultCount or data changes, re-apply Top N if in that mode
  useEffect(() => {
    if (hasInitialized && transformedData.length > 0 && isTopNMode) {
      const topN = transformedData.filter(c => c.filmCount > 0).slice(0, defaultCount).map(c => c.name)
      setSelectedCountries(topN)
    }
  }, [defaultCount, transformedData, isTopNMode])

  // Group countries by continent
  const countriesByContinent = useMemo(() => {
    if (!transformedData.length) return []

    // Filter out countries with 0 films before grouping
    const countriesWithFilms = transformedData.filter(country => country.filmCount > 0)

    // Group by continent
    const grouped = {}
    countriesWithFilms.forEach(country => {
      if (!grouped[country.continent]) {
        grouped[country.continent] = []
      }
      grouped[country.continent].push(country)
    })

    // Sort continents by total votes
    const continentOrder = Object.entries(grouped)
      .map(([continent, countries]) => ({
        continent,
        countries: countries.sort((a, b) => b.filmCount - a.filmCount),
        totalFilms: countries.reduce((sum, c) => sum + c.filmCount, 0)
      }))
      .sort((a, b) => b.totalFilms - a.totalFilms)

    return continentOrder
  }, [transformedData])

  // Calculate filtered data based on selected countries
  const filteredData = useMemo(() => {
    return transformedData
      .filter(country => selectedCountries.includes(country.name) && country.filmCount > 0)
      .sort((a, b) => b.filmCount - a.filmCount)
  }, [transformedData, selectedCountries])

  // Filter continents by search query
  const filteredContinents = useMemo(() => {
    if (!searchQuery.trim()) {
      return countriesByContinent
    }

    const query = searchQuery.toLowerCase()
    const filtered = countriesByContinent
      .map(continent => {
        const continentMatches = continent.continent.toLowerCase().includes(query)

        if (continentMatches) {
          return continent
        } else {
          return {
            ...continent,
            countries: continent.countries.filter(country =>
              country.name.toLowerCase().includes(query)
            )
          }
        }
      })
      .filter(continent => continent.countries.length > 0)

    // Auto-expand continents with matches
    const newExpanded = { ...expandedContinents }
    filtered.forEach(continent => {
      newExpanded[continent.continent] = true
    })
    setExpandedContinents(newExpanded)

    return filtered
  }, [countriesByContinent, searchQuery])

  // Dynamic chart height based on number of countries
  // 1-10 countries: 40px per bar (comfortable, default 10 = 400px)
  // 11+ countries: 30px per bar (20 = 600px, 30 = 900px, 40 = 1200px)
  // Minimum: 150px to give single bars breathing room and space for tooltips
  // Maximum: 1100px to prevent excessive page length
  const chartHeight = useMemo(() => {
    const barHeight = filteredData.length <= 10 ? 40 : 30
    const calculated = filteredData.length * barHeight
    return Math.max(150, Math.min(1100, calculated))
  }, [filteredData.length])

  // Get films for a specific country based on current filters
  const getFilmsForCountry = useCallback((countryName) => {
    if (!filmsData) return []

    return filmsData
      .filter(film => film.countries?.includes(countryName))
      .map(film => {
        let votes = 0
        let rank = null

        if (selectedPoll === 'all') {
          votes = film.pollHistory?.reduce((sum, poll) => sum + (poll.votes || 0), 0) || 0
          rank = null
        } else {
          const pollEntry = film.pollHistory?.find(p => p.year === parseInt(selectedPoll))
          votes = pollEntry?.votes || 0
          rank = pollEntry?.rank || null
        }

        // Filter by consensus rank range
        if (rankRange === 'consensus') {
          if (selectedPoll === 'all') {
            const allPollData = film.pollHistory?.find(p => p.year === 'all')
            if (!allPollData?.rank || allPollData.rank > 100) return null
          } else {
            const cutoffRank = countriesData?._pollMetadata?.[selectedPoll]?.consensus?.cutoffRank
            if (!rank || !cutoffRank || rank > cutoffRank) return null
          }
        }

        if (votes === 0) return null

        return {
          title: film.FilmTitle,
          year: film.Year,
          votes,
          rank,
          directors: film.directors
        }
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (b.votes !== a.votes) return b.votes - a.votes
        if (a.rank && b.rank) return a.rank - b.rank
        return 0
      })
  }, [filmsData, selectedPoll, rankRange, countriesData])

  // Get selected country data for expanded view
  const selectedCountryData = useMemo(() => {
    if (!selectedCountry) return null

    const countryInfo = filteredData.find(c => c.name === selectedCountry)
      || transformedData.find(c => c.name === selectedCountry)
    if (!countryInfo) return null

    return {
      name: countryInfo.name,
      continent: countryInfo.continent,
      filmCount: countryInfo.filmCount,
      distinctFilms: countryInfo.distinctFilms,
      rank: countryInfo.rank,
      totalCountries: countryInfo.totalCountries,
      films: getFilmsForCountry(countryInfo.name)
    }
  }, [selectedCountry, filteredData, transformedData, getFilmsForCountry])

  // Handle bar click - open expanded view (fires from BarChart onClick with chart state)
  const handleBarClick = useCallback((state) => {
    if (selectedCountry) return // Already have a country selected
    // BarChart onClick provides activeLabel (the Y-axis value = country name)
    const countryName = state?.activeLabel
    if (!countryName) return
    setSelectedCountry(countryName)
  }, [selectedCountry])

  // Close expanded view
  const handleCloseExpanded = useCallback(() => {
    setSelectedCountry(null)
  }, [])

  // Close expanded view when filters change
  useEffect(() => {
    setSelectedCountry(null)
  }, [selectedPoll, rankRange, selectedCountries])

  const handleResetToTopN = () => {
    setIsTopNMode(true)
    const topN = transformedData.filter(c => c.filmCount > 0).slice(0, defaultCount).map(c => c.name)
    setSelectedCountries(topN)
  }

  const handleSelectContinent = (continentName) => {
    setIsTopNMode(false)
    // Get all countries from the selected continent that have votes
    const continentCountries = transformedData
      .filter(country => country.continent === continentName && country.filmCount > 0)
      .map(c => c.name)

    if (continentCountries.length > 0) {
      setSelectedCountries(continentCountries)
    }
  }

  // Detect which quick filter button matches the currently visible bars
  const activeButton = useMemo(() => {
    if (!filteredData.length) return null

    const visibleNames = filteredData.map(c => c.name)

    // Check if visible bars match Top N (top N countries that have films)
    const topN = transformedData.filter(c => c.filmCount > 0).slice(0, defaultCount).map(c => c.name)
    if (topN.length === visibleNames.length && topN.every(c => visibleNames.includes(c))) {
      return 'topN'
    }

    // Check if visible bars match a continent's active countries
    for (const continent of Object.keys(continentColors)) {
      const continentCountries = transformedData
        .filter(c => c.continent === continent && c.filmCount > 0)
        .map(c => c.name)
      if (continentCountries.length > 0 &&
          continentCountries.length === visibleNames.length &&
          continentCountries.every(c => visibleNames.includes(c))) {
        return continent
      }
    }

    return null
  }, [filteredData, transformedData, defaultCount])


  // Calculate which continents have countries with votes
  const activeContinents = useMemo(() => {
    const continents = new Set()
    transformedData.forEach(country => {
      if (country.filmCount > 0) {
        continents.add(country.continent)
      }
    })
    return continents
  }, [transformedData])

  // Dropdown handlers
  const handleOpenDropdown = () => {
    setPendingSelection([...selectedCountries])
    setIsDropdownOpen(true)
    // Initialize all continents as collapsed for easier navigation
    setExpandedContinents({})
  }

  const handleCloseDropdown = () => {
    setIsDropdownOpen(false)
    setPendingSelection([])
    setSearchQuery('')
    setExpandedContinents({})
  }

  const toggleContinentExpanded = (continentName) => {
    setExpandedContinents(prev => ({
      ...prev,
      [continentName]: !prev[continentName]
    }))
  }

  const handleApplySelection = () => {
    if (pendingSelection.length > 0 && pendingSelection.length <= 40) {
      setIsTopNMode(false)
      setSelectedCountries(pendingSelection)
      handleCloseDropdown()
    }
  }

  const handleToggleCountry = (countryName) => {
    setPendingSelection(prev => {
      if (prev.includes(countryName)) {
        return prev.filter(name => name !== countryName)
      } else {
        if (prev.length < 40) {
          return [...prev, countryName]
        }
        return prev
      }
    })
  }

  const handleToggleContinent = (continent) => {
    const continentCountries = continent.countries.map(c => c.name)
    const anySelected = continentCountries.some(name => pendingSelection.includes(name))

    if (anySelected) {
      // If ANY countries from this continent are selected, deselect ALL of them
      // This allows users to clear space even when at the 40-country limit
      setPendingSelection(prev => prev.filter(name => !continentCountries.includes(name)))
    } else {
      // If NO countries from this continent are selected, add ALL of them (up to limit of 40)
      setPendingSelection(prev => {
        const newSelection = [...prev]
        continentCountries.forEach(name => {
          if (!newSelection.includes(name) && newSelection.length < 40) {
            newSelection.push(name)
          }
        })
        return newSelection
      })
    }
  }

  // Custom Y-axis tick - display country name with truncation for long names
  const CustomYAxisTick = ({ x, y, payload }) => {
    const maxChars = 14
    const displayName = payload.value.length > maxChars
      ? payload.value.substring(0, maxChars - 1) + '...'
      : payload.value

    return (
      <g transform={`translate(${x},${y})`}>
        <title>{payload.value}</title>
        <text
          x={-8}
          y={0}
          dy={4}
          textAnchor="end"
          fill="#000000"
          fontSize="12"
          fontWeight="600"
        >
          {displayName}
        </text>
      </g>
    )
  }

  // Custom tooltip for the bar chart
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-2.5 border-2 border-black shadow-lg max-w-[180px]">
          <p className="font-bold text-base text-black uppercase tracking-wide">{data.name}</p>
          <p className="text-xs text-black font-medium mb-1">{data.continent}</p>
          <p className="text-xl font-black text-black my-1">
            {data.filmCount.toLocaleString()} votes
          </p>
          {data.rank && (
            <p className="text-xs text-black font-medium mt-0.5">
              #{data.rank} out of {data.totalCountries} countries
            </p>
          )}
          {data.distinctFilms > 0 && (
            <p className="text-xs text-black font-medium mt-0.5">
              {data.distinctFilms} distinct films
            </p>
          )}
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="bg-white border-4 border-black p-6 mb-8">
        <div className="text-center text-black font-medium py-8">
          Loading country data...
        </div>
      </div>
    )
  }

  if (!countriesData) {
    return (
      <div className="bg-white border-4 border-black p-6 mb-8">
        <div className="text-center text-black font-medium py-8">
          Error loading country data
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border-4 border-black p-6 mb-8">
      <div className="mb-6 border-b-2 border-gray-300 pb-4">
        <div className="mb-4">
          <h2 className="text-3xl font-black text-black mb-2 uppercase tracking-wide">
            Countries by Votes
          </h2>
          <p className="text-black font-medium">
            Customize displayed countries using the search bar below
          </p>
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          <div className="bg-white border-2 border-black p-1 flex-shrink-0">
            <button
              onClick={handleResetToTopN}
              className={`py-2 px-3 text-sm font-bold uppercase tracking-wide transition-all border-2 border-black ${
                activeButton === 'topN'
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-black hover:text-white'
              }`}
            >
              Top {defaultCount}
            </button>
          </div>

          {Object.entries(continentColors).map(([continent, color]) => {
            const isActive = activeContinents.has(continent)
            const isPressed = activeButton === continent
            return (
              <div
                key={continent}
                className={`border-2 p-1 flex-shrink-0 ${
                  isActive ? 'bg-white border-black' : 'bg-gray-100 border-gray-300'
                }`}
              >
                <button
                  onClick={() => isActive && handleSelectContinent(continent)}
                  disabled={!isActive}
                  className={`py-2 px-3 text-sm font-bold uppercase tracking-wide transition-all border-2 ${
                    !isActive
                      ? 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed'
                      : isPressed
                        ? 'text-white'
                        : 'bg-white text-black hover:text-white'
                  }`}
                  style={isActive ? {
                    borderColor: color,
                    ...(isPressed ? { backgroundColor: color } : {})
                  } : {}}
                  onMouseEnter={(e) => {
                    if (isActive && !isPressed) {
                      e.currentTarget.style.backgroundColor = color
                      e.currentTarget.style.borderColor = color
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isActive && !isPressed) {
                      e.currentTarget.style.backgroundColor = 'white'
                      e.currentTarget.style.borderColor = color
                    }
                  }}
                >
                  {continent}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* BAR CHART with expanded panel overlay */}
      <div ref={chartContainerRef} className="relative">
        {/* Suppress focus outline on all chart elements when clicked */}
        <style>{`.bar-chart-container *:focus,
          .bar-chart-container *:focus-visible,
          .bar-chart-container * { outline: none; }`}</style>
        <div className="bar-chart-container">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={filteredData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              onClick={handleBarClick}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
              <XAxis
                type="number"
                allowDecimals={false}
                stroke="#000000"
                tick={{ fill: '#000000', fontSize: 12 }}
                axisLine={{ stroke: '#000000', strokeWidth: 2 }}
                tickLine={{ stroke: '#000000' }}
                label={{
                  value: 'Votes',
                  position: 'insideBottom',
                  offset: -5,
                  style: { fontWeight: 'bold', fill: '#000000' }
                }}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={95}
                interval={0}
                stroke="#000000"
                axisLine={{ stroke: '#000000', strokeWidth: 2 }}
                tickLine={{ stroke: '#000000' }}
                tick={<CustomYAxisTick />}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="filmCount"
                radius={[0, 0, 0, 0]}
                cursor={selectedCountry ? 'default' : 'pointer'}
              >
                {filteredData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={continentColors[entry.continent]}
                    stroke="#000000"
                    strokeWidth={1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Expanded Country Panel - overlays the chart area */}
        {selectedCountryData && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-4 pointer-events-none">
            {/* Semi-transparent overlay to dim the chart */}
            <div
              className="absolute inset-0 bg-black bg-opacity-20 pointer-events-auto"
              onClick={handleCloseExpanded}
            />

            {/* Expanded panel - centered, matching chart dimensions */}
            <div className="relative w-[calc(100%-32px)] h-[calc(100%-32px)] max-w-full max-h-full bg-white border-4 border-black pointer-events-auto flex flex-col shadow-xl">
              {/* Close button */}
              <button
                onClick={handleCloseExpanded}
                className="absolute -top-3 -right-3 w-8 h-8 bg-white border-2 border-black text-black font-black text-lg hover:bg-black hover:text-white transition-colors flex items-center justify-center z-10"
                title="Close"
              >
                ×
              </button>

              {/* Country header */}
              <div className="px-4 py-3 bg-gray-50 border-b-2 border-gray-300 flex-shrink-0">
                <h4 className="font-black text-lg text-black uppercase tracking-wide">{selectedCountryData.name}</h4>
                <p className="text-xs text-black font-medium">{selectedCountryData.continent}</p>
                <div className="flex gap-3 mt-1">
                  <span className="text-base font-black text-black">
                    {selectedCountryData.filmCount.toLocaleString()} votes
                  </span>
                  <span className="text-sm text-black font-medium self-end">
                    {selectedCountryData.films.length} films
                  </span>
                  {selectedCountryData.rank && (
                    <span className="text-sm text-black font-medium self-end">
                      #{selectedCountryData.rank} of {selectedCountryData.totalCountries}
                    </span>
                  )}
                </div>
              </div>

              {/* Scrollable film list */}
              <div className="flex-1 overflow-y-auto">
                {/* Table header */}
                <div className="sticky top-0 bg-gray-100 border-b border-gray-300 px-4 py-2 flex gap-2 text-xs font-bold text-black uppercase tracking-wide">
                  {selectedPoll !== 'all' && <span className="w-12">Rank</span>}
                  <span className="flex-1">Title</span>
                  <span className="w-16 text-right">Votes</span>
                </div>

                {/* Film rows */}
                {selectedCountryData.films.map((film, idx) => (
                  <div
                    key={`${film.title}-${idx}`}
                    className={`px-4 py-2 flex gap-2 text-sm border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    {selectedPoll !== 'all' && (
                      <span className="w-12 font-bold text-black">
                        {film.rank ? `#${film.rank}` : '—'}
                      </span>
                    )}
                    <span className="flex-1 text-black font-medium truncate" title={`${film.title} (${film.year})`}>
                      {film.title} <span className="text-gray-500">({film.year})</span>
                    </span>
                    <span className="w-16 text-right font-bold text-black">{film.votes}</span>
                  </div>
                ))}

                {selectedCountryData.films.length === 0 && (
                  <div className="px-4 py-8 text-center text-gray-500 text-sm">
                    No films found for current filters
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ADD COUNTRY DROPDOWN - Just below chart */}
      <div className="border-t-2 border-black bg-white p-4 mt-4 relative">
        {/* Dropdown trigger */}
        <div
          onClick={handleOpenDropdown}
          className="w-full px-4 py-3 border-2 border-black text-sm text-black cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between font-medium"
        >
          <span>Search and add countries...</span>
          <span className="text-xs text-black font-bold">
            {selectedCountries.length}/40 selected
          </span>
        </div>

        {/* Dropdown modal */}
        {isDropdownOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black bg-opacity-20 z-40"
              onClick={handleCloseDropdown}
            />

            {/* Dropdown content */}
            <div className="absolute left-4 right-4 top-16 bg-white border-2 border-black shadow-2xl z-50 max-h-96 flex flex-col">
              {/* Search header */}
              <div className="p-3 border-b-2 border-gray-300">
                <input
                  type="text"
                  placeholder="Search countries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black text-sm focus:outline-none focus:ring-2 focus:ring-black font-medium"
                  autoFocus
                />
                <div className="mt-2 flex justify-between items-center">
                  <div className="text-xs text-black font-bold uppercase tracking-wide">
                    <span>{pendingSelection.length}/40 countries selected</span>
                    {pendingSelection.length >= 40 && (
                      <span className="text-red-600 font-black ml-2">Maximum reached</span>
                    )}
                  </div>
                  <button
                    onClick={() => setPendingSelection([])}
                    disabled={pendingSelection.length === 0}
                    className={`text-xs font-bold px-2 py-1 transition-colors uppercase tracking-wide ${
                      pendingSelection.length === 0
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-red-600 hover:bg-red-50 cursor-pointer'
                    }`}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Scrollable continent list */}
              <div className="overflow-y-auto flex-1 p-3">
                {filteredContinents.map((continent) => {
                  const continentCountryNames = continent.countries.map(c => c.name)
                  const selectedInContinent = continentCountryNames.filter(name =>
                    pendingSelection.includes(name)
                  ).length
                  const totalInContinent = continentCountryNames.length
                  const allSelected = selectedInContinent === totalInContinent
                  const someSelected = selectedInContinent > 0 && selectedInContinent < totalInContinent
                  const isExpanded = expandedContinents[continent.continent]

                  return (
                    <div key={continent.continent} className="mb-3">
                      {/* Continent header with checkbox and accordion toggle */}
                      <div className="flex items-center gap-2 mb-2 p-2 hover:bg-gray-50">
                        {/* Expand/collapse icon */}
                        <button
                          onClick={() => toggleContinentExpanded(continent.continent)}
                          className="text-black hover:text-gray-700 focus:outline-none font-bold"
                        >
                          {isExpanded ? '▼' : '▶'}
                        </button>

                        {/* Continent checkbox */}
                        <div
                          className="flex items-center gap-2 flex-1 cursor-pointer"
                          onClick={() => handleToggleContinent(continent)}
                        >
                          <input
                            type="checkbox"
                            checked={allSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = someSelected
                            }}
                            onChange={() => handleToggleContinent(continent)}
                            className="w-4 h-4 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="font-bold text-black uppercase tracking-wide">
                            {continent.continent}
                          </span>
                          <span className="text-xs text-black font-medium">
                            ({selectedInContinent}/{totalInContinent} selected)
                          </span>
                        </div>
                      </div>

                      {/* Country list - only shown when expanded */}
                      {isExpanded && (
                        <div className="ml-6 space-y-1">
                          {continent.countries.map((country) => {
                            const isSelected = pendingSelection.includes(country.name)
                            const isDisabled = !isSelected && pendingSelection.length >= 40

                            return (
                              <label
                                key={country.name}
                                className={`flex items-center gap-2 p-1.5 cursor-pointer ${
                                  isDisabled
                                    ? 'opacity-50 cursor-not-allowed'
                                    : 'hover:bg-gray-100'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  disabled={isDisabled}
                                  onChange={() => handleToggleCountry(country.name)}
                                  className="w-4 h-4"
                                />
                                <span className="text-sm text-black font-medium">
                                  {country.name}
                                </span>
                                <span className="text-xs text-black font-medium">
                                  ({country.filmCount})
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
                  <div className="text-center text-black py-8 font-medium">
                    No countries found matching "{searchQuery}"
                  </div>
                )}
              </div>

              {/* Footer with buttons */}
              <div className="p-3 border-t-2 border-gray-300 flex gap-2 justify-end">
                <button
                  onClick={handleCloseDropdown}
                  className="px-4 py-2 text-sm font-bold text-black bg-white border-2 border-black hover:bg-gray-100 transition-colors uppercase tracking-wide"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplySelection}
                  disabled={pendingSelection.length === 0 || pendingSelection.length > 40}
                  className={`px-4 py-2 text-sm font-bold uppercase tracking-wide transition-colors ${
                    pendingSelection.length === 0 || pendingSelection.length > 40
                      ? 'bg-gray-400 text-white cursor-not-allowed border-2 border-gray-400'
                      : 'bg-black text-white border-2 border-black hover:bg-gray-900'
                  }`}
                >
                  Apply Changes
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
