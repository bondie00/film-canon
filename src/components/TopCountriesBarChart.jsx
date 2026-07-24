import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import GridTile, { withCurrent } from './search/GridTile'

// Cap posters shown in the expanded panel; the rest live on the Explore page.
const PANEL_FILM_CAP = 30

// Country name as a link to its detail page, with an arrow icon signalling it's clickable.
function CountryTitleLink({ name }) {
  return (
    <Link
      to={`/countries/${encodeURIComponent(name)}`}
      className="group inline-flex items-center gap-1.5 hover:underline decoration-2 underline-offset-2"
    >
      <span>{name}</span>
      <svg className="w-4 h-4 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M7 17L17 7M17 7H8M17 7v9" />
      </svg>
    </Link>
  )
}

// Build an Explore-page link carrying the current filters (poll, country, rank depth).
function buildExploreUrl(countryNames, poll, rankRange, countriesData) {
  const params = new URLSearchParams()
  if (poll) params.set('poll', poll)
  countryNames.forEach(n => params.append('country', n))
  if (rankRange === 'consensus') {
    const top = poll === 'all' ? 100 : countriesData?._pollMetadata?.[poll]?.consensus?.cutoffRank
    if (top) params.set('top', String(top))
  }
  return `/explore?${params.toString()}`
}

// Continent color mapping - matching the page's color scheme
const continentColors = {
  'Europe': '#3b82f6',        // blue-500
  'Asia': '#10b981',          // green-500
  'North America': '#8b5cf6', // purple-500
  'South America': '#f59e0b', // orange-500
  'Africa': '#ef4444',        // red-500
  'Oceania': '#ec4899',       // pink-500
}

export default function TopCountriesBarChart({ selectedPoll = '2022', rankRange = 'all', filmsData, metric = 'films' }) {
  // Country selection state - will be set to top 10 dynamically
  const [selectedCountries, setSelectedCountries] = useState([])
  const [selectedCountry, setSelectedCountry] = useState(null) // Country name for expanded view
  const chartContainerRef = useRef(null)
  const expandedPanelRef = useRef(null)

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

      // filmCount holds whichever metric is active (it drives bar length,
      // sorting, ranking, and Top N); films and votes are both retained so the
      // tooltip and expanded panel can show the other as a secondary detail.
      let films = 0
      let votes = 0

      // Get data for selected poll (including 'all')
      const pollData = countryInfo.byPoll[selectedPoll]
      if (pollData) {
        if (rankRange === 'all') {
          films = pollData.distinctFilms || 0
          votes = pollData.total || 0
        } else if (rankRange === 'consensus') {
          films = pollData.distinctFilmsConsensus || 0
          votes = pollData.consensus || 0
        }
      }

      data.push({
        name: countryName,
        filmCount: metric === 'votes' ? votes : films,
        films,
        votes,
        continent: countryInfo.continent
      })
    })

    // Sort by the active metric descending and assign ranks
    const sorted = data.sort((a, b) => b.filmCount - a.filmCount)

    const countriesWithVotes = sorted.filter(c => c.films > 0)
    const totalCountriesWithVotes = countriesWithVotes.length

    // Competition ranks (ties share a rank: 1, 2, 2, 4, ...) computed for BOTH metrics, so the
    // expanded panel can show rank-by-films and rank-by-votes regardless of the active metric.
    const assignRank = (valueKey, rankField) => {
      const order = [...countriesWithVotes].sort((a, b) => b[valueKey] - a[valueKey])
      let prevVal = null
      let prevRank = 0
      order.forEach((c, i) => {
        if (c[valueKey] === prevVal) {
          c[rankField] = prevRank
        } else {
          c[rankField] = i + 1
          prevRank = i + 1
          prevVal = c[valueKey]
        }
      })
    }
    assignRank('films', 'filmsRank')
    assignRank('votes', 'votesRank')
    sorted.forEach(c => { c.totalCountries = totalCountriesWithVotes })

    return sorted
  }, [countriesData, selectedPoll, rankRange, metric])

  const defaultCount = rankRange === 'consensus' ? 5 : 10

  // Explicitly track whether user is in "Top N" mode
  const [isTopNMode, setIsTopNMode] = useState(true)

  // Whether the chart draws one bar per country (default) or one bar per continent.
  const [viewMode, setViewMode] = useState('countries') // 'countries' | 'continents'

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

  // Continent-level aggregation for the "Continents" view: one bar per continent summing the
  // active metric, plus each continent's share of the whole canon (shown as a direct bar label).
  // `name`/`continent` are both the continent so the Y-axis, color Cell and drill-in all work
  // through the same code paths as countries.
  const continentData = useMemo(() => {
    const agg = {}
    let grandTotal = 0
    transformedData.forEach(c => {
      if (c.filmCount <= 0) return
      if (!agg[c.continent]) {
        agg[c.continent] = { name: c.continent, continent: c.continent, filmCount: 0, films: 0, votes: 0, countryCount: 0, isContinent: true }
      }
      agg[c.continent].filmCount += c.filmCount
      agg[c.continent].films += c.films
      agg[c.continent].votes += c.votes
      agg[c.continent].countryCount += 1
      grandTotal += c.filmCount
    })
    return Object.values(agg)
      .map(d => ({ ...d, pct: grandTotal > 0 ? (d.filmCount / grandTotal) * 100 : 0 }))
      .sort((a, b) => b.filmCount - a.filmCount)
  }, [transformedData])

  // The dataset the bar chart currently renders.
  const chartData = viewMode === 'continents' ? continentData : filteredData

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
    const barHeight = chartData.length <= 10 ? 40 : 30
    const calculated = chartData.length * barHeight
    return Math.max(150, Math.min(1100, calculated))
  }, [chartData.length])

  // Get films for a specific country under the current filters, as full film
  // objects sorted by the active poll's votes, so the panel can render them as
  // GridTiles (with the 8-poll ranking strip and a link to each film page).
  const getFilmsForCountry = useCallback((countryName) => {
    if (!filmsData) return []

    return filmsData
      .filter(film => film.countries?.includes(countryName))
      .map(film => {
        let votes = 0
        let rank = null

        if (selectedPoll === 'all') {
          const allPollData = film.pollHistory?.find(p => p.year === 'all')
          votes = allPollData?.votes || 0
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

        return { film, sortVotes: votes, sortRank: rank }
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (b.sortVotes !== a.sortVotes) return b.sortVotes - a.sortVotes
        if (a.sortRank && b.sortRank) return a.sortRank - b.sortRank
        return 0
      })
      .map(x => x.film)
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
      votes: countryInfo.votes,
      filmsRank: countryInfo.filmsRank,
      votesRank: countryInfo.votesRank,
      totalCountries: countryInfo.totalCountries,
      films: getFilmsForCountry(countryInfo.name)
    }
  }, [selectedCountry, filteredData, transformedData, getFilmsForCountry])

  // Dynamic min-height for expanded panel container
  // Sizes to fit film list content, caps at 28rem (448px) for longer lists
  const expandedMinHeight = useMemo(() => {
    if (!selectedCountryData) return 0
    const filmCount = selectedCountryData.films.length
    // header (~100px) + table header (~33px) + panel border (8px) + container padding (32px) + breathing room = 230px base
    // Each film row ~42px (text-sm + py-2 + border)
    // Floor of 280px so even 1 film has comfortable space
    const needed = 230 + (filmCount * 42)
    return Math.max(280, Math.min(needed, 448))
  }, [selectedCountryData])

  // Handle bar click. BarChart onClick provides activeLabel (the Y-axis value).
  // - Continents view: drill into that continent's countries (and return to the countries view).
  // - Countries view: open the expanded country panel.
  const handleBarClick = useCallback((state) => {
    const label = state?.activeLabel
    if (!label) return
    if (viewMode === 'continents') {
      setViewMode('countries')
      setIsTopNMode(false)
      const names = transformedData.filter(c => c.continent === label && c.filmCount > 0).map(c => c.name)
      if (names.length) setSelectedCountries(names)
      return
    }
    if (selectedCountry) return // Already have a country selected
    setSelectedCountry(label)
  }, [viewMode, selectedCountry, transformedData])

  // Close expanded view
  const handleCloseExpanded = useCallback(() => {
    setSelectedCountry(null)
  }, [])

  // Scroll expanded panel into view when it opens
  useEffect(() => {
    if (selectedCountryData && expandedPanelRef.current) {
      expandedPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [selectedCountryData])

  // Close expanded view when filters change
  useEffect(() => {
    setSelectedCountry(null)
  }, [selectedPoll, rankRange, selectedCountries])

  const handleResetToTopN = () => {
    setViewMode('countries')
    setIsTopNMode(true)
    const topN = transformedData.filter(c => c.filmCount > 0).slice(0, defaultCount).map(c => c.name)
    setSelectedCountries(topN)
  }

  const handleSelectContinent = (continentName) => {
    setViewMode('countries')
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

      // Continent bar: show the metric total, share of the canon, and how many countries.
      if (data.isContinent) {
        return (
          <div className="bg-white p-2.5 border-2 border-black shadow-lg max-w-[200px]">
            <p className="font-bold text-base text-black uppercase tracking-wide">{data.name}</p>
            <p className="text-xl font-black text-black my-1">
              {metric === 'votes'
                ? `${data.votes.toLocaleString()} votes`
                : `${data.films.toLocaleString()} ${data.films === 1 ? 'film' : 'films'}`}
              <span className="text-sm font-bold text-black"> · {data.pct.toFixed(1)}%</span>
            </p>
            <p className="text-xs text-black font-medium mt-0.5">
              {metric === 'votes'
                ? `${data.films.toLocaleString()} ${data.films === 1 ? 'film' : 'films'}`
                : `${data.votes.toLocaleString()} votes`}
            </p>
            <p className="text-xs text-black font-medium mt-0.5">
              {data.countryCount} {data.countryCount === 1 ? 'country' : 'countries'} represented
            </p>
          </div>
        )
      }

      return (
        <div className="bg-white p-2.5 border-2 border-black shadow-lg max-w-[180px]">
          <p className="font-bold text-base text-black uppercase tracking-wide">{data.name}</p>
          <p className="text-xs text-black font-medium mb-1">{data.continent}</p>
          <p className="text-xl font-black text-black my-1">
            {metric === 'votes'
              ? `${data.votes.toLocaleString()} votes`
              : `${data.films.toLocaleString()} ${data.films === 1 ? 'film' : 'films'}`}
          </p>
          <p className="text-xs text-black font-medium mt-0.5">
            {metric === 'votes'
              ? `${data.films.toLocaleString()} ${data.films === 1 ? 'film' : 'films'}`
              : `${data.votes.toLocaleString()} votes`}
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
      <div className="mb-6 border-b-2 border-gray-300 pb-4">
        <div className="mb-4">
          <h2 className="text-3xl font-black text-black mb-2 uppercase tracking-wide">
            {viewMode === 'continents' ? 'Continents' : 'Countries'} by {metric === 'votes' ? 'Votes' : 'Films'}
          </h2>
          <p className="text-black font-medium">
            {viewMode === 'continents'
              ? 'Each continent’s share of the canon. Click a continent to see its countries.'
              : 'Customize displayed countries using the search bar below'}
          </p>
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          <div className="bg-white border-2 border-black p-1 flex-shrink-0">
            <button
              onClick={handleResetToTopN}
              className={`py-2 px-3 text-sm font-bold uppercase tracking-wide transition-all border-2 border-black ${
                viewMode === 'countries' && activeButton === 'topN'
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-black hover:text-white'
              }`}
            >
              Top {defaultCount}
            </button>
          </div>

          {Object.entries(continentColors).map(([continent, color]) => {
            const isActive = activeContinents.has(continent)
            const isPressed = viewMode === 'countries' && activeButton === continent
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

        {/* Continents view toggle - its own row: switches the bars from countries to continents */}
        <div className="flex mt-2">
          <div className="bg-white border-2 border-black p-1 flex-shrink-0">
            <button
              onClick={() => { setSelectedCountry(null); setViewMode('continents') }}
              className={`py-2 px-3 text-sm font-bold uppercase tracking-wide transition-all border-2 border-black ${
                viewMode === 'continents'
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-black hover:text-white'
              }`}
            >
              Continents
            </button>
          </div>
        </div>
      </div>

      {/* BAR CHART with expanded panel overlay */}
      <div ref={chartContainerRef} className="relative" style={selectedCountryData ? { minHeight: `${expandedMinHeight}px` } : undefined}>
        {/* Suppress focus outline on all chart elements when clicked */}
        <style>{`.bar-chart-container *:focus,
          .bar-chart-container *:focus-visible,
          .bar-chart-container * { outline: none; }`}</style>
        <div className="bar-chart-container">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={chartData}
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
                  value: metric === 'votes' ? 'Votes' : 'Films',
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
                cursor={viewMode === 'continents' || !selectedCountry ? 'pointer' : 'default'}
              >
                {chartData.map((entry, index) => (
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

            {/* Expanded panel - centered within chart, max height matches world map panel */}
            <div ref={expandedPanelRef} className="relative w-[calc(100%-32px)] max-h-[calc(28.44rem-32px)] max-w-full bg-white border-4 border-black pointer-events-auto flex flex-col shadow-xl">
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
                <h4 className="font-black text-lg text-black uppercase tracking-wide"><CountryTitleLink name={selectedCountryData.name} /></h4>
                <div className="flex gap-3 mt-1">
                  <span className="text-base font-black text-black">
                    {metric === 'votes'
                      ? `${selectedCountryData.votes.toLocaleString()} votes`
                      : `${selectedCountryData.films.length.toLocaleString()} ${selectedCountryData.films.length === 1 ? 'film' : 'films'}`}
                  </span>
                  <span className="text-sm text-black font-medium self-end">
                    {metric === 'votes'
                      ? `${selectedCountryData.films.length.toLocaleString()} ${selectedCountryData.films.length === 1 ? 'film' : 'films'}`
                      : `${selectedCountryData.votes.toLocaleString()} votes`}
                  </span>
                </div>
                {selectedCountryData.filmsRank && (
                  <p className="text-xs text-black font-medium mt-1">
                    #{selectedCountryData.filmsRank} of {selectedCountryData.totalCountries} countries by films
                  </p>
                )}
                {selectedCountryData.votesRank && (
                  <p className="text-xs text-black font-medium">
                    #{selectedCountryData.votesRank} of {selectedCountryData.totalCountries} countries by votes
                  </p>
                )}
              </div>

              {/* Scrollable poster grid — wraps onto new rows, panel scrolls vertically */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {selectedCountryData.films.slice(0, PANEL_FILM_CAP).map((film) => (
                    <GridTile key={film.key} film={withCurrent(film, selectedPoll)} activePoll={selectedPoll} square={false} />
                  ))}
                </div>

                {selectedCountryData.films.length > 0 && (
                  <Link
                    to={buildExploreUrl([selectedCountryData.name], selectedPoll, rankRange, countriesData)}
                    className="mt-3 block w-full text-center px-4 py-2 bg-black text-white border-2 border-black font-bold text-sm uppercase tracking-wide hover:bg-gray-900 transition-colors"
                  >
                    {selectedCountryData.films.length > PANEL_FILM_CAP
                      ? `View all ${selectedCountryData.films.length.toLocaleString()} films in Explore →`
                      : 'Open in Explore →'}
                  </Link>
                )}

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

      {/* ADD COUNTRY DROPDOWN - Just below chart. Hidden in the continents view, where there's no
          per-country selection to customize (all continents are always shown). */}
      {viewMode === 'countries' && (
      <div className="border-t-2 border-black bg-white p-4 mt-4 relative">
        {/* Dropdown trigger */}
        <div
          onClick={handleOpenDropdown}
          className="w-full px-4 py-3 border-2 border-black text-sm text-black cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between font-medium"
        >
          <span>Search and add countries...</span>
          <span className="text-xs text-black font-bold">
            {selectedCountries.length} selected
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
                    <span>{pendingSelection.length} {pendingSelection.length === 1 ? 'country' : 'countries'} selected</span>
                    {pendingSelection.length >= 40 && (
                      <span className="text-red-600 font-black ml-2">Maximum of 40 reached</span>
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
      )}
    </div>
  )
}
