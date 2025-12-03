import { useState, useMemo, useEffect } from 'react'

// Continent color mapping
const continentColors = {
  'Europe': '#3b82f6',        // blue-500
  'Asia': '#10b981',          // green-500
  'North America': '#8b5cf6', // purple-500
  'South America': '#f59e0b', // orange-500
  'Africa': '#ef4444',        // red-500
  'Oceania': '#ec4899',       // pink-500
}

// Calculate bar width with minimum visibility
// Uses log scale to compress the range while maintaining a minimum
const getBarWidth = (votes, maxVotes) => {
  if (votes === 0 || maxVotes === 0) return 8 // minimum width

  // Log scale to compress the huge range (1 to 1780)
  const logVotes = Math.log10(votes + 1)
  const logMax = Math.log10(maxVotes + 1)
  const percentage = (logVotes / logMax) * 100

  // Ensure minimum 8% width, maximum 100%
  return Math.max(8, Math.min(100, percentage))
}

export default function ContinentBreakdown({ selectedPoll = '2022', rankRange = 'all' }) {
  const [countriesData, setCountriesData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expandedContinent, setExpandedContinent] = useState(null)

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

  // Process data into continent groups
  const { continentData, totalVotes } = useMemo(() => {
    if (!countriesData) {
      return { continentData: [], totalVotes: 0 }
    }

    const continentGroups = {}
    let grandTotal = 0

    Object.entries(countriesData).forEach(([countryName, countryInfo]) => {
      if (countryName.startsWith('_')) return

      let votes = 0
      let distinctFilms = 0

      const pollData = countryInfo.byPoll[selectedPoll]
      if (pollData) {
        if (rankRange === 'all') {
          votes = pollData.total || 0
          distinctFilms = pollData.distinctFilms || 0
        } else if (rankRange === 'top100') {
          votes = pollData.top100 || 0
          distinctFilms = pollData.distinctFilmsTop100 || 0
        }
      }

      if (votes > 0) {
        const continent = countryInfo.continent
        if (!continentGroups[continent]) {
          continentGroups[continent] = {
            name: continent,
            countries: [],
            totalVotes: 0,
            color: continentColors[continent]
          }
        }
        continentGroups[continent].countries.push({
          name: countryName,
          votes: votes,
          distinctFilms: distinctFilms
        })
        continentGroups[continent].totalVotes += votes
        grandTotal += votes
      }
    })

    // Sort continents by total votes, and countries within each
    const sortedContinents = Object.values(continentGroups)
      .sort((a, b) => b.totalVotes - a.totalVotes)
      .map(continent => ({
        ...continent,
        countries: continent.countries.sort((a, b) => b.votes - a.votes),
        percentage: grandTotal > 0 ? (continent.totalVotes / grandTotal) * 100 : 0,
        maxCountryVotes: Math.max(...continent.countries.map(c => c.votes))
      }))

    return {
      continentData: sortedContinents,
      totalVotes: grandTotal
    }
  }, [countriesData, selectedPoll, rankRange])

  const handleCardClick = (continentName) => {
    setExpandedContinent(expandedContinent === continentName ? null : continentName)
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="p-4 border-2 border-gray-200 animate-pulse">
            <div className="h-4 bg-gray-200 mb-2"></div>
            <div className="h-8 bg-gray-200 mb-2"></div>
            <div className="h-3 bg-gray-200"></div>
          </div>
        ))}
      </div>
    )
  }

  if (!countriesData || !continentData.length) {
    return (
      <div className="text-center text-black font-medium py-8">
        No data available for selected filters
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Continent Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {continentData.map((continent) => {
          const isExpanded = expandedContinent === continent.name

          return (
            <button
              key={continent.name}
              onClick={() => handleCardClick(continent.name)}
              className={`
                p-3 border-2 border-black text-left transition-all duration-200
                hover:shadow-lg hover:-translate-y-0.5
                ${isExpanded ? 'ring-2 ring-offset-2 bg-gray-50' : 'bg-white'}
              `}
              style={{
                borderLeftColor: continent.color,
                borderLeftWidth: '4px',
                ringColor: continent.color
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs font-bold uppercase tracking-wide text-black truncate">
                  {continent.name}
                </div>
                <div
                  className="text-xs font-bold transition-transform duration-200"
                  style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  ▼
                </div>
              </div>
              <div className="text-xl font-black text-black">
                {continent.percentage.toFixed(1)}%
              </div>
              <div className="text-xs text-black font-medium">
                {continent.totalVotes.toLocaleString()} votes
              </div>
              <div className="text-xs text-gray-600">
                {continent.countries.length} {continent.countries.length === 1 ? 'country' : 'countries'}
              </div>
            </button>
          )
        })}
      </div>

      {/* Expanded Country Table */}
      {expandedContinent && (() => {
        const continent = continentData.find(c => c.name === expandedContinent)
        if (!continent) return null

        return (
          <div
            className="border-2 border-black bg-white overflow-hidden animate-in slide-in-from-top-2 duration-200"
            style={{ borderTopColor: continent.color, borderTopWidth: '4px' }}
          >
            {/* Header */}
            <div className="px-4 py-3 bg-gray-50 border-b-2 border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 border border-black"
                  style={{ backgroundColor: continent.color }}
                />
                <span className="font-black text-lg uppercase tracking-wide">
                  {continent.name}
                </span>
                <span className="text-sm text-gray-600 font-medium">
                  {continent.countries.length} countries • {continent.totalVotes.toLocaleString()} votes • {continent.percentage.toFixed(1)}% of total
                </span>
              </div>
              <button
                onClick={() => setExpandedContinent(null)}
                className="text-sm font-bold text-gray-500 hover:text-black px-2 py-1"
              >
                ✕ Close
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200 bg-gray-50">
                    <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wide text-gray-600 w-12">#</th>
                    <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wide text-gray-600">Country</th>
                    <th className="px-4 py-2 text-right text-xs font-bold uppercase tracking-wide text-gray-600 w-24">Votes</th>
                    <th className="px-4 py-2 text-right text-xs font-bold uppercase tracking-wide text-gray-600 w-24">% of {continent.name.split(' ')[0]}</th>
                    <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wide text-gray-600 w-48">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {continent.countries.map((country, index) => {
                    const percentOfContinent = (country.votes / continent.totalVotes) * 100
                    const barWidth = getBarWidth(country.votes, continent.maxCountryVotes)

                    return (
                      <tr
                        key={country.name}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-2 text-sm font-bold text-gray-400">
                          {index + 1}
                        </td>
                        <td className="px-4 py-2">
                          <span className="font-semibold text-black">{country.name}</span>
                          {country.distinctFilms > 0 && (
                            <span className="text-xs text-gray-500 ml-2">
                              ({country.distinctFilms} {country.distinctFilms === 1 ? 'film' : 'films'})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right font-bold text-black">
                          {country.votes.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-right text-sm font-medium text-gray-600">
                          {percentOfContinent.toFixed(1)}%
                        </td>
                        <td className="px-4 py-2">
                          <div className="w-full bg-gray-100 h-4 border border-gray-200">
                            <div
                              className="h-full transition-all duration-300"
                              style={{
                                width: `${barWidth}%`,
                                backgroundColor: continent.color
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer summary */}
            <div className="px-4 py-3 bg-gray-50 border-t-2 border-gray-200 text-sm text-gray-600">
              <span className="font-semibold">Total:</span> {continent.totalVotes.toLocaleString()} votes across {continent.countries.length} countries
              <span className="mx-2">•</span>
              <span className="font-semibold">Top country:</span> {continent.countries[0]?.name} ({((continent.countries[0]?.votes / continent.totalVotes) * 100).toFixed(1)}%)
            </div>
          </div>
        )
      })()}

      {/* Hint text when nothing expanded */}
      {!expandedContinent && (
        <div className="text-center text-sm text-gray-500 py-2">
          Click a continent card to see country breakdown
        </div>
      )}
    </div>
  )
}
