import { useMemo, useState, useRef } from 'react'

// Poll years for rows (reversed so 2022 is at top)
const POLL_YEARS = ['2022', '2012', '2002', '1992', '1982', '1972', '1962', '1952']

// Generate decades from 1890s to 2020s
const DECADES = ['1890', '1900', '1910', '1920', '1930', '1940', '1950', '1960', '1970', '1980', '1990', '2000', '2010', '2020']

export default function DecadeHeatmapRows({ films, selectedPoll, continentColor }) {
  const [hoveredCell, setHoveredCell] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const containerRef = useRef(null)

  // Build decade x poll matrix with row-normalized values
  const { matrix, decades, rowMaxValues, hasData } = useMemo(() => {
    if (!films || films.length === 0) {
      return { matrix: {}, decades: [], rowMaxValues: {}, hasData: false }
    }

    // Initialize matrix: poll -> decade -> count
    const matrix = {}
    POLL_YEARS.forEach(poll => {
      matrix[poll] = {}
      DECADES.forEach(decade => {
        matrix[poll][decade] = 0
      })
    })

    // For each film, count appearances in each poll by decade
    films.forEach(film => {
      const yearStr = film.Year?.toString() || ''
      const year = parseInt(yearStr.split('-')[0])
      if (isNaN(year) || year < 1890) return

      const decade = Math.floor(year / 10) * 10
      const decadeKey = decade.toString()

      // Count appearances in each poll
      film.pollHistory.forEach(poll => {
        if (poll.votes > 0 && poll.year !== 'all') {
          const pollKey = poll.year.toString()
          if (matrix[pollKey] && matrix[pollKey][decadeKey] !== undefined) {
            matrix[pollKey][decadeKey]++
          }
        }
      })
    })

    // Calculate max value for each row (for row-normalized coloring)
    const rowMaxValues = {}
    POLL_YEARS.forEach(poll => {
      rowMaxValues[poll] = Math.max(...Object.values(matrix[poll]), 0)
    })

    // Get decades that have data in any poll
    const decades = DECADES.filter(d =>
      POLL_YEARS.some(poll => matrix[poll][d] > 0)
    )

    return {
      matrix,
      decades,
      rowMaxValues,
      hasData: decades.length > 0
    }
  }, [films])

  // Get color intensity based on value, normalized to row max
  const getColor = (value, rowMax) => {
    if (value === 0 || rowMax === 0) return '#f3f4f6' // gray-100

    const intensity = value / rowMax
    // Parse continent color
    const hex = continentColor.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)

    // Interpolate from white to full color
    const factor = 0.15 + intensity * 0.85
    const newR = Math.round(255 - (255 - r) * factor)
    const newG = Math.round(255 - (255 - g) * factor)
    const newB = Math.round(255 - (255 - b) * factor)

    return `rgb(${newR}, ${newG}, ${newB})`
  }

  const handleCellHover = (e, poll, decade, value, rowMax) => {
    setMousePos({ x: e.clientX, y: e.clientY })
    const rowTotal = Object.values(matrix[poll]).reduce((a, b) => a + b, 0)
    const pct = rowTotal > 0 ? ((value / rowTotal) * 100).toFixed(1) : '0'
    setHoveredCell({ poll, decade, value, pct, rowMax })
  }

  const handleCellLeave = () => {
    setHoveredCell(null)
  }

  if (!hasData) {
    return (
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 h-[400px] flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">📅</div>
          <div className="font-bold mb-2">Not Enough Data</div>
          <div className="text-sm">
            No decade distribution data available for current filters
          </div>
        </div>
      </div>
    )
  }

  // Cell dimensions
  const CELL_HEIGHT = 44
  const LABEL_WIDTH = 70
  const ROW_GAP = 6
  const BAR_CHART_HEIGHT = 300

  // For bar chart mode, calculate max value and bar data
  const barChartData = useMemo(() => {
    if (selectedPoll === 'all') return null

    const pollData = matrix[selectedPoll] || {}
    const maxValue = Math.max(...Object.values(pollData), 0)
    const total = Object.values(pollData).reduce((a, b) => a + b, 0)

    return {
      data: decades.map(decade => ({
        decade,
        value: pollData[decade] || 0,
        pct: total > 0 ? ((pollData[decade] || 0) / total * 100).toFixed(1) : '0'
      })),
      maxValue,
      total
    }
  }, [selectedPoll, matrix, decades])

  // Handle bar hover for individual poll mode
  const handleBarHover = (e, decade, value, pct) => {
    setMousePos({ x: e.clientX, y: e.clientY })
    setHoveredCell({ poll: selectedPoll, decade, value, pct, rowMax: barChartData?.maxValue })
  }

  // Individual poll mode - bar chart
  if (selectedPoll !== 'all' && barChartData) {
    // Generate Y-axis grid lines (matching TopCountriesBarChart dashed style)
    const yAxisTicks = [0, 0.25, 0.5, 0.75, 1].map(pct => Math.round(barChartData.maxValue * pct))

    return (
      <div>
        {/* Bar chart container */}
        <div
          ref={containerRef}
          className="bg-white overflow-x-auto"
          onMouseLeave={handleCellLeave}
        >
          <div className="flex">
            {/* Y-axis (Film count) */}
            <div className="shrink-0 flex flex-col border-r-2 border-black" style={{ width: LABEL_WIDTH }}>
              {/* Y-axis label */}
              <div
                className="flex items-center justify-center text-xs font-bold text-black"
                style={{ height: 24 }}
              >
                Films
              </div>

              {/* Y-axis tick labels */}
              <div className="flex-1 flex flex-col justify-between" style={{ height: BAR_CHART_HEIGHT }}>
                {[barChartData.maxValue, Math.round(barChartData.maxValue * 0.75), Math.round(barChartData.maxValue * 0.5), Math.round(barChartData.maxValue * 0.25), 0].map((tick, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-end pr-3 text-xs text-black"
                    style={{ fontWeight: 600 }}
                  >
                    {tick}
                  </div>
                ))}
              </div>

              {/* Empty corner for x-axis */}
              <div style={{ height: 32 }} />
            </div>

            {/* Main chart area */}
            <div className="flex-1 flex flex-col relative">
              {/* Top padding */}
              <div style={{ height: 24 }} />

              {/* Bar chart area with grid */}
              <div
                className="flex-1 flex items-end relative"
                style={{ height: BAR_CHART_HEIGHT }}
              >
                {/* Horizontal grid lines (dashed, matching TopCountriesBarChart) */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  {[0, 1, 2, 3, 4].map((idx) => (
                    <div
                      key={idx}
                      className="w-full border-t"
                      style={{
                        borderColor: '#d1d5db',
                        borderStyle: 'dashed',
                        borderWidth: '1px'
                      }}
                    />
                  ))}
                </div>

                {/* Bars */}
                {barChartData.data.map((item, idx) => {
                  const barHeight = barChartData.maxValue > 0
                    ? (item.value / barChartData.maxValue) * BAR_CHART_HEIGHT
                    : 0

                  return (
                    <div
                      key={item.decade}
                      className="flex-1 flex flex-col justify-end px-1 relative z-10"
                      style={{ minWidth: 50 }}
                    >
                      {/* Bar */}
                      <div
                        className="cursor-pointer transition-all hover:opacity-80"
                        style={{
                          height: barHeight,
                          backgroundColor: continentColor,
                          minHeight: item.value > 0 ? 2 : 0,
                          border: item.value > 0 ? '1px solid #000000' : 'none'
                        }}
                        onMouseEnter={(e) => handleBarHover(e, item.decade, item.value, item.pct)}
                        onMouseMove={(e) => handleBarHover(e, item.decade, item.value, item.pct)}
                        onMouseLeave={handleCellLeave}
                      >
                        {/* Value label inside bar if tall enough */}
                        {barHeight > 30 && item.value > 0 && (
                          <div className="flex items-center justify-center h-full">
                            <span className="text-sm font-bold text-black">
                              {item.value}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* X-axis (Decades) */}
              <div className="border-t-2 border-black flex" style={{ height: 32 }}>
                {barChartData.data.map((item) => (
                  <div
                    key={item.decade}
                    className="flex-1 flex items-center justify-center text-xs text-black"
                    style={{ minWidth: 50, fontWeight: 600 }}
                  >
                    {item.decade}s
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tooltip */}
          {hoveredCell && hoveredCell.value > 0 && (() => {
            const containerRect = containerRef.current?.getBoundingClientRect()
            if (!containerRect) return null

            const tooltipWidth = 200
            const tooltipHeight = 100
            const offset = 10

            const isRightHalf = mousePos.x > window.innerWidth / 2
            let tooltipX = isRightHalf ? mousePos.x - tooltipWidth - offset : mousePos.x + offset

            const containerMidY = containerRect.top + containerRect.height / 2
            const isBottomHalf = mousePos.y > containerMidY
            let tooltipY = isBottomHalf ? mousePos.y - tooltipHeight - offset : mousePos.y + offset

            return (
              <div
                className="fixed pointer-events-none bg-white p-2.5 border-2 border-black shadow-lg z-50 max-w-[180px]"
                style={{
                  left: tooltipX,
                  top: tooltipY,
                  transition: 'left 0.08s ease-out, top 0.08s ease-out'
                }}
              >
                <p className="font-bold text-base text-black tracking-wide">
                  {hoveredCell.decade}s
                </p>
                <p className="text-xl font-black text-black my-1">
                  {hoveredCell.value} {hoveredCell.value === 1 ? 'film' : 'films'}
                </p>
                <p className="text-xs text-black font-medium">
                  {hoveredCell.pct}% of {selectedPoll} poll
                </p>
                {hoveredCell.value === hoveredCell.rowMax && (
                  <p className="text-xs font-bold mt-0.5" style={{ color: continentColor }}>
                    Peak decade
                  </p>
                )}
              </div>
            )
          })()}
        </div>
      </div>
    )
  }

  // All polls combined mode - heatmap
  return (
    <div>
      {/* Chart container */}
      <div
        ref={containerRef}
        className="bg-white overflow-x-auto"
        onMouseLeave={handleCellLeave}
      >
        <div className="flex">
          {/* Y-axis (Poll years) */}
          <div className="shrink-0 flex flex-col border-r-2 border-black" style={{ width: LABEL_WIDTH }}>
            {/* Y-axis label area */}
            <div
              className="flex items-center justify-center text-xs font-bold uppercase tracking-wide text-gray-500 border-b border-gray-300"
              style={{ height: 24 }}
            >
              Poll
            </div>

            {/* Y-axis tick labels */}
            <div className="flex-1 flex flex-col">
              {POLL_YEARS.map((poll) => {
                const rowTotal = Object.values(matrix[poll]).reduce((a, b) => a + b, 0)
                if (rowTotal === 0) return null

                return (
                  <div
                    key={poll}
                    className="flex items-center justify-end pr-3 font-bold text-sm text-black border-b border-gray-200"
                    style={{ height: CELL_HEIGHT + ROW_GAP }}
                  >
                    {poll}
                  </div>
                )
              })}
            </div>

            {/* Empty corner for x-axis */}
            <div style={{ height: 32 }} />
          </div>

          {/* Main chart area */}
          <div className="flex-1 flex flex-col">
            {/* Top padding to align with y-axis label */}
            <div style={{ height: 24 }} />

            {/* Poll bars */}
            <div className="flex-1 border-l-0">
              {POLL_YEARS.map((poll) => {
                const rowMax = rowMaxValues[poll]
                const rowTotal = Object.values(matrix[poll]).reduce((a, b) => a + b, 0)

                if (rowTotal === 0) return null

                return (
                  <div
                    key={poll}
                    className="flex items-stretch border-b border-gray-200"
                    style={{ height: CELL_HEIGHT, marginBottom: ROW_GAP }}
                  >
                    {decades.map((decade, idx) => {
                      const value = matrix[poll]?.[decade] || 0
                      const bgColor = getColor(value, rowMax)
                      const isLast = idx === decades.length - 1

                      return (
                        <div
                          key={`${poll}-${decade}`}
                          className={`flex-1 flex items-center justify-center cursor-pointer transition-all hover:ring-2 hover:ring-black hover:ring-inset border-t border-b border-gray-400 ${!isLast ? 'border-r border-r-gray-300' : 'border-r border-r-gray-400'} ${idx === 0 ? 'border-l border-l-gray-400' : ''}`}
                          style={{
                            backgroundColor: bgColor,
                            minWidth: 50
                          }}
                          onMouseEnter={(e) => handleCellHover(e, poll, decade, value, rowMax)}
                          onMouseMove={(e) => handleCellHover(e, poll, decade, value, rowMax)}
                          onMouseLeave={handleCellLeave}
                        >
                          {value > 0 && (
                            <span className="text-sm font-bold text-black">
                              {value}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>

            {/* X-axis (Decades) */}
            <div className="border-t-2 border-black flex" style={{ height: 32 }}>
              {decades.map((decade) => (
                <div
                  key={decade}
                  className="flex-1 flex items-center justify-center text-xs font-bold tracking-wide text-black"
                  style={{ minWidth: 50 }}
                >
                  {decade}s
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tooltip */}
        {hoveredCell && hoveredCell.value > 0 && (() => {
          const containerRect = containerRef.current?.getBoundingClientRect()
          if (!containerRect) return null

          const tooltipWidth = 200
          const tooltipHeight = 100
          const offset = 10

          const isRightHalf = mousePos.x > window.innerWidth / 2
          let tooltipX = isRightHalf ? mousePos.x - tooltipWidth - offset : mousePos.x + offset

          const containerMidY = containerRect.top + containerRect.height / 2
          const isBottomHalf = mousePos.y > containerMidY
          let tooltipY = isBottomHalf ? mousePos.y - tooltipHeight - offset : mousePos.y + offset

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
              <p className="font-bold text-sm text-black tracking-wide">
                {hoveredCell.decade}s in {hoveredCell.poll}
              </p>
              <p className="text-2xl font-black text-black mt-1">
                {hoveredCell.value} {hoveredCell.value === 1 ? 'film' : 'films'}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {hoveredCell.pct}% of this poll's films
              </p>
              {hoveredCell.value === hoveredCell.rowMax && (
                <p className="text-xs font-bold mt-1" style={{ color: continentColor }}>
                  Peak decade for {hoveredCell.poll}
                </p>
              )}
            </div>
          )
        })()}
      </div>
    </div>
  )
}
