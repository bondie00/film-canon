import { useState, useMemo, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

// Continent color mapping - matching the page's color scheme
const continentColors = {
  'Europe': '#3b82f6',        // blue-500
  'Asia': '#10b981',          // green-500
  'North America': '#8b5cf6', // purple-500
  'Latin America': '#f59e0b', // orange-500
  'Africa': '#ef4444',        // red-500
  'Oceania': '#ec4899',       // pink-500
}

export default function TopCountriesBarChart({ selectedPoll = '2022', rankRange = 'all' }) {
  // Country selection state - will be set to top 10 dynamically
  const [selectedCountries, setSelectedCountries] = useState([])

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
      let filmCount = 0

      if (selectedPoll === 'all') {
        // Sum across all polls
        filmCount = countryInfo.totalFilms
      } else {
        // Get count for specific poll
        const pollData = countryInfo.byPoll[selectedPoll]
        if (pollData) {
          if (rankRange === 'all') {
            filmCount = pollData.total
          } else if (rankRange === 'top100') {
            filmCount = pollData.top100
          } else if (rankRange === 'top250') {
            filmCount = pollData.top250
          }
        }
      }

      // Calculate percentage (rough estimate for now)
      const percentOfTotal = 0 // We'll calculate this properly later

      data.push({
        name: countryName,
        filmCount,
        continent: countryInfo.continent,
        percentOfTotal
      })
    })

    // Calculate percentages based on total
    const totalFilms = data.reduce((sum, country) => sum + country.filmCount, 0)
    data.forEach(country => {
      country.percentOfTotal = totalFilms > 0 ? ((country.filmCount / totalFilms) * 100).toFixed(1) : 0
    })

    return data.sort((a, b) => b.filmCount - a.filmCount)
  }, [countriesData, selectedPoll, rankRange])

  // Set initial top 10 countries when data loads or filters change
  useEffect(() => {
    if (transformedData.length > 0 && selectedCountries.length === 0) {
      // Only set initial top 10 if no countries are currently selected
      const top10 = transformedData.slice(0, 10).map(c => c.name)
      setSelectedCountries(top10)
    }
  }, [transformedData])

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

    // Sort continents by total film count
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

  const handleResetToTop10 = () => {
    // Reset to top 10 from current transformed data
    const top10 = transformedData.slice(0, 10).map(c => c.name)
    setSelectedCountries(top10)
  }

  // Dropdown handlers
  const handleOpenDropdown = () => {
    setPendingSelection([...selectedCountries])
    setIsDropdownOpen(true)
    // Initialize all continents as expanded
    const initialExpanded = {}
    countriesByContinent.forEach(continent => {
      initialExpanded[continent.continent] = true
    })
    setExpandedContinents(initialExpanded)
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
    const allSelected = continentCountries.every(name => pendingSelection.includes(name))

    if (allSelected) {
      // Deselect all countries from this continent
      setPendingSelection(prev => prev.filter(name => !continentCountries.includes(name)))
    } else {
      // Select all countries from this continent (up to limit of 40)
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
        <div className="bg-white p-3 border-2 border-black shadow-lg">
          <p className="font-bold text-black uppercase tracking-wide">{data.name}</p>
          <p className="text-sm text-black font-medium">{data.continent}</p>
          <p className="text-lg font-black text-black mt-1">
            {data.filmCount} films
          </p>
          <p className="text-xs text-black font-medium">
            {data.percentOfTotal}% of total
          </p>
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
      <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-6 gap-4 border-b-2 border-gray-300 pb-4">
        <div>
          <h2 className="text-3xl font-black text-black mb-2 uppercase tracking-wide">
            Top Countries by Film Count
          </h2>
          <p className="text-black font-medium">
            Customize displayed countries using the search bar below
          </p>
        </div>

        {/* Reset to Top 10 Button */}
        <button
          onClick={handleResetToTop10}
          className="px-4 py-2 bg-white text-black border-2 border-black hover:bg-black hover:text-white text-sm font-bold uppercase tracking-wide transition-colors"
        >
          Reset to Top 10
        </button>
      </div>

      {/* BAR CHART */}
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={filteredData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
          <XAxis type="number" />
          <YAxis
            dataKey="name"
            type="category"
            width={95}
            interval={0}
            tick={<CustomYAxisTick />}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="filmCount"
            radius={[0, 0, 0, 0]}
            cursor="pointer"
            onClick={(data) => console.log('Navigate to:', data.name)}
          >
            {filteredData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={continentColors[entry.continent]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

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
