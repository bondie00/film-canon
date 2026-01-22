import { useMemo, useState, useRef, useCallback } from 'react'

// Generate 5-year bucket label
const getBucketLabel = (startYear) => `${startYear}-${startYear + 4}`

// Seeded random for consistent jitter
const seededRandom = (seed) => {
  const x = Math.sin(seed * 9999) * 10000
  return x - Math.floor(x)
}

// Zoom constants
const INITIAL_ZOOM = 1
const MAX_ZOOM = 6
const ZOOM_FACTOR = 1.3

export default function FilmRankScatter({ films, selectedPoll, continentColor }) {
  const [hoveredFilm, setHoveredFilm] = useState(null)
  const [hoveredBucket, setHoveredBucket] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const containerRef = useRef(null)

  // Zoom and pan state
  const [zoom, setZoom] = useState(INITIAL_ZOOM)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  // Process films into scatter dots and density band data
  const { scatterFilms, densityBandFilms, densityBuckets, yDomain, xDomain, maxBucketCount, bandVoteThreshold } = useMemo(() => {
    if (!films || films.length === 0) {
      return { scatterFilms: [], densityBandFilms: [], densityBuckets: [], yDomain: [1, 100], xDomain: [1920, 2025], maxBucketCount: 0, bandVoteThreshold: 0 }
    }

    const pollKey = selectedPoll === 'all' ? 'all' : parseInt(selectedPoll)

    // First pass: collect all films with their vote data and count by vote count
    const allFilmsWithData = []
    const voteCountMap = {} // { voteCount: count of films }

    // Track min/max for axes
    let minYear = Infinity
    let maxYear = -Infinity

    films.forEach(film => {
      // Get poll data
      const pollData = film.pollHistory.find(p =>
        pollKey === 'all' ? p.year === 'all' : p.year === pollKey
      )

      if (!pollData || pollData.votes === 0) return

      // Parse year
      const yearStr = film.Year?.toString() || ''
      const year = parseInt(yearStr.split('-')[0])
      if (isNaN(year) || year < 1880) return

      minYear = Math.min(minYear, year)
      maxYear = Math.max(maxYear, year)

      const filmData = {
        ...film,
        year,
        rank: pollData.rank,
        votes: pollData.votes
      }

      allFilmsWithData.push(filmData)

      // Count films by vote count
      voteCountMap[pollData.votes] = (voteCountMap[pollData.votes] || 0) + 1
    })

    // Determine which vote counts should go to density band (> 30 films at that vote count)
    const DENSITY_THRESHOLD = 30
    const votesForDensityBand = new Set()

    Object.entries(voteCountMap).forEach(([votes, count]) => {
      if (count > DENSITY_THRESHOLD) {
        votesForDensityBand.add(parseInt(votes))
      }
    })

    // Find the highest vote count that goes to density band (for label)
    const bandVoteThreshold = votesForDensityBand.size > 0 ? Math.max(...votesForDensityBand) : 0

    // Second pass: separate into scatter dots vs density band
    const scatterFilms = []
    const densityBandFilms = []
    let minRank = Infinity
    let maxRank = -Infinity

    allFilmsWithData.forEach(film => {
      if (votesForDensityBand.has(film.votes)) {
        densityBandFilms.push(film)
      } else {
        scatterFilms.push(film)
        if (film.rank) {
          minRank = Math.min(minRank, film.rank)
          maxRank = Math.max(maxRank, film.rank)
        }
      }
    })

    // Build 5-year buckets for density band
    const buckets = {}
    const bucketStart = Math.floor(minYear / 5) * 5
    const bucketEnd = Math.ceil(maxYear / 5) * 5

    // Initialize all buckets
    for (let y = bucketStart; y <= bucketEnd; y += 5) {
      buckets[y] = { startYear: y, count: 0, films: [] }
    }

    // Fill buckets with density band films
    densityBandFilms.forEach(film => {
      const bucketKey = Math.floor(film.year / 5) * 5
      if (buckets[bucketKey]) {
        buckets[bucketKey].count++
        buckets[bucketKey].films.push(film)
      }
    })

    const densityBuckets = Object.values(buckets).filter(b => b.count > 0)
    const maxBucketCount = Math.max(...densityBuckets.map(b => b.count), 1)

    // Set domains with padding
    const xDomain = [
      Math.max(1890, minYear - 5),
      Math.min(2030, maxYear + 5)
    ]

    // Y domain for scatter area (excluding density band films)
    // Handle case where all films are in density band
    const yDomain = [
      Math.max(1, isFinite(minRank) ? minRank - 5 : 1),
      isFinite(maxRank) ? Math.min(maxRank + 20, maxRank * 1.1) : 100
    ]

    return { scatterFilms, densityBandFilms, densityBuckets, yDomain, xDomain, maxBucketCount, bandVoteThreshold }
  }, [films, selectedPoll])

  // SVG dimensions
  const width = 800
  const height = 500
  const margin = { top: 20, right: 30, bottom: 80, left: 60 }
  const plotWidth = width - margin.left - margin.right
  const plotHeight = height - margin.top - margin.bottom

  // Reserve space for density band
  const bandHeight = 40
  const bandGap = 20
  const scatterHeight = plotHeight - bandHeight - bandGap

  // Scales
  const xScale = (year) => {
    const ratio = (year - xDomain[0]) / (xDomain[1] - xDomain[0])
    return margin.left + ratio * plotWidth
  }

  const yScale = (rank) => {
    // Inverted: rank 1 at top, higher ranks toward bottom
    const ratio = (rank - yDomain[0]) / (yDomain[1] - yDomain[0])
    return margin.top + ratio * scatterHeight
  }

  // Bucket position scale
  const bucketScale = (startYear) => {
    const bucketWidth = plotWidth / ((xDomain[1] - xDomain[0]) / 5)
    const ratio = (startYear - xDomain[0]) / (xDomain[1] - xDomain[0])
    return margin.left + ratio * plotWidth
  }

  const bucketWidth = plotWidth / ((xDomain[1] - xDomain[0]) / 5)

  // Band Y position (below scatter with gap)
  const bandY = margin.top + scatterHeight + bandGap

  // Get color intensity for density bucket
  const getBucketColor = (count) => {
    if (count === 0) return 'transparent'
    const intensity = 0.2 + (count / maxBucketCount) * 0.8
    const hex = continentColor.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${intensity})`
  }

  // Generate Y-axis ticks
  const yTicks = useMemo(() => {
    const ticks = []
    const range = yDomain[1] - yDomain[0]
    const step = range <= 50 ? 10 : range <= 200 ? 25 : range <= 500 ? 50 : 100
    for (let i = Math.ceil(yDomain[0] / step) * step; i <= yDomain[1]; i += step) {
      ticks.push(i)
    }
    return ticks
  }, [yDomain])

  // Generate X-axis ticks (decades)
  const xTicks = useMemo(() => {
    const ticks = []
    const startDecade = Math.ceil(xDomain[0] / 10) * 10
    for (let i = startDecade; i <= xDomain[1]; i += 10) {
      ticks.push(i)
    }
    return ticks
  }, [xDomain])

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom(z => Math.min(z * ZOOM_FACTOR, MAX_ZOOM))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom(z => Math.max(z / ZOOM_FACTOR, 1))
  }, [])

  const handleReset = useCallback(() => {
    setZoom(INITIAL_ZOOM)
    setPan({ x: 0, y: 0 })
  }, [])

  // Scroll wheel zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault()

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const delta = e.deltaY > 0 ? (1 / ZOOM_FACTOR) : ZOOM_FACTOR
    const newZoom = Math.max(1, Math.min(MAX_ZOOM, zoom * delta))

    if (newZoom === zoom) return

    // Get mouse position relative to container center, scaled to SVG coordinates
    const mouseX = e.clientX - rect.left - rect.width / 2
    const mouseY = e.clientY - rect.top - rect.height / 2
    const scaleX = width / rect.width
    const scaleY = height / rect.height
    const svgMouseX = mouseX * scaleX
    const svgMouseY = mouseY * scaleY

    // Calculate the SVG point under the mouse
    const svgPointX = svgMouseX / zoom - pan.x
    const svgPointY = svgMouseY / zoom - pan.y

    // After zoom, we want the same SVG point to be under the mouse
    const newPan = {
      x: svgMouseX / newZoom - svgPointX,
      y: svgMouseY / newZoom - svgPointY
    }

    setPan(newPan)
    setZoom(newZoom)
  }, [zoom, pan, width, height])

  // Double-click to zoom in
  const handleDoubleClick = useCallback((e) => {
    e.preventDefault()
    if (zoom >= MAX_ZOOM) return

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const clickX = e.clientX - rect.left - rect.width / 2
    const clickY = e.clientY - rect.top - rect.height / 2
    const scaleX = width / rect.width
    const scaleY = height / rect.height
    const svgClickX = clickX * scaleX
    const svgClickY = clickY * scaleY

    const newZoom = Math.min(zoom * ZOOM_FACTOR * 1.2, MAX_ZOOM)

    const newPan = {
      x: pan.x - svgClickX / zoom,
      y: pan.y - svgClickY / zoom
    }

    setPan(newPan)
    setZoom(newZoom)
  }, [zoom, pan, width, height])

  // Drag handlers for panning
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
    setPanStart({ x: pan.x, y: pan.y })
  }, [pan])

  const handleMouseMoveForPan = useCallback((e) => {
    setMousePos({ x: e.clientX, y: e.clientY })

    if (isDragging) {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const scaleX = width / rect.width
      const scaleY = height / rect.height
      const dx = (e.clientX - dragStart.x) * scaleX / zoom
      const dy = (e.clientY - dragStart.y) * scaleY / zoom
      setPan({
        x: panStart.x + dx,
        y: panStart.y + dy
      })
    }
  }, [isDragging, dragStart, panStart, zoom, width, height])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Check if view has been modified
  const isModified = zoom !== INITIAL_ZOOM || pan.x !== 0 || pan.y !== 0

  const handleFilmHover = (e, film) => {
    if (isDragging) return
    setMousePos({ x: e.clientX, y: e.clientY })
    setHoveredFilm(film)
    setHoveredBucket(null)
  }

  const handleBucketHover = (e, bucket) => {
    if (isDragging) return
    setMousePos({ x: e.clientX, y: e.clientY })
    setHoveredBucket(bucket)
    setHoveredFilm(null)
  }

  const handleMouseLeave = () => {
    setHoveredFilm(null)
    setHoveredBucket(null)
    handleMouseUp()
  }

  if (!films || films.length === 0) {
    return (
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 h-[500px] flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">📊</div>
          <div className="font-bold mb-2">No Films to Display</div>
          <div className="text-sm">Try adjusting the filters</div>
        </div>
      </div>
    )
  }

  const densityBandCount = densityBuckets.reduce((sum, b) => sum + b.count, 0)

  return (
    <div>
      <div className="relative">
        {/* Zoom Controls */}
        <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
          <button
            onClick={handleZoomIn}
            disabled={zoom >= MAX_ZOOM}
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
          className="border-2 border-black bg-white overflow-hidden select-none"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMoveForPan}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
          onDoubleClick={handleDoubleClick}
        >
          <style>{`
            .zoom-group {
              transition: transform 0.15s ease-out;
            }
          `}</style>
          <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
            <g
              className="zoom-group"
              style={{
                transform: `translate(${width / 2}px, ${height / 2}px) scale(${zoom}) translate(${-width / 2 + pan.x}px, ${-height / 2 + pan.y}px)`
              }}
            >
          {/* Grid lines */}
          <g className="grid">
            {yTicks.map(tick => (
              <line
                key={`y-${tick}`}
                x1={margin.left}
                y1={yScale(tick)}
                x2={width - margin.right}
                y2={yScale(tick)}
                stroke="#e5e7eb"
                strokeDasharray="3,3"
              />
            ))}
            {xTicks.map(tick => (
              <line
                key={`x-${tick}`}
                x1={xScale(tick)}
                y1={margin.top}
                x2={xScale(tick)}
                y2={margin.top + scatterHeight}
                stroke="#e5e7eb"
                strokeDasharray="3,3"
              />
            ))}
          </g>

          {/* Y-axis */}
          <g className="y-axis">
            <line
              x1={margin.left}
              y1={margin.top}
              x2={margin.left}
              y2={margin.top + scatterHeight}
              stroke="#000"
              strokeWidth={2}
            />
            {yTicks.map(tick => (
              <g key={`y-tick-${tick}`}>
                <line
                  x1={margin.left - 5}
                  y1={yScale(tick)}
                  x2={margin.left}
                  y2={yScale(tick)}
                  stroke="#000"
                  strokeWidth={2}
                />
                <text
                  x={margin.left - 10}
                  y={yScale(tick)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={11}
                  fontWeight="500"
                >
                  {tick}
                </text>
              </g>
            ))}
            <text
              x={20}
              y={margin.top + scatterHeight / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={12}
              fontWeight="bold"
              transform={`rotate(-90, 20, ${margin.top + scatterHeight / 2})`}
            >
              Rank
            </text>
          </g>

          {/* X-axis */}
          <g className="x-axis">
            <line
              x1={margin.left}
              y1={height - margin.bottom + bandHeight + bandGap}
              x2={width - margin.right}
              y2={height - margin.bottom + bandHeight + bandGap}
              stroke="#000"
              strokeWidth={2}
            />
            {xTicks.map(tick => (
              <g key={`x-tick-${tick}`}>
                <line
                  x1={xScale(tick)}
                  y1={height - margin.bottom + bandHeight + bandGap}
                  x2={xScale(tick)}
                  y2={height - margin.bottom + bandHeight + bandGap + 5}
                  stroke="#000"
                  strokeWidth={2}
                />
                <text
                  x={xScale(tick)}
                  y={height - margin.bottom + bandHeight + bandGap + 18}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight="500"
                >
                  {tick}
                </text>
              </g>
            ))}
            <text
              x={margin.left + plotWidth / 2}
              y={height - 10}
              textAnchor="middle"
              fontSize={12}
              fontWeight="bold"
            >
              Release Year
            </text>
          </g>

          {/* Scatter plot dots */}
          <g className="scatter-dots">
            {scatterFilms.map((film, i) => {
              if (!film.rank) return null

              // Add jitter based on film key for consistency
              const jitterX = (seededRandom(film.key) - 0.5) * 8
              const jitterY = (seededRandom(film.key + 1000) - 0.5) * 6

              const cx = xScale(film.year) + jitterX
              const cy = yScale(film.rank) + jitterY
              const isHovered = hoveredFilm?.key === film.key

              return (
                <circle
                  key={film.key}
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 6 : 4}
                  fill={continentColor}
                  stroke="#000"
                  strokeWidth={isHovered ? 2 : 1}
                  opacity={isHovered ? 1 : 0.8}
                  style={{ cursor: 'pointer', transition: 'r 0.1s, stroke-width 0.1s' }}
                  onMouseEnter={(e) => handleFilmHover(e, film)}
                  onMouseMove={(e) => handleFilmHover(e, film)}
                />
              )
            })}
          </g>

          {/* Visual gap line */}
          <line
            x1={margin.left}
            y1={bandY - bandGap / 2}
            x2={width - margin.right}
            y2={bandY - bandGap / 2}
            stroke="#ccc"
            strokeDasharray="5,5"
            strokeWidth={1}
          />

          {/* Density band label */}
          {bandVoteThreshold > 0 && (
            <text
              x={margin.left - 10}
              y={bandY + bandHeight / 2}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={10}
              fontWeight="bold"
              fill="#666"
            >
              {bandVoteThreshold === 1 ? '1 vote' : `1-${bandVoteThreshold} votes`}
            </text>
          )}

          {/* Density band */}
          <g className="density-band">
            {densityBuckets.map(bucket => {
              const x = bucketScale(bucket.startYear)

              return (
                <rect
                  key={bucket.startYear}
                  x={x}
                  y={bandY}
                  width={bucketWidth - 1}
                  height={bandHeight}
                  fill={getBucketColor(bucket.count)}
                  stroke="#000"
                  strokeWidth={0.5}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => handleBucketHover(e, bucket)}
                  onMouseMove={(e) => handleBucketHover(e, bucket)}
                />
              )
            })}
          </g>
            </g>
          </svg>

        {/* Film Tooltip */}
        {hoveredFilm && (() => {
          const containerRect = containerRef.current?.getBoundingClientRect()
          if (!containerRect) return null

          const tooltipWidth = 220
          const tooltipHeight = 120
          const offset = 12

          const isRightHalf = mousePos.x > window.innerWidth / 2
          let tooltipX = isRightHalf ? mousePos.x - tooltipWidth - offset : mousePos.x + offset

          const isBottomHalf = mousePos.y > containerRect.top + containerRect.height / 2
          let tooltipY = isBottomHalf ? mousePos.y - tooltipHeight - offset : mousePos.y + offset

          return (
            <div
              className="fixed pointer-events-none bg-white p-3 border-2 border-black shadow-lg z-50"
              style={{ left: tooltipX, top: tooltipY, width: tooltipWidth }}
            >
              <div className="font-bold text-black text-sm leading-tight mb-1">
                {hoveredFilm.FilmTitle}
              </div>
              <div className="text-xs text-gray-600 mb-2">
                {hoveredFilm.Year} • {hoveredFilm.directors?.join(', ')}
              </div>
              <div className="flex justify-between text-sm">
                <div>
                  <span className="font-bold text-black">#{hoveredFilm.rank}</span>
                  <span className="text-gray-600 ml-1">rank</span>
                </div>
                <div>
                  <span className="font-bold text-black">{hoveredFilm.votes}</span>
                  <span className="text-gray-600 ml-1">votes</span>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Bucket Tooltip */}
        {hoveredBucket && (() => {
          const containerRect = containerRef.current?.getBoundingClientRect()
          if (!containerRect) return null

          const tooltipWidth = 180
          const tooltipHeight = 60
          const offset = 12

          const isRightHalf = mousePos.x > window.innerWidth / 2
          let tooltipX = isRightHalf ? mousePos.x - tooltipWidth - offset : mousePos.x + offset
          let tooltipY = mousePos.y - tooltipHeight - offset

          return (
            <div
              className="fixed pointer-events-none bg-white p-3 border-2 border-black shadow-lg z-50"
              style={{ left: tooltipX, top: tooltipY, width: tooltipWidth }}
            >
              <div className="font-bold text-black text-sm mb-1">
                {getBucketLabel(hoveredBucket.startYear)}
              </div>
              <div className="text-lg font-black text-black">
                {hoveredBucket.count} {hoveredBucket.count === 1 ? 'film' : 'films'}
              </div>
              <div className="text-xs text-gray-500">
                {bandVoteThreshold === 1 ? 'with 1 vote' : `with 1-${bandVoteThreshold} votes`}
              </div>
            </div>
          )
        })()}
        </div>
      </div>

      {/* Summary stats */}
      <div className="mt-4 flex justify-between text-sm border-t-2 border-gray-200 pt-4">
        <div>
          <span className="font-bold text-black">{scatterFilms.length}</span>
          <span className="text-gray-600 ml-1">
            {bandVoteThreshold > 0 ? `films with ${bandVoteThreshold + 1}+ votes` : 'films'} (individual dots)
          </span>
        </div>
        {densityBandCount > 0 && (
          <div>
            <span className="font-bold text-black">{densityBandCount}</span>
            <span className="text-gray-600 ml-1">
              films with {bandVoteThreshold === 1 ? '1 vote' : `1-${bandVoteThreshold} votes`} (density band)
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
