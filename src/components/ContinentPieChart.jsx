import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { pie, arc } from 'd3-shape'
import { interpolate } from 'd3-interpolate'

// Continent color mapping - matching the page's color scheme
const continentColors = {
  'Europe': '#3b82f6',        // blue-500
  'Asia': '#10b981',          // green-500
  'North America': '#8b5cf6', // purple-500
  'South America': '#f59e0b', // orange-500
  'Africa': '#ef4444',        // red-500
  'Oceania': '#ec4899',       // pink-500
}

// Lighter versions for country slices
const getCountryColor = (continent, index, total) => {
  const baseColor = continentColors[continent]
  // Create slight variations for countries within a continent
  const lightness = 0.85 + (index / total) * 0.15
  return adjustColorLightness(baseColor, lightness)
}

// Adjust hex color lightness
const adjustColorLightness = (hex, factor) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)

  const adjust = (c) => Math.min(255, Math.round(c * factor))

  return `rgb(${adjust(r)}, ${adjust(g)}, ${adjust(b)})`
}

// Darken color for hover effect
const darkenColor = (hex, amount = 0.15) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)

  const darken = (c) => Math.max(0, Math.round(c * (1 - amount)))

  return `rgb(${darken(r)}, ${darken(g)}, ${darken(b)})`
}

// Chart dimensions
const SIZE = 500
const CENTER = SIZE / 2

// Ring dimensions
const INNER_RING_INNER = 80
const INNER_RING_OUTER = 140
const OUTER_RING_INNER = 145
const OUTER_RING_OUTER = 220

// Zoomed state dimensions (when drilling into a continent)
const ZOOMED_INNER = 60
const ZOOMED_OUTER = 200

export default function ContinentPieChart({ selectedPoll = '2022', rankRange = 'all' }) {
  const [countriesData, setCountriesData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hoveredSlice, setHoveredSlice] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [selectedContinent, setSelectedContinent] = useState(null)
  const [animationProgress, setAnimationProgress] = useState(1)
  const containerRef = useRef(null)
  const animationRef = useRef(null)

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

  // Animate transitions
  const animateTo = useCallback((targetProgress, duration = 500) => {
    const startProgress = animationProgress
    const startTime = performance.now()

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const currentProgress = startProgress + (targetProgress - startProgress) * eased

      setAnimationProgress(currentProgress)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    animationRef.current = requestAnimationFrame(animate)
  }, [animationProgress])

  // Handle continent click for drill-down
  const handleContinentClick = useCallback((continent) => {
    if (selectedContinent === continent) {
      // Zoom out
      setSelectedContinent(null)
      animateTo(1, 400)
    } else {
      // Zoom in
      setSelectedContinent(continent)
      animateTo(0, 400)
    }
  }, [selectedContinent, animateTo])

  // Reset to overview
  const handleReset = useCallback(() => {
    setSelectedContinent(null)
    animateTo(1, 400)
  }, [animateTo])

  // Process data into hierarchical format
  const { continentData, countryData, totalVotes } = useMemo(() => {
    if (!countriesData) {
      return { continentData: [], countryData: [], totalVotes: 0 }
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
            totalVotes: 0
          }
        }
        continentGroups[continent].countries.push({
          name: countryName,
          votes: votes,
          continent: continent,
          distinctFilms: distinctFilms
        })
        continentGroups[continent].totalVotes += votes
        grandTotal += votes
      }
    })

    // Sort continents by total votes
    const sortedContinents = Object.values(continentGroups)
      .sort((a, b) => b.totalVotes - a.totalVotes)
      .map(continent => ({
        ...continent,
        countries: continent.countries.sort((a, b) => b.votes - a.votes),
        percentage: grandTotal > 0 ? (continent.totalVotes / grandTotal) * 100 : 0
      }))

    // Build flat country data for outer ring
    const countries = []
    sortedContinents.forEach(continent => {
      continent.countries.forEach((country, index) => {
        countries.push({
          ...country,
          continentTotal: continent.totalVotes,
          colorIndex: index,
          colorTotal: continent.countries.length,
          percentageOfContinent: (country.votes / continent.totalVotes) * 100,
          percentageOfTotal: grandTotal > 0 ? (country.votes / grandTotal) * 100 : 0
        })
      })
    })

    return {
      continentData: sortedContinents,
      countryData: countries,
      totalVotes: grandTotal
    }
  }, [countriesData, selectedPoll, rankRange])

  // Create pie generators
  const pieGenerator = useMemo(() => {
    return pie()
      .value(d => d.totalVotes || d.votes)
      .sort(null) // Keep original order
      .padAngle(0.02)
  }, [])

  // Generate arcs for continents (inner ring)
  const continentArcs = useMemo(() => {
    if (!continentData.length) return []

    const arcGenerator = arc()
      .innerRadius(INNER_RING_INNER)
      .outerRadius(INNER_RING_OUTER)
      .cornerRadius(4)

    return pieGenerator(continentData).map((d, i) => ({
      ...d,
      path: arcGenerator(d),
      arcGenerator,
      color: continentColors[d.data.name],
      centroid: arcGenerator.centroid(d)
    }))
  }, [continentData, pieGenerator])

  // Generate arcs for countries (outer ring)
  const countryArcs = useMemo(() => {
    if (!countryData.length) return []

    const arcGenerator = arc()
      .innerRadius(OUTER_RING_INNER)
      .outerRadius(OUTER_RING_OUTER)
      .cornerRadius(2)

    return pieGenerator(countryData).map((d, i) => ({
      ...d,
      path: arcGenerator(d),
      arcGenerator,
      color: getCountryColor(d.data.continent, d.data.colorIndex, d.data.colorTotal),
      centroid: arcGenerator.centroid(d)
    }))
  }, [countryData, pieGenerator])

  // Generate zoomed arcs for selected continent
  const zoomedArcs = useMemo(() => {
    if (!selectedContinent || !continentData.length) return []

    const continent = continentData.find(c => c.name === selectedContinent)
    if (!continent) return []

    const zoomedPie = pie()
      .value(d => d.votes)
      .sort(null)
      .padAngle(0.02)

    const arcGenerator = arc()
      .innerRadius(ZOOMED_INNER)
      .outerRadius(ZOOMED_OUTER)
      .cornerRadius(4)

    return zoomedPie(continent.countries).map((d, i) => ({
      ...d,
      path: arcGenerator(d),
      arcGenerator,
      color: getCountryColor(selectedContinent, i, continent.countries.length),
      centroid: arcGenerator.centroid(d)
    }))
  }, [selectedContinent, continentData])

  // Handle mouse events
  const handleMouseMove = (e, slice) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) {
      setMousePos({ x: e.clientX, y: e.clientY })
    }
    setHoveredSlice(slice)
  }

  const handleMouseLeave = () => {
    setHoveredSlice(null)
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-black h-[500px] flex items-center justify-center">
        <div className="text-center text-black font-medium">
          Loading visualization...
        </div>
      </div>
    )
  }

  if (!countriesData || !continentData.length) {
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
      {/* Continental Distribution Bar */}
      <div className="mb-6">
        <div className="text-sm font-bold text-black mb-2 uppercase tracking-wide">Continental Distribution</div>
        <div className="flex h-8 border-2 border-black overflow-hidden">
          {continentData.map((continent) => {
            const percentage = continent.percentage
            if (percentage < 0.5) return null

            let label = ''
            if (percentage >= 8) {
              label = `${continent.name} ${percentage.toFixed(1)}%`
            } else if (percentage >= 4) {
              const abbrev = {
                'Europe': 'EU',
                'Asia': 'AS',
                'North America': 'NA',
                'South America': 'SA',
                'Africa': 'AF',
                'Oceania': 'OC'
              }
              label = `${abbrev[continent.name] || continent.name.substring(0, 2)} ${percentage.toFixed(1)}%`
            } else if (percentage >= 2) {
              label = `${percentage.toFixed(1)}%`
            }

            return (
              <div
                key={continent.name}
                className="flex items-center justify-center text-white text-xs font-semibold overflow-hidden cursor-pointer transition-all hover:brightness-110"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: continentColors[continent.name],
                  minWidth: percentage >= 0.5 ? '4px' : '0'
                }}
                onClick={() => handleContinentClick(continent.name)}
                title={`${continent.name}: ${continent.totalVotes.toLocaleString()} votes (${percentage.toFixed(1)}%)`}
              >
                {label}
              </div>
            )
          })}
        </div>
      </div>

      {/* Main Sunburst Chart */}
      <div className="relative">
        {/* Breadcrumb / Back button when zoomed */}
        {selectedContinent && (
          <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 bg-white border-2 border-black text-black font-bold text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              <span>←</span>
              <span>All Continents</span>
            </button>
            <div
              className="px-3 py-1.5 text-white font-bold text-sm border-2 border-black"
              style={{ backgroundColor: continentColors[selectedContinent] }}
            >
              {selectedContinent}
            </div>
          </div>
        )}

        <div
          ref={containerRef}
          className="border-2 border-black bg-gradient-to-br from-gray-50 to-white relative overflow-hidden"
          style={{ height: '500px' }}
          onMouseLeave={handleMouseLeave}
        >
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* Gradient definitions for each continent */}
              {Object.entries(continentColors).map(([name, color]) => (
                <radialGradient key={name} id={`gradient-${name.replace(/\s/g, '')}`} cx="30%" cy="30%">
                  <stop offset="0%" stopColor={adjustColorLightness(color, 1.3)} />
                  <stop offset="100%" stopColor={color} />
                </radialGradient>
              ))}

              {/* Drop shadow filter */}
              <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3"/>
              </filter>

              {/* Glow filter for hover */}
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            <g transform={`translate(${CENTER}, ${CENTER})`}>
              {/* Overview mode: show both rings */}
              {!selectedContinent && (
                <>
                  {/* Outer ring: Countries */}
                  <g className="country-ring" style={{ opacity: animationProgress }}>
                    {countryArcs.map((arcData, i) => {
                      const isHovered = hoveredSlice?.type === 'country' &&
                                       hoveredSlice?.data?.name === arcData.data.name
                      const isContinentHovered = hoveredSlice?.type === 'continent' &&
                                                 hoveredSlice?.data?.name === arcData.data.continent

                      return (
                        <path
                          key={`country-${i}`}
                          d={arcData.path}
                          fill={arcData.color}
                          stroke="#000"
                          strokeWidth={isHovered ? 2 : 0.5}
                          style={{
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            filter: isHovered ? 'url(#glow)' : 'none',
                            opacity: isContinentHovered ? 1 : (hoveredSlice?.type === 'continent' ? 0.4 : 1),
                            transform: isHovered ? 'scale(1.03)' : 'scale(1)',
                            transformOrigin: 'center'
                          }}
                          onMouseMove={(e) => handleMouseMove(e, { type: 'country', data: arcData.data, arc: arcData })}
                          onMouseLeave={handleMouseLeave}
                        />
                      )
                    })}
                  </g>

                  {/* Inner ring: Continents */}
                  <g className="continent-ring" style={{ filter: 'url(#dropShadow)' }}>
                    {continentArcs.map((arcData, i) => {
                      const isHovered = hoveredSlice?.type === 'continent' &&
                                       hoveredSlice?.data?.name === arcData.data.name

                      return (
                        <g key={`continent-${i}`}>
                          <path
                            d={arcData.path}
                            fill={`url(#gradient-${arcData.data.name.replace(/\s/g, '')})`}
                            stroke="#000"
                            strokeWidth={isHovered ? 3 : 1.5}
                            style={{
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                              transformOrigin: 'center'
                            }}
                            onMouseMove={(e) => handleMouseMove(e, { type: 'continent', data: arcData.data, arc: arcData })}
                            onMouseLeave={handleMouseLeave}
                            onClick={() => handleContinentClick(arcData.data.name)}
                          />

                          {/* Continent labels */}
                          {arcData.data.percentage > 5 && (
                            <text
                              x={arcData.centroid[0] * 0.85}
                              y={arcData.centroid[1] * 0.85}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fill="#fff"
                              fontSize="11"
                              fontWeight="bold"
                              style={{
                                pointerEvents: 'none',
                                textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                              }}
                            >
                              {arcData.data.percentage >= 10
                                ? arcData.data.name.split(' ')[0]
                                : arcData.data.name.substring(0, 2)}
                            </text>
                          )}
                        </g>
                      )
                    })}
                  </g>

                  {/* Center text */}
                  <g className="center-text">
                    <circle r="75" fill="white" stroke="#000" strokeWidth="2"/>
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      y="-15"
                      fontSize="14"
                      fontWeight="bold"
                      fill="#000"
                      className="uppercase tracking-wide"
                    >
                      Total Votes
                    </text>
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      y="12"
                      fontSize="28"
                      fontWeight="900"
                      fill="#000"
                    >
                      {totalVotes.toLocaleString()}
                    </text>
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      y="35"
                      fontSize="10"
                      fill="#666"
                    >
                      Click continent to zoom
                    </text>
                  </g>
                </>
              )}

              {/* Zoomed mode: show single continent's countries */}
              {selectedContinent && (
                <>
                  <g className="zoomed-ring" style={{ opacity: 1 - animationProgress + 0.3 }}>
                    {zoomedArcs.map((arcData, i) => {
                      const isHovered = hoveredSlice?.type === 'zoomed-country' &&
                                       hoveredSlice?.data?.name === arcData.data.name

                      // Calculate label position
                      const angle = (arcData.startAngle + arcData.endAngle) / 2
                      const labelRadius = ZOOMED_OUTER + 15
                      const labelX = Math.sin(angle) * labelRadius
                      const labelY = -Math.cos(angle) * labelRadius
                      const arcSpan = arcData.endAngle - arcData.startAngle
                      const showLabel = arcSpan > 0.15 // Show label if arc is big enough

                      return (
                        <g key={`zoomed-${i}`}>
                          <path
                            d={arcData.path}
                            fill={arcData.color}
                            stroke="#000"
                            strokeWidth={isHovered ? 3 : 1}
                            style={{
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              filter: isHovered ? 'url(#glow)' : 'none',
                              transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                              transformOrigin: 'center'
                            }}
                            onMouseMove={(e) => handleMouseMove(e, { type: 'zoomed-country', data: arcData.data, arc: arcData })}
                            onMouseLeave={handleMouseLeave}
                          />

                          {/* Country labels for larger slices */}
                          {showLabel && (
                            <text
                              x={arcData.centroid[0] * 1.1}
                              y={arcData.centroid[1] * 1.1}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fill="#000"
                              fontSize={arcSpan > 0.4 ? "11" : "9"}
                              fontWeight="bold"
                              style={{
                                pointerEvents: 'none',
                                textShadow: '-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff'
                              }}
                            >
                              {arcSpan > 0.3
                                ? (arcData.data.name.length > 12
                                    ? arcData.data.name.substring(0, 10) + '…'
                                    : arcData.data.name)
                                : arcData.data.name.substring(0, 3)}
                            </text>
                          )}
                        </g>
                      )
                    })}
                  </g>

                  {/* Center - Continent info */}
                  <g className="center-text">
                    <circle r="55" fill={continentColors[selectedContinent]} stroke="#000" strokeWidth="2"/>
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      y="-12"
                      fontSize="14"
                      fontWeight="bold"
                      fill="#fff"
                      className="uppercase"
                    >
                      {selectedContinent.split(' ')[0]}
                    </text>
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      y="10"
                      fontSize="11"
                      fill="#fff"
                    >
                      {continentData.find(c => c.name === selectedContinent)?.countries.length} countries
                    </text>
                  </g>
                </>
              )}
            </g>
          </svg>

          {/* Tooltip */}
          {hoveredSlice && (() => {
            const containerRect = containerRef.current?.getBoundingClientRect()
            if (!containerRect) return null

            const tooltipWidth = 200
            const tooltipHeight = hoveredSlice.type === 'continent' ? 120 : 160
            const offset = 15

            const isRightHalf = mousePos.x > window.innerWidth / 2
            let tooltipX = isRightHalf ? mousePos.x - tooltipWidth - offset : mousePos.x + offset

            const containerMidY = containerRect.top + containerRect.height / 2
            const isBottomHalf = mousePos.y > containerMidY
            let tooltipY = isBottomHalf ? mousePos.y - tooltipHeight - offset : mousePos.y + offset

            const minY = containerRect.top
            const maxY = containerRect.bottom - tooltipHeight
            tooltipY = Math.max(minY, Math.min(maxY, tooltipY))

            if (hoveredSlice.type === 'continent') {
              return (
                <div
                  className="fixed pointer-events-none bg-white p-4 border-2 border-black shadow-xl z-50"
                  style={{
                    left: tooltipX,
                    top: tooltipY,
                    width: tooltipWidth,
                    transition: 'left 0.08s ease-out, top 0.08s ease-out'
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-4 h-4 border border-black"
                      style={{ backgroundColor: continentColors[hoveredSlice.data.name] }}
                    />
                    <p className="font-black text-lg text-black uppercase tracking-wide">
                      {hoveredSlice.data.name}
                    </p>
                  </div>
                  <p className="text-2xl font-black text-black">
                    {hoveredSlice.data.totalVotes.toLocaleString()} votes
                  </p>
                  <p className="text-sm text-black font-semibold">
                    {hoveredSlice.data.percentage.toFixed(1)}% of total
                  </p>
                  <p className="text-sm text-gray-600 font-medium">
                    {hoveredSlice.data.countries.length} countries
                  </p>
                  <p className="text-xs text-gray-500 mt-2 italic">
                    Click to zoom in
                  </p>
                </div>
              )
            } else {
              const data = hoveredSlice.data
              return (
                <div
                  className="fixed pointer-events-none bg-white p-4 border-2 border-black shadow-xl z-50"
                  style={{
                    left: tooltipX,
                    top: tooltipY,
                    width: tooltipWidth,
                    transition: 'left 0.08s ease-out, top 0.08s ease-out'
                  }}
                >
                  <p className="font-black text-lg text-black uppercase tracking-wide">
                    {data.name}
                  </p>
                  <div
                    className="text-xs font-semibold mb-2 px-2 py-0.5 inline-block text-white"
                    style={{ backgroundColor: continentColors[data.continent] }}
                  >
                    {data.continent}
                  </div>
                  <p className="text-2xl font-black text-black">
                    {data.votes.toLocaleString()} votes
                  </p>
                  <p className="text-sm text-black font-semibold">
                    {data.percentageOfContinent?.toFixed(1) || ((data.votes / data.continentTotal) * 100).toFixed(1)}% of {data.continent}
                  </p>
                  <p className="text-sm text-black font-medium">
                    {data.percentageOfTotal?.toFixed(1) || ((data.votes / totalVotes) * 100).toFixed(1)}% of total
                  </p>
                  {data.distinctFilms > 0 && (
                    <p className="text-sm text-gray-600 mt-1 pt-1 border-t border-gray-200">
                      {data.distinctFilms} distinct films
                    </p>
                  )}
                </div>
              )
            }
          })()}
        </div>
      </div>

      {/* Statistics Summary */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 text-center">
        {continentData.map((continent) => (
          <div
            key={continent.name}
            className={`p-2 border-2 border-black cursor-pointer transition-all hover:shadow-lg ${
              selectedContinent === continent.name ? 'ring-2 ring-offset-2' : ''
            }`}
            style={{
              borderLeftColor: continentColors[continent.name],
              borderLeftWidth: '4px',
              ringColor: continentColors[continent.name]
            }}
            onClick={() => handleContinentClick(continent.name)}
          >
            <div className="text-xs font-bold uppercase tracking-wide text-black">
              {continent.name}
            </div>
            <div className="text-lg font-black text-black">
              {continent.percentage.toFixed(1)}%
            </div>
            <div className="text-xs text-black font-medium">
              {continent.totalVotes.toLocaleString()} votes
            </div>
            <div className="text-xs text-gray-600">
              {continent.countries.length} countries
            </div>
          </div>
        ))}
      </div>

      {/* Interactive hint */}
      <div className="mt-4 text-center text-sm text-gray-500">
        <span className="font-medium">Tip:</span> Click on a continent slice or stat card to zoom in and see country breakdown
      </div>
    </div>
  )
}
