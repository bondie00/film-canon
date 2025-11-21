import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

// Mock data for different polls - comprehensive country list
const mockDataByPoll = {
  2022: [
    // North America
    { code: 'USA', name: 'United States', continent: 'North America', filmCount: 847, percentOfTotal: 17.5 },
    { code: 'CAN', name: 'Canada', continent: 'North America', filmCount: 87, percentOfTotal: 1.8 },
    { code: 'MEX', name: 'Mexico', continent: 'North America', filmCount: 89, percentOfTotal: 1.8 },
    { code: 'CUB', name: 'Cuba', continent: 'North America', filmCount: 12, percentOfTotal: 0.2 },
    { code: 'DOM', name: 'Dominican Republic', continent: 'North America', filmCount: 3, percentOfTotal: 0.06 },
    { code: 'GTM', name: 'Guatemala', continent: 'North America', filmCount: 5, percentOfTotal: 0.1 },
    { code: 'HTI', name: 'Haiti', continent: 'North America', filmCount: 4, percentOfTotal: 0.08 },
    { code: 'JAM', name: 'Jamaica', continent: 'North America', filmCount: 6, percentOfTotal: 0.12 },
    { code: 'MTQ', name: 'Martinique', continent: 'North America', filmCount: 2, percentOfTotal: 0.04 },

    // South America
    { code: 'ARG', name: 'Argentina', continent: 'South America', filmCount: 71, percentOfTotal: 1.5 },
    { code: 'BRA', name: 'Brazil', continent: 'South America', filmCount: 143, percentOfTotal: 2.9 },
    { code: 'CHL', name: 'Chile', continent: 'South America', filmCount: 34, percentOfTotal: 0.7 },
    { code: 'COL', name: 'Colombia', continent: 'South America', filmCount: 18, percentOfTotal: 0.4 },
    { code: 'PER', name: 'Peru', continent: 'South America', filmCount: 22, percentOfTotal: 0.5 },
    { code: 'VEN', name: 'Venezuela', continent: 'South America', filmCount: 15, percentOfTotal: 0.3 },
    { code: 'URY', name: 'Uruguay', continent: 'South America', filmCount: 11, percentOfTotal: 0.2 },
    { code: 'BOL', name: 'Bolivia', continent: 'South America', filmCount: 8, percentOfTotal: 0.2 },
    { code: 'PRY', name: 'Paraguay', continent: 'South America', filmCount: 4, percentOfTotal: 0.08 },
    { code: 'GUY', name: 'Guyana', continent: 'South America', filmCount: 2, percentOfTotal: 0.04 },

    // Europe
    { code: 'FRA', name: 'France', continent: 'Europe', filmCount: 623, percentOfTotal: 12.8 },
    { code: 'ITA', name: 'Italy', continent: 'Europe', filmCount: 445, percentOfTotal: 9.2 },
    { code: 'GBR', name: 'United Kingdom', continent: 'Europe', filmCount: 398, percentOfTotal: 8.2 },
    { code: 'DEU', name: 'Germany', continent: 'Europe', filmCount: 287, percentOfTotal: 5.9 },
    { code: 'ESP', name: 'Spain', continent: 'Europe', filmCount: 198, percentOfTotal: 4.1 },
    { code: 'SWE', name: 'Sweden', continent: 'Europe', filmCount: 165, percentOfTotal: 3.4 },
    { code: 'POL', name: 'Poland', continent: 'Europe', filmCount: 132, percentOfTotal: 2.7 },
    { code: 'RUS', name: 'Russia', continent: 'Europe', filmCount: 121, percentOfTotal: 2.5 },
    { code: 'DNK', name: 'Denmark', continent: 'Europe', filmCount: 76, percentOfTotal: 1.6 },
    { code: 'BEL', name: 'Belgium', continent: 'Europe', filmCount: 68, percentOfTotal: 1.4 },
    { code: 'AUT', name: 'Austria', continent: 'Europe', filmCount: 54, percentOfTotal: 1.1 },
    { code: 'NLD', name: 'Netherlands', continent: 'Europe', filmCount: 52, percentOfTotal: 1.1 },
    { code: 'CHE', name: 'Switzerland', continent: 'Europe', filmCount: 47, percentOfTotal: 1.0 },
    { code: 'GRC', name: 'Greece', continent: 'Europe', filmCount: 43, percentOfTotal: 0.9 },
    { code: 'PRT', name: 'Portugal', continent: 'Europe', filmCount: 39, percentOfTotal: 0.8 },
    { code: 'HUN', name: 'Hungary', continent: 'Europe', filmCount: 36, percentOfTotal: 0.7 },
    { code: 'NOR', name: 'Norway', continent: 'Europe', filmCount: 31, percentOfTotal: 0.6 },
    { code: 'FIN', name: 'Finland', continent: 'Europe', filmCount: 28, percentOfTotal: 0.6 },
    { code: 'IRL', name: 'Ireland', continent: 'Europe', filmCount: 24, percentOfTotal: 0.5 },
    { code: 'SUN', name: 'Soviet Union', continent: 'Europe', filmCount: 89, percentOfTotal: 1.8 },
    { code: 'YUG', name: 'Yugoslavia', continent: 'Europe', filmCount: 42, percentOfTotal: 0.9 },
    { code: 'CSK', name: 'Czechoslovakia', continent: 'Europe', filmCount: 51, percentOfTotal: 1.1 },
    { code: 'CZE', name: 'Czech Republic', continent: 'Europe', filmCount: 33, percentOfTotal: 0.7 },
    { code: 'DEE', name: 'East Germany', continent: 'Europe', filmCount: 22, percentOfTotal: 0.5 },
    { code: 'DEW', name: 'West Germany', continent: 'Europe', filmCount: 38, percentOfTotal: 0.8 },
    { code: 'HRV', name: 'Croatia', continent: 'Europe', filmCount: 15, percentOfTotal: 0.3 },
    { code: 'SRB', name: 'Serbia', continent: 'Europe', filmCount: 18, percentOfTotal: 0.4 },
    { code: 'SVK', name: 'Slovakia', continent: 'Europe', filmCount: 12, percentOfTotal: 0.2 },
    { code: 'SVN', name: 'Slovenia', continent: 'Europe', filmCount: 9, percentOfTotal: 0.2 },
    { code: 'BGR', name: 'Bulgaria', continent: 'Europe', filmCount: 14, percentOfTotal: 0.3 },
    { code: 'UKR', name: 'Ukraine', continent: 'Europe', filmCount: 19, percentOfTotal: 0.4 },
    { code: 'BLR', name: 'Belarus', continent: 'Europe', filmCount: 8, percentOfTotal: 0.2 },
    { code: 'EST', name: 'Estonia', continent: 'Europe', filmCount: 7, percentOfTotal: 0.1 },
    { code: 'BIH', name: 'Bosnia and Herzegovina', continent: 'Europe', filmCount: 11, percentOfTotal: 0.2 },
    { code: 'MKD', name: 'Macedonia', continent: 'Europe', filmCount: 6, percentOfTotal: 0.1 },
    { code: 'LUX', name: 'Luxembourg', continent: 'Europe', filmCount: 5, percentOfTotal: 0.1 },
    { code: 'FRO', name: 'Faroe Islands', continent: 'Europe', filmCount: 2, percentOfTotal: 0.04 },

    // Asia
    { code: 'JPN', name: 'Japan', continent: 'Asia', filmCount: 512, percentOfTotal: 10.6 },
    { code: 'IND', name: 'India', continent: 'Asia', filmCount: 256, percentOfTotal: 5.3 },
    { code: 'KOR', name: 'South Korea', continent: 'Asia', filmCount: 187, percentOfTotal: 3.9 },
    { code: 'CHN', name: 'China', continent: 'Asia', filmCount: 128, percentOfTotal: 2.6 },
    { code: 'HKG', name: 'Hong Kong', continent: 'Asia', filmCount: 94, percentOfTotal: 1.9 },
    { code: 'TWN', name: 'Taiwan', continent: 'Asia', filmCount: 67, percentOfTotal: 1.4 },
    { code: 'IRN', name: 'Iran', continent: 'Asia', filmCount: 73, percentOfTotal: 1.5 },
    { code: 'TUR', name: 'Turkey', continent: 'Asia', filmCount: 56, percentOfTotal: 1.2 },
    { code: 'ISR', name: 'Israel', continent: 'Asia', filmCount: 48, percentOfTotal: 1.0 },
    { code: 'THA', name: 'Thailand', continent: 'Asia', filmCount: 41, percentOfTotal: 0.8 },
    { code: 'LBN', name: 'Lebanon', continent: 'Asia', filmCount: 29, percentOfTotal: 0.6 },
    { code: 'PAK', name: 'Pakistan', continent: 'Asia', filmCount: 23, percentOfTotal: 0.5 },
    { code: 'IDN', name: 'Indonesia', continent: 'Asia', filmCount: 19, percentOfTotal: 0.4 },
    { code: 'VNM', name: 'Vietnam', continent: 'Asia', filmCount: 17, percentOfTotal: 0.3 },
    { code: 'SGP', name: 'Singapore', continent: 'Asia', filmCount: 15, percentOfTotal: 0.3 },
    { code: 'KHM', name: 'Cambodia', continent: 'Asia', filmCount: 12, percentOfTotal: 0.2 },
    { code: 'LKA', name: 'Sri Lanka', continent: 'Asia', filmCount: 11, percentOfTotal: 0.2 },
    { code: 'BGD', name: 'Bangladesh', continent: 'Asia', filmCount: 9, percentOfTotal: 0.2 },
    { code: 'SYR', name: 'Syria', continent: 'Asia', filmCount: 13, percentOfTotal: 0.3 },
    { code: 'IRQ', name: 'Iraq', continent: 'Asia', filmCount: 8, percentOfTotal: 0.2 },
    { code: 'PSE', name: 'Palestine', continent: 'Asia', filmCount: 14, percentOfTotal: 0.3 },
    { code: 'ARM', name: 'Armenia', continent: 'Asia', filmCount: 7, percentOfTotal: 0.1 },
    { code: 'KAZ', name: 'Kazakhstan', continent: 'Asia', filmCount: 10, percentOfTotal: 0.2 },
    { code: 'KGZ', name: 'Kyrgyzstan', continent: 'Asia', filmCount: 5, percentOfTotal: 0.1 },
    { code: 'MNG', name: 'Mongolia', continent: 'Asia', filmCount: 4, percentOfTotal: 0.08 },
    { code: 'NPL', name: 'Nepal', continent: 'Asia', filmCount: 3, percentOfTotal: 0.06 },
    { code: 'SAU', name: 'Saudi Arabia', continent: 'Asia', filmCount: 6, percentOfTotal: 0.12 },

    // Africa
    { code: 'EGY', name: 'Egypt', continent: 'Africa', filmCount: 45, percentOfTotal: 0.9 },
    { code: 'ZAF', name: 'South Africa', continent: 'Africa', filmCount: 38, percentOfTotal: 0.8 },
    { code: 'DZA', name: 'Algeria', continent: 'Africa', filmCount: 32, percentOfTotal: 0.7 },
    { code: 'MAR', name: 'Morocco', continent: 'Africa', filmCount: 28, percentOfTotal: 0.6 },
    { code: 'SEN', name: 'Senegal', continent: 'Africa', filmCount: 24, percentOfTotal: 0.5 },
    { code: 'TUN', name: 'Tunisia', continent: 'Africa', filmCount: 21, percentOfTotal: 0.4 },
    { code: 'MLI', name: 'Mali', continent: 'Africa', filmCount: 18, percentOfTotal: 0.4 },
    { code: 'BFA', name: 'Burkina Faso', continent: 'Africa', filmCount: 16, percentOfTotal: 0.3 },
    { code: 'CIV', name: 'Ivory Coast', continent: 'Africa', filmCount: 14, percentOfTotal: 0.3 },
    { code: 'NGA', name: 'Nigeria', continent: 'Africa', filmCount: 13, percentOfTotal: 0.3 },
    { code: 'CMR', name: 'Cameroon', continent: 'Africa', filmCount: 11, percentOfTotal: 0.2 },
    { code: 'KEN', name: 'Kenya', continent: 'Africa', filmCount: 10, percentOfTotal: 0.2 },
    { code: 'ETH', name: 'Ethiopia', continent: 'Africa', filmCount: 9, percentOfTotal: 0.2 },
    { code: 'GHA', name: 'Ghana', continent: 'Africa', filmCount: 8, percentOfTotal: 0.2 },
    { code: 'MRT', name: 'Mauritania', continent: 'Africa', filmCount: 7, percentOfTotal: 0.1 },
    { code: 'TCD', name: 'Chad', continent: 'Africa', filmCount: 6, percentOfTotal: 0.12 },
    { code: 'MOZ', name: 'Mozambique', continent: 'Africa', filmCount: 5, percentOfTotal: 0.1 },
    { code: 'NER', name: 'Niger', continent: 'Africa', filmCount: 5, percentOfTotal: 0.1 },
    { code: 'GNB', name: 'Guinea-Bissau', continent: 'Africa', filmCount: 4, percentOfTotal: 0.08 },
    { code: 'ZWE', name: 'Zimbabwe', continent: 'Africa', filmCount: 4, percentOfTotal: 0.08 },
    { code: 'RWA', name: 'Rwanda', continent: 'Africa', filmCount: 3, percentOfTotal: 0.06 },
    { code: 'SOM', name: 'Somalia', continent: 'Africa', filmCount: 3, percentOfTotal: 0.06 },
    { code: 'SDN', name: 'Sudan', continent: 'Africa', filmCount: 3, percentOfTotal: 0.06 },
    { code: 'LSO', name: 'Lesotho', continent: 'Africa', filmCount: 2, percentOfTotal: 0.04 },
    { code: 'COD', name: 'Democratic Republic of the Congo', continent: 'Africa', filmCount: 7, percentOfTotal: 0.1 },

    // Oceania
    { code: 'AUS', name: 'Australia', continent: 'Oceania', filmCount: 98, percentOfTotal: 2.0 },
    { code: 'NZL', name: 'New Zealand', continent: 'Oceania', filmCount: 34, percentOfTotal: 0.7 },
  ],
  2012: [
    { code: 'USA', name: 'United States', continent: 'North America', filmCount: 892, percentOfTotal: 18.4 },
    { code: 'FRA', name: 'France', continent: 'Europe', filmCount: 687, percentOfTotal: 14.2 },
    { code: 'JPN', name: 'Japan', continent: 'Asia', filmCount: 543, percentOfTotal: 11.2 },
    { code: 'ITA', name: 'Italy', continent: 'Europe', filmCount: 478, percentOfTotal: 9.9 },
    { code: 'GBR', name: 'United Kingdom', continent: 'Europe', filmCount: 412, percentOfTotal: 8.5 },
    { code: 'DEU', name: 'Germany', continent: 'Europe', filmCount: 298, percentOfTotal: 6.1 },
    { code: 'IND', name: 'India', continent: 'Asia', filmCount: 234, percentOfTotal: 4.8 },
    { code: 'ESP', name: 'Spain', continent: 'Europe', filmCount: 189, percentOfTotal: 3.9 },
    { code: 'SWE', name: 'Sweden', continent: 'Europe', filmCount: 176, percentOfTotal: 3.6 },
    { code: 'KOR', name: 'South Korea', continent: 'Asia', filmCount: 98, percentOfTotal: 2.0 },
  ],
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

export default function TopCountriesBarChart({ selectedPoll = '2022', rankRange = 'all' }) {
  // Country selection state - default to top 10
  const [selectedCountries, setSelectedCountries] = useState([
    'USA', 'FRA', 'JPN', 'ITA', 'GBR', 'DEU', 'IND', 'ESP', 'KOR', 'SWE'
  ])

  // Dropdown and pending selection state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [pendingSelection, setPendingSelection] = useState([])
  const [searchQuery, setSearchQuery] = useState('')

  // Accordion state for continents (track which are expanded)
  const [expandedContinents, setExpandedContinents] = useState({})

  // Group countries by continent
  const countriesByContinent = useMemo(() => {
    let allCountriesData = []

    if (selectedPoll === 'all') {
      allCountriesData = [...mockDataByPoll['2022']]
    } else {
      allCountriesData = [...(mockDataByPoll[selectedPoll] || mockDataByPoll['2022'])]
    }

    if (rankRange !== 'all') {
      const multipliers = {
        'top100': 0.15,
        'top250': 0.35,
      }
      const multiplier = multipliers[rankRange] || 1
      allCountriesData = allCountriesData.map(country => ({
        ...country,
        filmCount: Math.round(country.filmCount * multiplier),
      }))
    }

    // Group by continent
    const grouped = {}
    allCountriesData.forEach(country => {
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
  }, [selectedPoll, rankRange])

  // Calculate filtered data based on current filter settings
  const filteredData = useMemo(() => {
    let data = []

    if (selectedPoll === 'all') {
      data = [...mockDataByPoll['2022']]
    } else {
      data = [...(mockDataByPoll[selectedPoll] || mockDataByPoll['2022'])]
    }

    // Apply rank range filter
    if (rankRange !== 'all') {
      const multipliers = {
        'top100': 0.15,
        'top250': 0.35,
      }
      const multiplier = multipliers[rankRange] || 1
      data = data.map(country => ({
        ...country,
        filmCount: Math.round(country.filmCount * multiplier),
      }))
    }

    // Filter to only selected countries and maintain their order by film count
    return data
      .filter(country => selectedCountries.includes(country.code))
      .sort((a, b) => b.filmCount - a.filmCount)
  }, [selectedPoll, rankRange, selectedCountries])

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
    setSelectedCountries(['USA', 'FRA', 'JPN', 'ITA', 'GBR', 'DEU', 'IND', 'ESP', 'KOR', 'SWE'])
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

  const handleToggleCountry = (countryCode) => {
    setPendingSelection(prev => {
      if (prev.includes(countryCode)) {
        return prev.filter(code => code !== countryCode)
      } else {
        if (prev.length < 40) {
          return [...prev, countryCode]
        }
        return prev
      }
    })
  }

  const handleToggleContinent = (continent) => {
    const continentCountries = continent.countries.map(c => c.code)
    const allSelected = continentCountries.every(code => pendingSelection.includes(code))

    if (allSelected) {
      // Deselect all countries from this continent
      setPendingSelection(prev => prev.filter(code => !continentCountries.includes(code)))
    } else {
      // Select all countries from this continent (up to limit of 40)
      setPendingSelection(prev => {
        const newSelection = [...prev]
        continentCountries.forEach(code => {
          if (!newSelection.includes(code) && newSelection.length < 40) {
            newSelection.push(code)
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
            onClick={(data) => console.log('Navigate to:', data.code)}
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
                  const continentCountryCodes = continent.countries.map(c => c.code)
                  const selectedInContinent = continentCountryCodes.filter(code =>
                    pendingSelection.includes(code)
                  ).length
                  const totalInContinent = continentCountryCodes.length
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
                            const isSelected = pendingSelection.includes(country.code)
                            const isDisabled = !isSelected && pendingSelection.length >= 40

                            return (
                              <label
                                key={country.code}
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
                                  onChange={() => handleToggleCountry(country.code)}
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
