import { useMemo, useState, useRef } from 'react'

// Poll years for columns
const POLL_YEARS = ['1952', '1962', '1972', '1982', '1992', '2002', '2012', '2022']

// Generate decades from 1890s to 2020s
const DECADES = ['1890', '1900', '1910', '1920', '1930', '1940', '1950', '1960', '1970', '1980', '1990', '2000', '2010', '2020']

export default function DecadeHeatmap({ films, selectedPoll, continentColor }) {
  const [hoveredCell, setHoveredCell] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const containerRef = useRef(null)

  // Build decade x poll matrix
  const { matrix, decades, maxValue, hasData } = useMemo(() => {
    if (!films || films.length === 0) {
      return { matrix: {}, decades: [], maxValue: 0, hasData: false }
    }

    // Initialize matrix
    const matrix = {}
    let maxValue = 0

    // For each film, determine which decade it belongs to
    // and which poll(s) it appeared in
    films.forEach(film => {
      const yearStr = film.Year?.toString() || ''
      // Handle year ranges like "1960-1964" - take first year
      const year = parseInt(yearStr.split('-')[0])
      if (isNaN(year) || year < 1890) return

      const decade = Math.floor(year / 10) * 10
      const decadeKey = decade.toString()

      if (!matrix[decadeKey]) {
        matrix[decadeKey] = {}
        POLL_YEARS.forEach(poll => {
          matrix[decadeKey][poll] = 0
        })
      }

      // Count appearances in each poll
      film.pollHistory.forEach(poll => {
        if (poll.votes > 0) {
          const pollKey = poll.year.toString()
          if (matrix[decadeKey][pollKey] !== undefined) {
            matrix[decadeKey][pollKey]++
            maxValue = Math.max(maxValue, matrix[decadeKey][pollKey])
          }
        }
      })
    })

    // Get decades that have data
    const decades = DECADES.filter(d => matrix[d] && Object.values(matrix[d]).some(v => v > 0))

    return {
      matrix,
      decades,
      maxValue,
      hasData: decades.length > 0
    }
  }, [films])

  // Get color intensity based on value
  const getColor = (value, max) => {
    if (value === 0 || max === 0) return '#f3f4f6' // gray-100

    const intensity = value / max
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

  const handleCellHover = (e, decade, poll, value) => {
    setMousePos({ x: e.clientX, y: e.clientY })
    setHoveredCell({ decade, poll, value })
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
  const CELL_WIDTH = 70
  const CELL_HEIGHT = 32
  const LABEL_WIDTH = 60
  const HEADER_HEIGHT = 40

  // Determine which columns to show based on filter
  const visiblePolls = selectedPoll === 'all' ? POLL_YEARS : [selectedPoll]

  return (
    <div>
      {/* Heatmap Table */}
      <div
        ref={containerRef}
        className="border-2 border-black bg-white overflow-x-auto"
        onMouseLeave={handleCellLeave}
      >
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th
                className="border-b-2 border-r-2 border-black p-2 text-left text-xs font-bold uppercase tracking-wide bg-gray-100"
                style={{ width: LABEL_WIDTH, minWidth: LABEL_WIDTH }}
              >
                Decade
              </th>
              {visiblePolls.map(poll => (
                <th
                  key={poll}
                  className="border-b-2 border-r border-gray-300 p-2 text-center text-xs font-bold uppercase tracking-wide bg-gray-100"
                  style={{ width: CELL_WIDTH, minWidth: CELL_WIDTH }}
                >
                  {poll}
                </th>
              ))}
              <th
                className="border-b-2 border-black p-2 text-center text-xs font-bold uppercase tracking-wide bg-gray-100"
                style={{ width: CELL_WIDTH, minWidth: CELL_WIDTH }}
              >
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {decades.map((decade, rowIdx) => {
              const rowTotal = visiblePolls.reduce((sum, poll) => sum + (matrix[decade]?.[poll] || 0), 0)

              return (
                <tr key={decade} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border-r-2 border-black p-2 font-bold text-sm text-black">
                    {decade}s
                  </td>
                  {visiblePolls.map(poll => {
                    const value = matrix[decade]?.[poll] || 0
                    const bgColor = getColor(value, maxValue)

                    return (
                      <td
                        key={`${decade}-${poll}`}
                        className="border-r border-gray-200 p-0 text-center cursor-pointer transition-all hover:ring-2 hover:ring-black hover:ring-inset"
                        style={{
                          backgroundColor: bgColor,
                          height: CELL_HEIGHT
                        }}
                        onMouseEnter={(e) => handleCellHover(e, decade, poll, value)}
                        onMouseMove={(e) => handleCellHover(e, decade, poll, value)}
                        onMouseLeave={handleCellLeave}
                      >
                        {value > 0 && (
                          <span className="text-sm font-bold text-black">
                            {value}
                          </span>
                        )}
                      </td>
                    )
                  })}
                  <td
                    className="border-l-2 border-black p-2 text-center font-bold text-sm"
                    style={{ backgroundColor: getColor(rowTotal, maxValue * visiblePolls.length) }}
                  >
                    {rowTotal}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 border-t-2 border-black">
              <td className="border-r-2 border-black p-2 font-bold text-sm text-black">
                Total
              </td>
              {visiblePolls.map(poll => {
                const colTotal = decades.reduce((sum, decade) => sum + (matrix[decade]?.[poll] || 0), 0)
                return (
                  <td
                    key={`total-${poll}`}
                    className="border-r border-gray-300 p-2 text-center font-bold text-sm"
                  >
                    {colTotal}
                  </td>
                )
              })}
              <td className="p-2 text-center font-black text-sm">
                {films.length}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Tooltip */}
        {hoveredCell && hoveredCell.value > 0 && (() => {
          const containerRect = containerRef.current?.getBoundingClientRect()
          if (!containerRect) return null

          const tooltipWidth = 180
          const tooltipHeight = 80
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
              <p className="font-bold text-sm text-black uppercase tracking-wide">
                {hoveredCell.decade}s Films
              </p>
              <p className="text-xs text-gray-600 mb-1">
                in {hoveredCell.poll} Poll
              </p>
              <p className="text-2xl font-black text-black">
                {hoveredCell.value} {hoveredCell.value === 1 ? 'film' : 'films'}
              </p>
            </div>
          )
        })()}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm border-t-2 border-gray-200 pt-4">
        <span className="text-black font-bold uppercase tracking-wide">Films per cell:</span>
        <div className="flex items-center gap-2">
          {[0, 0.25, 0.5, 0.75, 1].map((intensity, idx) => (
            <div key={idx} className="flex items-center gap-1">
              <div
                className="w-6 h-4 border border-black"
                style={{ backgroundColor: getColor(intensity * maxValue, maxValue) }}
              />
              <span className="text-xs text-gray-600">
                {idx === 0 ? '0' : idx === 4 ? `${maxValue}+` : ''}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Insight */}
      {decades.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 text-sm">
          <span className="font-bold">Peak decade: </span>
          {(() => {
            let peakDecade = decades[0]
            let peakCount = 0
            decades.forEach(decade => {
              const total = visiblePolls.reduce((sum, poll) => sum + (matrix[decade]?.[poll] || 0), 0)
              if (total > peakCount) {
                peakCount = total
                peakDecade = decade
              }
            })
            return (
              <>
                {peakDecade}s with {peakCount} film appearances
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}
