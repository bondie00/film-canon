import { useMemo, useState, useRef } from 'react'
import { ALL_DECADES, decadeColumns } from '../../utils/decades'
import { TOOLTIP_BOX, TOOLTIP_TITLE, TOOLTIP_SUBTITLE, TOOLTIP_VALUE, TOOLTIP_DETAIL, TOOLTIP_WIDTH } from '../../utils/tooltip'

// Generate decades from 1890s to 2020s
const DECADES = ALL_DECADES

// All poll years for additive counting
const POLL_YEARS = [1952, 1962, 1972, 1982, 1992, 2002, 2012, 2022]

// Get adaptive rank tiers based on poll's max rank
const getRankTiers = (maxRank) => {
  if (maxRank <= 100) {
    // Small polls (1952, 1962): ~100-200 ranked films
    return [
      { label: '1-10', min: 1, max: 10 },
      { label: '11-25', min: 11, max: 25 },
      { label: '26-50', min: 26, max: 50 },
      { label: '51-100', min: 51, max: 100 },
      { label: '100+', min: 101, max: Infinity },
    ]
  } else if (maxRank <= 500) {
    // Medium polls (1972-2002): ~300-600 ranked films
    return [
      { label: '1-10', min: 1, max: 10 },
      { label: '11-50', min: 11, max: 50 },
      { label: '51-100', min: 51, max: 100 },
      { label: '101-250', min: 101, max: 250 },
      { label: '250+', min: 251, max: Infinity },
    ]
  } else {
    // Large polls (2012, 2022): 2000+ ranked films
    return [
      { label: '1-10', min: 1, max: 10 },
      { label: '11-50', min: 11, max: 50 },
      { label: '51-100', min: 51, max: 100 },
      { label: '101-250', min: 101, max: 250 },
      { label: '251-500', min: 251, max: 500 },
      { label: '500+', min: 501, max: Infinity },
    ]
  }
}

export default function DecadeRankHeatmap({ films, selectedPoll, topTarget = null, metric = 'films', continentColor }) {
  const [hoveredCell, setHoveredCell] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const containerRef = useRef(null)

  // Build decade × rank tier matrix with row-normalized coloring
  const { matrix, decades, hasData, tierTotals, decadeTotals, tierMaxValues, rankTiers, isAdditive } = useMemo(() => {
    const defaultTiers = getRankTiers(1000) // Default to large poll tiers
    if (!films || films.length === 0) {
      return { matrix: {}, decades: [], hasData: false, tierTotals: {}, decadeTotals: {}, tierMaxValues: {}, rankTiers: defaultTiers, isAdditive: false }
    }

    const isAllPolls = selectedPoll === 'all'

    // For "all polls" mode, use large tiers and additive counting
    // For single poll, find max rank to determine tier breakpoints
    let maxRankInPoll = 0
    if (!isAllPolls) {
      films.forEach(film => {
        const pollData = film.pollHistory?.find(p => p.year.toString() === selectedPoll.toString())
        if (pollData?.rank) {
          maxRankInPoll = Math.max(maxRankInPoll, pollData.rank)
        }
      })
    } else {
      maxRankInPoll = 1000 // Use large poll tiers for additive mode
    }

    // Get adaptive tiers based on poll size
    const allRankTiers = getRankTiers(maxRankInPoll)

    // Initialize matrix: decade -> tier -> count
    const matrix = {}
    DECADES.forEach(decade => {
      matrix[decade] = {}
      allRankTiers.forEach(tier => {
        matrix[decade][tier.label] = 0
      })
    })

    // Track totals and per-tier max values for row normalization
    const tierTotals = {}
    const tierMaxValues = {}
    allRankTiers.forEach(tier => {
      tierTotals[tier.label] = 0
      tierMaxValues[tier.label] = 0
    })
    const decadeTotals = {}

    // Process each film
    films.forEach(film => {
      // Parse year first (shared across modes)
      const yearStr = film.Year?.toString() || ''
      const year = parseInt(yearStr.split('-')[0])
      if (isNaN(year) || year < 1890) return

      const decade = Math.floor(year / 10) * 10
      const decadeKey = decade.toString()
      if (!matrix[decadeKey]) return

      if (isAllPolls) {
        // ADDITIVE MODE: Count appearances across ALL polls
        POLL_YEARS.forEach(pollYear => {
          const pollData = film.pollHistory?.find(p => p.year.toString() === pollYear.toString())
          if (!pollData || pollData.votes === 0 || !pollData.rank) return

          const tier = allRankTiers.find(t => pollData.rank >= t.min && pollData.rank <= t.max)
          if (!tier) return

          const value = metric === 'votes' ? pollData.votes : 1
          matrix[decadeKey][tier.label] += value
          tierTotals[tier.label] += value
          decadeTotals[decadeKey] = (decadeTotals[decadeKey] || 0) + value
          tierMaxValues[tier.label] = Math.max(tierMaxValues[tier.label], matrix[decadeKey][tier.label])
        })
      } else {
        // SINGLE POLL MODE: Count once per film
        const pollData = film.pollHistory?.find(p => p.year.toString() === selectedPoll.toString())
        if (!pollData || pollData.votes === 0 || !pollData.rank) return

        const tier = allRankTiers.find(t => pollData.rank >= t.min && pollData.rank <= t.max)
        if (!tier) return

        const value = metric === 'votes' ? pollData.votes : 1
        matrix[decadeKey][tier.label] += value
        tierTotals[tier.label] += value
        decadeTotals[decadeKey] = (decadeTotals[decadeKey] || 0) + value
        tierMaxValues[tier.label] = Math.max(tierMaxValues[tier.label], matrix[decadeKey][tier.label])
      }
    })

    // Filter out tiers that have no films (e.g., 100+ when the depth filter is tight)
    const rankTiers = allRankTiers.filter(tier => tierTotals[tier.label] > 0)

    // Fixed timeline frame; see utils/decades.
    const decades = decadeColumns(
      DECADES.filter(d => rankTiers.some(tier => matrix[d]?.[tier.label] > 0))
    )

    return {
      matrix,
      decades,
      hasData: decades.length > 0,
      tierTotals,
      decadeTotals,
      tierMaxValues,
      rankTiers,
      isAdditive: isAllPolls
    }
  }, [films, selectedPoll, topTarget, metric])

  // Get color intensity based on value (row-normalized)
  const getColor = (value, tierMax) => {
    if (value === 0 || tierMax === 0) return '#f3f4f6' // gray-100

    const intensity = value / tierMax
    const hex = continentColor.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)

    // Interpolate from light tint to full color
    const factor = 0.2 + intensity * 0.8
    const newR = Math.round(255 - (255 - r) * factor)
    const newG = Math.round(255 - (255 - g) * factor)
    const newB = Math.round(255 - (255 - b) * factor)

    return `rgb(${newR}, ${newG}, ${newB})`
  }

  const handleCellHover = (e, decade, tier, value) => {
    setMousePos({ x: e.clientX, y: e.clientY })
    const decadeTotal = decadeTotals[decade] || 0
    const tierTotal = tierTotals[tier] || 0
    const pctOfDecade = decadeTotal > 0 ? ((value / decadeTotal) * 100).toFixed(1) : '0'
    const pctOfTier = tierTotal > 0 ? ((value / tierTotal) * 100).toFixed(1) : '0'
    setHoveredCell({ decade, tier, value, pctOfDecade, pctOfTier, decadeTotal, tierTotal, isAdditive })
  }

  const handleCellLeave = () => {
    setHoveredCell(null)
  }

  if (!hasData) {
    return (
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 h-[25rem] flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">📊</div>
          <div className="font-bold mb-2">Not Enough Data</div>
          <div className="text-sm">
            No ranked films available for current filters
          </div>
        </div>
      </div>
    )
  }

  // Dimensions
  const CELL_HEIGHT = 44
  const LABEL_WIDTH = 80
  const ROW_GAP = 4

  return (
    <div>
      {/* Chart container */}
      <div
        ref={containerRef}
        className="bg-white overflow-x-auto"
        onMouseLeave={handleCellLeave}
      >
        <div className="flex">
          {/* Y-axis (Rank tiers) */}
          <div className="shrink-0 flex flex-col border-r-2 border-black" style={{ width: LABEL_WIDTH }}>
            {/* Y-axis label */}
            <div
              className="flex items-center justify-center text-xs font-bold uppercase tracking-wide text-gray-500 border-b border-gray-300"
              style={{ height: 24 }}
            >
              Rank Tier
            </div>

            {/* Y-axis tick labels */}
            <div className="flex-1 flex flex-col">
              {rankTiers.map((tier) => (
                <div
                  key={tier.label}
                  className="flex items-center justify-end pr-3 font-bold text-sm text-black border-b border-gray-200"
                  style={{ height: CELL_HEIGHT + ROW_GAP }}
                >
                  {tier.label}
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

            {/* Heatmap grid with horizontal grid lines */}
            <div className="flex-1 relative">
              {/* Horizontal grid lines (dashed) */}
              <div className="absolute inset-0 flex flex-col pointer-events-none" style={{ zIndex: 0 }}>
                {rankTiers.map((_, idx) => (
                  <div
                    key={idx}
                    className="border-b"
                    style={{
                      height: CELL_HEIGHT + ROW_GAP,
                      borderColor: '#d1d5db',
                      borderStyle: 'dashed'
                    }}
                  />
                ))}
              </div>

              {/* Cells - using row-normalized coloring */}
              <div className="relative" style={{ zIndex: 1 }}>
                {rankTiers.map((tier, tierIdx) => {
                  const tierMax = tierMaxValues[tier.label] || 1

                  return (
                    <div
                      key={tier.label}
                      className="flex"
                      style={{ height: CELL_HEIGHT, marginBottom: ROW_GAP }}
                    >
                      {decades.map((decade, decadeIdx) => {
                        const value = matrix[decade]?.[tier.label] || 0

                        return (
                          <div
                            key={`${decade}-${tier.label}`}
                            className="flex-1 flex items-center justify-center cursor-pointer transition-all hover:opacity-80"
                            style={{
                              backgroundColor: getColor(value, tierMax),
                              minWidth: 50,
                              border: value > 0 ? '1px solid #000000' : '1px solid #e5e7eb',
                              marginRight: decadeIdx < decades.length - 1 ? 2 : 0
                            }}
                            onMouseEnter={(e) => handleCellHover(e, decade, tier.label, value)}
                            onMouseMove={(e) => handleCellHover(e, decade, tier.label, value)}
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
          const tooltipHeight = 120
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
                width: TOOLTIP_WIDTH,
                transition: 'left 0.08s ease-out, top 0.08s ease-out'
              }}
            >
              {/* Row identity, then column, then value — matching the other heatmaps. */}
              <p className={TOOLTIP_TITLE}>Rank {hoveredCell.tier}</p>
              <p className={TOOLTIP_SUBTITLE}>{hoveredCell.decade}s</p>
              <p className={TOOLTIP_VALUE}>
                {hoveredCell.value} {metric === 'votes'
                  ? 'votes'
                  : hoveredCell.isAdditive
                    ? (hoveredCell.value === 1 ? 'appearance' : 'appearances')
                    : (hoveredCell.value === 1 ? 'film' : 'films')}
              </p>
              <p className={TOOLTIP_DETAIL}>
                {hoveredCell.pctOfDecade}% of {hoveredCell.decade}s {metric === 'votes' ? 'votes' : hoveredCell.isAdditive ? 'appearances' : 'films'}
              </p>
              <p className={TOOLTIP_DETAIL}>
                {hoveredCell.pctOfTier}% of rank {hoveredCell.tier} {metric === 'votes' ? 'votes' : hoveredCell.isAdditive ? 'appearances' : 'films'}
              </p>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
