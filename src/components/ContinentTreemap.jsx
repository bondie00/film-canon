import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { hierarchy, pack } from 'd3-hierarchy'

// Continent color mapping - matching the page's color scheme
const continentColors = {
  'Europe': '#3b82f6',        // blue-500
  'Asia': '#10b981',          // green-500
  'North America': '#8b5cf6', // purple-500
  'South America': '#f59e0b', // orange-500
  'Africa': '#ef4444',        // red-500
  'Oceania': '#ec4899',       // pink-500
}

// Lighter/translucent versions for continent background circles
const continentColorsLight = {
  'Europe': 'rgba(59, 130, 246, 0.15)',
  'Asia': 'rgba(16, 185, 129, 0.15)',
  'North America': 'rgba(139, 92, 246, 0.15)',
  'South America': 'rgba(245, 158, 11, 0.15)',
  'Africa': 'rgba(239, 68, 68, 0.15)',
  'Oceania': 'rgba(236, 72, 153, 0.15)',
}

// Base dimensions for the visualization
const BASE_WIDTH = 900
const BASE_HEIGHT = 500

export default function ContinentTreemap({ selectedPoll = '2022', rankRange = 'all' }) {
  const [countriesData, setCountriesData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hoveredNode, setHoveredNode] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const containerRef = useRef(null)
  const svgRef = useRef(null)

  // Zoom and pan state
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

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

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom(z => Math.min(z * 1.4, 8))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom(z => Math.max(z / 1.4, 1))
  }, [])

  const handleReset = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  // Drag handlers for panning
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return // Only left click
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
    setPanStart({ x: pan.x, y: pan.y })
  }, [pan])

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      const dx = e.clientX - dragStart.x
      const dy = e.clientY - dragStart.y
      // Scale the drag by zoom level for consistent feel
      setPan({
        x: panStart.x + dx / zoom,
        y: panStart.y + dy / zoom
      })
    }
  }, [isDragging, dragStart, panStart, zoom])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Prevent scroll wheel zoom
  const handleWheel = useCallback((e) => {
    e.stopPropagation()
  }, [])

  // Transform data into hierarchical format and compute circle packing
  const { packedData, totalVotes, continentTotals, continentPercentages, continentData } = useMemo(() => {
    if (!countriesData) {
      return { packedData: null, totalVotes: 0, continentTotals: {}, continentPercentages: {}, continentData: [] }
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
          value: votes,
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

    // Create hierarchical data structure for D3
    const hierarchyData = {
      name: 'root',
      children: sortedContinents
    }

    // Create the pack layout
    const padding = 3

    const root = hierarchy(hierarchyData)
      .sum(d => d.value || 0)
      .sort((a, b) => b.value - a.value)

    const packLayout = pack()
      .size([BASE_WIDTH, BASE_HEIGHT])
      .padding(padding)

    const packed = packLayout(root)

    return {
      packedData: packed,
      totalVotes: grandTotal,
      continentTotals: totals,
      continentPercentages: percentages,
      continentData: sortedContinents
    }
  }, [countriesData, selectedPoll, rankRange])

  const handleNodeMouseMove = (e, node) => {
    if (isDragging) return // Don't show tooltip while dragging
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }
    setHoveredNode(node)
  }

  const handleNodeMouseLeave = () => {
    setHoveredNode(null)
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

  if (!countriesData || !packedData) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-black h-[500px] flex items-center justify-center">
        <div className="text-center text-black font-medium">
          No data available for selected filters
        </div>
      </div>
    )
  }

  // Get all nodes from the packed layout
  const allNodes = packedData.descendants()
  const continentNodes = allNodes.filter(d => d.depth === 1)
  const countryNodes = allNodes.filter(d => d.depth === 2)

  // Calculate viewBox based on zoom and pan
  const viewBoxWidth = BASE_WIDTH / zoom
  const viewBoxHeight = BASE_HEIGHT / zoom
  const viewBoxX = (BASE_WIDTH - viewBoxWidth) / 2 - pan.x
  const viewBoxY = (BASE_HEIGHT - viewBoxHeight) / 2 - pan.y
  const viewBox = `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`

  return (
    <div>
      {/* Continental Distribution Bar - Dynamic */}
      <div className="mb-6">
        <div className="text-sm font-bold text-black mb-2 uppercase tracking-wide">Continental Distribution</div>
        <div className="flex h-8 border-2 border-black overflow-hidden">
          {continentData.map((continent) => {
            const percentage = parseFloat(continentPercentages[continent.name])
            if (percentage < 0.5) return null

            let label = ''
            if (percentage >= 8) {
              label = `${continent.name} ${percentage}%`
            } else if (percentage >= 4) {
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

      {/* Circle Packing Visualization */}
      <div className="relative">
        {/* Zoom Controls */}
        <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
          <button
            onClick={handleZoomIn}
            disabled={zoom >= 8}
            className="w-8 h-8 bg-white border-2 border-black text-black font-bold hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            title="Zoom in"
          >
            +
          </button>
          <button
            onClick={handleZoomOut}
            disabled={zoom <= 1}
            className="w-8 h-8 bg-white border-2 border-black text-black font-bold hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            title="Zoom out"
          >
            −
          </button>
          {(zoom !== 1 || pan.x !== 0 || pan.y !== 0) && (
            <button
              onClick={handleReset}
              className="w-8 h-8 bg-white border-2 border-black text-black font-bold hover:bg-gray-100 flex items-center justify-center text-xs"
              title="Reset view"
            >
              ⟲
            </button>
          )}
        </div>

        <div
          ref={containerRef}
          className="border-2 border-black bg-gray-50 relative overflow-hidden"
          style={{
            height: '500px',
            cursor: isDragging ? 'grabbing' : (zoom > 1 ? 'grab' : 'default')
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            handleMouseUp()
            handleNodeMouseLeave()
          }}
          onWheel={handleWheel}
        >
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox={viewBox}
            preserveAspectRatio="xMidYMid meet"
            style={{ transition: isDragging ? 'none' : 'viewBox 0.15s ease-out' }}
          >
            {/* Continent circles (background) */}
            {continentNodes.map((node, i) => (
              <g key={`continent-${i}`}>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.r}
                  fill={continentColorsLight[node.data.name]}
                  stroke={continentColors[node.data.name]}
                  strokeWidth={2 / zoom}
                  strokeDasharray={`${4 / zoom} ${2 / zoom}`}
                />
                {/* Continent label at top of circle */}
                {node.r > 40 && (
                  <text
                    x={node.x}
                    y={node.y - node.r + 16 / zoom}
                    textAnchor="middle"
                    fill={continentColors[node.data.name]}
                    fontSize={11 / Math.max(zoom * 0.7, 1)}
                    fontWeight="700"
                    style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  >
                    {node.data.name}
                  </text>
                )}
              </g>
            ))}

            {/* Country circles */}
            {countryNodes.map((node, i) => {
              const isHovered = hoveredNode && hoveredNode.data.name === node.data.name
              const color = continentColors[node.data.continent]

              // Adjust label visibility based on zoom
              const effectiveRadius = node.r * zoom
              const showLabel = effectiveRadius > 18
              const showAbbrev = effectiveRadius > 10 && effectiveRadius <= 18

              let displayName = ''
              if (showLabel) {
                const maxChars = Math.floor((node.r * zoom) / 4)
                displayName = node.data.name.length > maxChars
                  ? node.data.name.substring(0, maxChars - 1) + '…'
                  : node.data.name
              } else if (showAbbrev) {
                displayName = node.data.name.substring(0, 2)
              }

              return (
                <g
                  key={`country-${i}`}
                  onMouseMove={(e) => !isDragging && handleNodeMouseMove(e, node)}
                  onMouseLeave={handleNodeMouseLeave}
                  style={{ cursor: isDragging ? 'grabbing' : 'pointer' }}
                >
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.r}
                    fill={color}
                    stroke={isHovered ? '#000000' : '#ffffff'}
                    strokeWidth={(isHovered ? 3 : 1.5) / zoom}
                    style={{
                      transition: 'stroke-width 0.15s ease',
                      filter: isHovered ? 'brightness(1.1)' : 'none'
                    }}
                  />
                  {displayName && (
                    <text
                      x={node.x}
                      y={node.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#ffffff"
                      fontSize={Math.min(11, (node.r * zoom) / 3) / zoom}
                      fontWeight="600"
                      style={{
                        pointerEvents: 'none',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                      }}
                    >
                      {displayName}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>

          {/* Custom Tooltip */}
          {hoveredNode && hoveredNode.depth === 2 && !isDragging && (
            <div
              className="absolute pointer-events-none bg-white p-3 border-2 border-black shadow-lg z-10"
              style={{
                left: tooltipPos.x + 15,
                top: tooltipPos.y - 10,
                maxWidth: '220px',
                transform: tooltipPos.x > 600 ? 'translateX(-100%)' : 'none'
              }}
            >
              <p className="font-bold text-base text-black uppercase tracking-wide">
                {hoveredNode.data.name}
              </p>
              <div
                className="text-xs font-semibold mb-1 px-1.5 py-0.5 inline-block text-white"
                style={{ backgroundColor: continentColors[hoveredNode.data.continent] }}
              >
                {hoveredNode.data.continent}
              </div>
              <p className="text-xl font-black text-black my-1">
                {hoveredNode.data.votes.toLocaleString()} votes
              </p>
              <p className="text-xs text-black font-medium">
                {((hoveredNode.data.votes / continentTotals[hoveredNode.data.continent]) * 100).toFixed(1)}% of {hoveredNode.data.continent}
              </p>
              <p className="text-xs text-black font-medium">
                {((hoveredNode.data.votes / totalVotes) * 100).toFixed(1)}% of total
              </p>
              {hoveredNode.data.distinctFilms > 0 && (
                <p className="text-xs text-black font-medium mt-1 pt-1 border-t border-gray-200">
                  {hoveredNode.data.distinctFilms} distinct films
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Statistics Summary */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 text-center">
        {continentData.map((continent) => (
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
