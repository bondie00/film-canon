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

// Initial zoom to fill the space better
const INITIAL_ZOOM = 1.15

// Calculate pan limits based on content bounds and zoom level
// Allows panning until the last circle is almost off the visible area
//
// How the transform works:
//   translate(CENTER) scale(zoom) translate(-CENTER + pan)
//
// For SVG point (x, y), screen position is:
//   screenX = CENTER + zoom * (x - CENTER + pan.x)
//
// Visible SVG region when panning:
//   visibleLeft  = CENTER - halfViewport - pan.x
//   visibleRight = CENTER + halfViewport - pan.x
//
// Pan limits allow content edge to reach opposite viewport edge:
// - minX: rightmost content (maxX) can reach left viewport edge (when content is shifted left)
// - maxX: leftmost content (minX) can reach right viewport edge (when content is shifted right)
const getPanLimits = (contentBounds, zoomLevel) => {
  if (!contentBounds) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 }
  }

  const centerX = BASE_WIDTH / 2
  const centerY = BASE_HEIGHT / 2
  const halfViewportW = BASE_WIDTH / (2 * zoomLevel)
  const halfViewportH = BASE_HEIGHT / (2 * zoomLevel)

  return {
    minX: centerX - halfViewportW - contentBounds.maxX,  // rightmost content at left edge
    maxX: centerX + halfViewportW - contentBounds.minX,  // leftmost content at right edge
    minY: centerY - halfViewportH - contentBounds.maxY,  // bottommost content at top edge
    maxY: centerY + halfViewportH - contentBounds.minY   // topmost content at bottom edge
  }
}

// Clamp pan values to stay within content-based boundaries
const clampPan = (panValue, zoomLevel, contentBounds) => {
  const limits = getPanLimits(contentBounds, zoomLevel)
  return {
    x: Math.max(limits.minX, Math.min(limits.maxX, panValue.x)),
    y: Math.max(limits.minY, Math.min(limits.maxY, panValue.y))
  }
}

export default function ContinentTreemap({ selectedPoll = '2022', rankRange = 'all' }) {
  const [countriesData, setCountriesData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hoveredNode, setHoveredNode] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const contentBoundsRef = useRef(null)

  // Zoom and pan state - start slightly zoomed in
  const [zoom, setZoom] = useState(INITIAL_ZOOM)
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

  // Zoom controls with smooth transitions
  const handleZoomIn = useCallback(() => {
    setZoom(z => {
      const newZoom = Math.min(z * 1.4, 8)
      // Clamp pan for new zoom level
      setPan(p => clampPan(p, newZoom, contentBoundsRef.current))
      return newZoom
    })
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom(z => {
      const newZoom = Math.max(z / 1.4, 1)
      // Clamp pan for new zoom level
      setPan(p => clampPan(p, newZoom, contentBoundsRef.current))
      return newZoom
    })
  }, [])

  const handleReset = useCallback(() => {
    setZoom(INITIAL_ZOOM)
    setPan({ x: 0, y: 0 })
  }, [])

  // Double-click to zoom in centered on click location
  const handleDoubleClick = useCallback((e) => {
    e.preventDefault()
    if (zoom >= 8) return

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    // Get click position relative to container center, scaled to SVG coordinates
    const clickX = e.clientX - rect.left - rect.width / 2
    const clickY = e.clientY - rect.top - rect.height / 2
    const scaleX = BASE_WIDTH / rect.width
    const scaleY = BASE_HEIGHT / rect.height
    const svgClickX = clickX * scaleX
    const svgClickY = clickY * scaleY

    const newZoom = Math.min(zoom * 1.5, 8)

    // Calculate new pan to center on clicked point
    // The clicked SVG point is at: CENTER + svgClick/zoom - pan
    // To center it, we need: newPan = pan - svgClick/zoom
    const newPan = clampPan({
      x: pan.x - svgClickX / zoom,
      y: pan.y - svgClickY / zoom
    }, newZoom, contentBoundsRef.current)

    setPan(newPan)
    setZoom(newZoom)
  }, [zoom, pan])

  // Scroll wheel zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault()

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const delta = e.deltaY > 0 ? 0.9 : 1.1 // Zoom out or in
    const newZoom = Math.max(1, Math.min(8, zoom * delta))

    if (newZoom === zoom) return

    // Get mouse position relative to container center, scaled to SVG coordinates
    const mouseX = e.clientX - rect.left - rect.width / 2
    const mouseY = e.clientY - rect.top - rect.height / 2
    const scaleX = BASE_WIDTH / rect.width
    const scaleY = BASE_HEIGHT / rect.height
    const svgMouseX = mouseX * scaleX
    const svgMouseY = mouseY * scaleY

    // Calculate the SVG point under the mouse
    // svgPoint = svgMouse/zoom - pan (relative to center)
    const svgPointX = svgMouseX / zoom - pan.x
    const svgPointY = svgMouseY / zoom - pan.y

    // After zoom, we want the same SVG point to be under the mouse
    // svgMouse/newZoom - newPan = svgPoint
    // newPan = svgMouse/newZoom - svgPoint
    const newPan = clampPan({
      x: svgMouseX / newZoom - svgPointX,
      y: svgMouseY / newZoom - svgPointY
    }, newZoom, contentBoundsRef.current)

    setPan(newPan)
    setZoom(newZoom)
  }, [zoom, pan])

  // Drag handlers for panning
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return // Only left click
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
    setPanStart({ x: pan.x, y: pan.y })
  }, [pan])

  const handleMouseMove = useCallback((e) => {
    // Track mouse position for tooltip
    setMousePos({ x: e.clientX, y: e.clientY })

    if (isDragging) {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const scaleX = BASE_WIDTH / rect.width
      const scaleY = BASE_HEIGHT / rect.height
      const dx = (e.clientX - dragStart.x) * scaleX / zoom
      const dy = (e.clientY - dragStart.y) * scaleY / zoom
      // Clamp pan to boundaries
      setPan(clampPan({
        x: panStart.x + dx,
        y: panStart.y + dy
      }, zoom, contentBoundsRef.current))
    }
  }, [isDragging, dragStart, panStart, zoom])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Transform data into hierarchical format and compute circle packing
  const { packedData, totalVotes, continentTotals, continentPercentages, continentData, contentBounds } = useMemo(() => {
    if (!countriesData) {
      return { packedData: null, totalVotes: 0, continentTotals: {}, continentPercentages: {}, continentData: [], contentBounds: null }
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

    // Calculate content bounds from all circles (including radii)
    // Add padding so user can pan a bit beyond the exact edge of circles
    const CONTENT_PADDING = 30
    const allCircles = packed.descendants().filter(d => d.depth > 0)
    let contentBounds = null
    if (allCircles.length > 0) {
      contentBounds = {
        minX: Math.min(...allCircles.map(d => d.x - d.r)) - CONTENT_PADDING,
        maxX: Math.max(...allCircles.map(d => d.x + d.r)) + CONTENT_PADDING,
        minY: Math.min(...allCircles.map(d => d.y - d.r)) - CONTENT_PADDING,
        maxY: Math.max(...allCircles.map(d => d.y + d.r)) + CONTENT_PADDING
      }
    }

    // Store content bounds in ref for use by handlers
    contentBoundsRef.current = contentBounds

    return {
      packedData: packed,
      totalVotes: grandTotal,
      continentTotals: totals,
      continentPercentages: percentages,
      continentData: sortedContinents,
      contentBounds
    }
  }, [countriesData, selectedPoll, rankRange])

  const handleNodeMouseMove = (e, node) => {
    if (isDragging) return // Don't show tooltip while dragging
    setMousePos({ x: e.clientX, y: e.clientY })
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

  // Check if view has been modified from initial state
  const isModified = zoom !== INITIAL_ZOOM || pan.x !== 0 || pan.y !== 0

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
          {isModified && (
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
          className="border-2 border-black bg-gray-50 relative overflow-hidden select-none"
          style={{ height: '500px' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            handleMouseUp()
            handleNodeMouseLeave()
          }}
          onWheel={handleWheel}
          onDoubleClick={handleDoubleClick}
        >
          {/* CSS for smooth zoom transitions */}
          <style>{`
            .zoom-group {
              transition: transform 0.3s ease-out;
            }
          `}</style>
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox={`0 0 ${BASE_WIDTH} ${BASE_HEIGHT}`}
            preserveAspectRatio="xMidYMid meet"
          >
            <g
              className="zoom-group"
              style={{
                transform: `translate(${BASE_WIDTH / 2}px, ${BASE_HEIGHT / 2}px) scale(${zoom}) translate(${-BASE_WIDTH / 2 + pan.x}px, ${-BASE_HEIGHT / 2 + pan.y}px)`,
                transformOrigin: 'center center'
              }}
            >
              {/* Continent circles (background) - no labels */}
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
                    style={{ cursor: 'pointer' }}
                  >
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.r}
                      fill={color}
                      stroke="#000000"
                      strokeWidth={(isHovered ? 2.5 : 1) / zoom}
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
                        fill="#000000"
                        fontSize={Math.min(11, (node.r * zoom) / 3) / zoom}
                        fontWeight="600"
                        style={{
                          pointerEvents: 'none',
                          textShadow: '-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff'
                        }}
                      >
                        {displayName}
                      </text>
                    )}
                  </g>
                )
              })}
            </g>
          </svg>

          {/* Custom Tooltip - using fixed positioning like world map */}
          {hoveredNode && hoveredNode.depth === 2 && !isDragging && (() => {
            const containerRect = containerRef.current?.getBoundingClientRect()
            if (!containerRect) return null

            const tooltipWidth = 180
            const tooltipHeight = 140
            const offset = 10

            // Determine horizontal position - flip if in right half
            const isRightHalf = mousePos.x > window.innerWidth / 2
            let tooltipX = isRightHalf ? mousePos.x - tooltipWidth - offset : mousePos.x + offset

            // Determine vertical position - flip if in bottom half of container
            const containerMidY = containerRect.top + containerRect.height / 2
            const isBottomHalf = mousePos.y > containerMidY
            let tooltipY = isBottomHalf ? mousePos.y - tooltipHeight - offset : mousePos.y + offset

            // Clamp to stay within container boundaries
            const minY = containerRect.top
            const maxY = containerRect.bottom - tooltipHeight
            tooltipY = Math.max(minY, Math.min(maxY, tooltipY))

            return (
              <div
                className="fixed pointer-events-none bg-white p-3 border-2 border-black shadow-lg z-50"
                style={{
                  left: tooltipX,
                  top: tooltipY,
                  width: tooltipWidth,
                  transition: 'left 0.08s ease-out, top 0.08s ease-out'
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
            )
          })()}
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
