import { useMemo, useState, useRef, useCallback } from 'react'
import { ALL_DECADES, decadeColumns } from '../../utils/decades'
import CountryPanel from './CountryPanel'
import { TOOLTIP_BOX, TOOLTIP_TITLE, TOOLTIP_SUBTITLE, TOOLTIP_VALUE, TOOLTIP_DETAIL, TOOLTIP_WIDTH } from '../../utils/tooltip'

// Poll years for rows (reversed so 2022 is at top)
const POLL_YEARS = ['2022', '2012', '2002', '1992', '1982', '1972', '1962', '1952']

const DECADES = ALL_DECADES

const decadeOfYear = (y) => {
  const n = parseInt(String(y ?? '').split(/[-–]/)[0], 10)
  return isNaN(n) ? null : String(Math.floor(n / 10) * 10)
}

export default function DecadeHeatmapRows({ films, countryName, topTarget = null, cutoffByPoll = {}, metric = 'films', continentColor }) {
  const unit = metric === 'votes' ? 'votes' : 'films'
  const one = metric === 'votes' ? 'votes' : 'film'
  const [hoveredCell, setHoveredCell] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const containerRef = useRef(null)
  const expandedPanelRef = useRef(null)
  // { poll, decade } for the expanded panel. Each cell is one poll's films from one
  // decade — a set that appears nowhere else on the page, since the All Films grid
  // below only ever lists the poll currently selected.
  const [selectedCell, setSelectedCell] = useState(null)

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

      // Count appearances in each poll. Every row applies ITS OWN poll's rank
      // cutoff, so "Top 100" means that poll's top 100 here exactly as it does
      // everywhere else on the site.
      film.pollHistory.forEach(poll => {
        if (!(poll.votes > 0) || poll.year === 'all') return
        const pollKey = poll.year.toString()
        if (!matrix[pollKey] || matrix[pollKey][decadeKey] === undefined) return
        const cutoff = cutoffByPoll[pollKey]
        if (cutoff != null && (poll.rank == null || poll.rank > cutoff)) return
        matrix[pollKey][decadeKey] += metric === 'votes' ? poll.votes : 1
      })
    })

    // Calculate max value for each row (for row-normalized coloring)
    const rowMaxValues = {}
    POLL_YEARS.forEach(poll => {
      rowMaxValues[poll] = Math.max(...Object.values(matrix[poll]), 0)
    })

    // Fixed timeline frame; see utils/decades.
    const decades = decadeColumns(
      DECADES.filter(d => POLL_YEARS.some(poll => matrix[poll][d] > 0))
    )

    return {
      matrix,
      decades,
      rowMaxValues,
      hasData: decades.length > 0
    }
  }, [films, metric, cutoffByPoll])

  const openPanel = useCallback((poll, decade, value) => {
    if (value <= 0 || selectedCell) return
    setHoveredCell(null)
    setSelectedCell({ poll, decade })
  }, [selectedCell])

  const closePanel = useCallback(() => setSelectedCell(null), [])

  // Derived from the same inputs as the cell, so the panel's count always matches
  // the number printed in the cell you clicked.
  const panelFilms = useMemo(() => {
    if (!selectedCell || !films) return []
    const { poll, decade } = selectedCell
    return films
      .filter(f => decadeOfYear(f.Year) === decade)
      .map(f => {
        const entry = f.pollHistory?.find(x => x.year.toString() === poll)
        if (!entry || !(entry.votes > 0)) return null
        const cutoff = cutoffByPoll[poll]
        if (cutoff != null && (entry.rank == null || entry.rank > cutoff)) return null
        return { f, votes: entry.votes, rank: entry.rank ?? null }
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (b.votes !== a.votes) return b.votes - a.votes
        if (a.rank && b.rank) return a.rank - b.rank
        return 0
      })
      .map(x => x.f)
  }, [selectedCell, films, cutoffByPoll])

  // Keep the grid tall enough to hold the panel.
  const panelMinHeight = useMemo(() => {
    if (!selectedCell) return undefined
    return `${Math.max(280, Math.min(230 + panelFilms.length * 42, 448))}px`
  }, [selectedCell, panelFilms])

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
    setHoveredCell({ poll, decade, value, rowMax })
  }

  const handleCellLeave = () => {
    setHoveredCell(null)
  }

  if (!hasData) {
    return (
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 h-[25rem] flex items-center justify-center">
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

  // Heatmap view (always shown)
  return (
    <div className="relative" style={panelMinHeight ? { minHeight: panelMinHeight } : undefined}>
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
              {/* Every poll gets a row, even an empty one: the axis is then identical
                  on every country page, and an empty row says when a country entered
                  the canon — which is invisible if absence renders as nothing. */}
              {POLL_YEARS.map((poll) => {
                const rowTotal = Object.values(matrix[poll]).reduce((a, b) => a + b, 0)

                return (
                  <div
                    key={poll}
                    className="flex items-center justify-end pr-3 font-bold text-sm border-b border-gray-200"
                    style={{
                      height: CELL_HEIGHT + ROW_GAP,
                      color: rowTotal === 0 ? '#9ca3af' : '#000'
                    }}
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

                return (
                  <div
                    key={poll}
                    className="flex items-stretch border-b border-gray-200"
                    style={{
                      height: CELL_HEIGHT,
                      marginBottom: ROW_GAP
                    }}
                  >
                    {decades.map((decade, idx) => {
                      const value = matrix[poll]?.[decade] || 0
                      const bgColor = getColor(value, rowMax)
                      const isLast = idx === decades.length - 1

                      return (
                        <div
                          key={`${poll}-${decade}`}
                          className={`flex-1 flex items-center justify-center ${value > 0 ? 'cursor-pointer' : 'cursor-default'} transition-all hover:ring-2 hover:ring-black hover:ring-inset border-t border-b border-gray-400 ${!isLast ? 'border-r border-r-gray-300' : 'border-r border-r-gray-400'} ${idx === 0 ? 'border-l border-l-gray-400' : ''}`}
                          style={{
                            backgroundColor: bgColor,
                            minWidth: 50
                          }}
                          onMouseEnter={(e) => handleCellHover(e, poll, decade, value, rowMax)}
                          onMouseMove={(e) => handleCellHover(e, poll, decade, value, rowMax)}
                          onMouseLeave={handleCellLeave}
                          onClick={() => openPanel(poll, decade, value)}
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
        {!selectedCell && hoveredCell && hoveredCell.value > 0 && (() => {
          const containerRect = containerRef.current?.getBoundingClientRect()
          if (!containerRect) return null

          const tooltipWidth = TOOLTIP_WIDTH
          const tooltipHeight = 84
          const offset = 10

          const isRightHalf = mousePos.x > window.innerWidth / 2
          let tooltipX = isRightHalf ? mousePos.x - tooltipWidth - offset : mousePos.x + offset

          const containerMidY = containerRect.top + containerRect.height / 2
          const isBottomHalf = mousePos.y > containerMidY
          let tooltipY = isBottomHalf ? mousePos.y - tooltipHeight - offset : mousePos.y + offset

          return (
            <div
              className={`fixed pointer-events-none z-50 ${TOOLTIP_BOX}`}
              style={{
                left: tooltipX,
                top: tooltipY,
                width: tooltipWidth,
                transition: 'left 0.08s ease-out, top 0.08s ease-out'
              }}
            >
              {/* Row identity, then column, then value — the same order the other
                  heatmaps use, so the three read alike. */}
              <p className={TOOLTIP_TITLE}>{hoveredCell.poll} Poll</p>
              <p className={TOOLTIP_SUBTITLE}>{hoveredCell.decade}s</p>
              <p className={TOOLTIP_VALUE}>
                {hoveredCell.value} {hoveredCell.value === 1 ? one : unit}
              </p>
              {hoveredCell.value === hoveredCell.rowMax && (
                <p className={`${TOOLTIP_DETAIL} font-bold`} style={{ color: continentColor }}>
                  Peak decade
                </p>
              )}
            </div>
          )
        })()}
      </div>

      {/* Expanded panel. selectedPoll is the CELL's poll, not the page's, so each
          tile's rank strip highlights the poll you clicked into. */}
      {selectedCell && (
        <CountryPanel
          name={countryName}
          films={panelFilms}
          metric={metric}
          selectedPoll={selectedCell.poll}
          topTarget={topTarget}
          subtitle={`${selectedCell.poll} · ${selectedCell.decade}s`}
          yearRange={{ start: Number(selectedCell.decade), end: Number(selectedCell.decade) + 9 }}
          onClose={closePanel}
          panelRef={expandedPanelRef}
        />
      )}
    </div>
  )
}
