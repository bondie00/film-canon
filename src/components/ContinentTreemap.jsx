import { useState, useMemo, useEffect } from 'react'
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts'

// Continent color mapping - matching the page's color scheme
const continentColors = {
  'Europe': '#3b82f6',        // blue-500
  'Asia': '#10b981',          // green-500
  'North America': '#8b5cf6', // purple-500
  'South America': '#f59e0b', // orange-500
  'Africa': '#ef4444',        // red-500
  'Oceania': '#ec4899',       // pink-500
}

// Lighter shades for variation within continents
const continentColorsLight = {
  'Europe': '#60a5fa',        // blue-400
  'Asia': '#34d399',          // green-400
  'North America': '#a78bfa', // purple-400
  'South America': '#fbbf24', // yellow-400
  'Africa': '#f87171',        // red-400
  'Oceania': '#f472b6',       // pink-400
}

// Custom content renderer for treemap cells
const CustomTreemapContent = (props) => {
  const { x, y, width, height, name, continent, depth, root } = props

  // Skip rendering if dimensions are too small
  if (width < 2 || height < 2) return null

  // depth 1 = continent level (we don't render these as visible rectangles)
  // depth 2 = country level
  if (depth === 1) {
    return null
  }

  const color = continentColors[continent] || '#6b7280'

  // Determine if we should show text based on cell size
  const showFullName = width > 60 && height > 30
  const showAbbreviation = width > 30 && height > 20 && !showFullName

  // Truncate name if needed
  const getDisplayName = () => {
    if (!showFullName && !showAbbreviation) return ''
    if (showFullName) {
      const maxChars = Math.floor(width / 8)
      return name.length > maxChars ? name.substring(0, maxChars - 2) + '...' : name
    }
    // Abbreviation: first 3 chars
    return name.substring(0, 3)
  }

  const displayName = getDisplayName()

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        stroke="#000000"
        strokeWidth={1}
      />
      {displayName && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#ffffff"
          fontSize={showFullName ? 11 : 9}
          fontWeight="600"
          style={{
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
            pointerEvents: 'none'
          }}
        >
          {displayName}
        </text>
      )}
    </g>
  )
}

// Custom tooltip component
const CustomTreemapTooltip = ({ active, payload, totalVotes, continentTotals }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload

    // Skip tooltip for root/continent nodes
    if (!data.continent || data.depth === 1) return null

    const continentTotal = continentTotals[data.continent] || 0
    const percentOfContinent = continentTotal > 0
      ? ((data.votes / continentTotal) * 100).toFixed(1)
      : 0
    const percentOfTotal = totalVotes > 0
      ? ((data.votes / totalVotes) * 100).toFixed(1)
      : 0

    return (
      <div className="bg-white p-3 border-2 border-black shadow-lg max-w-[220px]">
        <p className="font-bold text-base text-black uppercase tracking-wide">{data.name}</p>
        <div
          className="text-xs font-semibold mb-1 px-1.5 py-0.5 inline-block text-white"
          style={{ backgroundColor: continentColors[data.continent] }}
        >
          {data.continent}
        </div>
        <p className="text-xl font-black text-black my-1">
          {data.votes.toLocaleString()} votes
        </p>
        <p className="text-xs text-black font-medium">
          {percentOfContinent}% of {data.continent}
        </p>
        <p className="text-xs text-black font-medium">
          {percentOfTotal}% of total
        </p>
        {data.distinctFilms > 0 && (
          <p className="text-xs text-black font-medium mt-1 pt-1 border-t border-gray-200">
            {data.distinctFilms} distinct films
          </p>
        )}
      </div>
    )
  }
  return null
}

export default function ContinentTreemap({ selectedPoll = '2022', rankRange = 'all' }) {
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

  // Transform data into hierarchical treemap format
  const { treemapData, totalVotes, continentTotals, continentPercentages } = useMemo(() => {
    if (!countriesData) {
      return { treemapData: [], totalVotes: 0, continentTotals: {}, continentPercentages: {} }
    }

    // Group countries by continent with their vote counts
    const continentGroups = {}
    let grandTotal = 0

    Object.entries(countriesData).forEach(([countryName, countryInfo]) => {
      // Skip metadata keys
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
            children: [],
            totalVotes: 0
          }
        }
        continentGroups[continent].children.push({
          name: countryName,
          size: votes,
          votes: votes,
          continent: continent,
          distinctFilms: distinctFilms
        })
        continentGroups[continent].totalVotes += votes
        grandTotal += votes
      }
    })

    // Sort continents by total votes and countries within each continent
    const sortedContinents = Object.values(continentGroups)
      .sort((a, b) => b.totalVotes - a.totalVotes)
      .map(continent => ({
        ...continent,
        children: continent.children.sort((a, b) => b.votes - a.votes)
      }))

    // Calculate continent totals and percentages
    const totals = {}
    const percentages = {}
    sortedContinents.forEach(continent => {
      totals[continent.name] = continent.totalVotes
      percentages[continent.name] = grandTotal > 0
        ? ((continent.totalVotes / grandTotal) * 100).toFixed(1)
        : 0
    })

    return {
      treemapData: sortedContinents,
      totalVotes: grandTotal,
      continentTotals: totals,
      continentPercentages: percentages
    }
  }, [countriesData, selectedPoll, rankRange])

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-black h-[500px] flex items-center justify-center">
        <div className="text-center text-black font-medium">
          Loading treemap data...
        </div>
      </div>
    )
  }

  if (!countriesData || treemapData.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-black h-[500px] flex items-center justify-center">
        <div className="text-center text-black font-medium">
          No data available for selected filters
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Continental Distribution Bar - Dynamic */}
      <div className="mb-6">
        <div className="text-sm font-bold text-black mb-2 uppercase tracking-wide">Continental Distribution</div>
        <div className="flex h-8 border-2 border-black overflow-hidden">
          {treemapData.map((continent) => {
            const percentage = parseFloat(continentPercentages[continent.name])
            if (percentage < 0.5) return null // Don't show tiny segments

            // Determine label based on available space
            let label = ''
            if (percentage >= 8) {
              label = `${continent.name} ${percentage}%`
            } else if (percentage >= 4) {
              // Abbreviate continent names for smaller segments
              const abbrev = {
                'Europe': 'EU',
                'Asia': 'AS',
                'North America': 'NA',
                'South America': 'SA',
                'Africa': 'AF',
                'Oceania': 'OC'
              }
              label = `${abbrev[continent.name] || continent.name.substring(0, 2)} ${percentage}%`
            } else if (percentage >= 2) {
              label = `${percentage}%`
            }

            return (
              <div
                key={continent.name}
                className="flex items-center justify-center text-white text-xs font-semibold overflow-hidden"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: continentColors[continent.name],
                  minWidth: percentage >= 0.5 ? '4px' : '0'
                }}
                title={`${continent.name}: ${continent.totalVotes.toLocaleString()} votes (${percentage}%)`}
              >
                {label}
              </div>
            )
          })}
        </div>
      </div>

      {/* Treemap Visualization */}
      <div className="border-2 border-black">
        <ResponsiveContainer width="100%" height={500}>
          <Treemap
            data={treemapData}
            dataKey="size"
            aspectRatio={4/3}
            stroke="#000000"
            strokeWidth={1}
            content={<CustomTreemapContent />}
          >
            <Tooltip
              content={
                <CustomTreemapTooltip
                  totalVotes={totalVotes}
                  continentTotals={continentTotals}
                />
              }
            />
          </Treemap>
        </ResponsiveContainer>
      </div>

      {/* Statistics Summary */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 text-center">
        {treemapData.map((continent) => (
          <div
            key={continent.name}
            className="p-2 border-2 border-black"
            style={{ borderLeftColor: continentColors[continent.name], borderLeftWidth: '4px' }}
          >
            <div className="text-xs font-bold uppercase tracking-wide text-black">
              {continent.name}
            </div>
            <div className="text-lg font-black text-black">
              {continentPercentages[continent.name]}%
            </div>
            <div className="text-xs text-black font-medium">
              {continent.totalVotes.toLocaleString()} votes
            </div>
            <div className="text-xs text-gray-600">
              {continent.children.length} countries
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
