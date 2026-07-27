import { useMemo, useState, useRef } from 'react'
import { TOOLTIP_BOX, TOOLTIP_TITLE, TOOLTIP_SUBTITLE, TOOLTIP_VALUE, TOOLTIP_DETAIL, TOOLTIP_WIDTH } from '../../utils/tooltip'
import { hierarchy, pack } from 'd3-hierarchy'

// Base dimensions
const BASE_WIDTH = 800
const BASE_HEIGHT = 400

export default function DirectorsTreemap({ films, selectedPoll, metric = 'films', continentColor }) {
  const unit = metric === 'votes' ? 'votes' : 'films'
  const one = metric === 'votes' ? 'votes' : 'film'
  const [hoveredNode, setHoveredNode] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const containerRef = useRef(null)

  // Aggregate directors from films
  const { packedData, topDirectors, totalFilms } = useMemo(() => {
    if (!films || films.length === 0) {
      return { packedData: null, topDirectors: [], totalFilms: 0 }
    }

    // Each director's total for the active metric: one per film, or that film's
    // votes in the active poll.
    const pollKey = selectedPoll === 'all' ? 'all' : parseInt(selectedPoll, 10)
    const valueOf = (film) => {
      if (metric !== 'votes') return 1
      return film.pollHistory?.find(p => p.year === pollKey)?.votes || 0
    }
    const directorCounts = {}
    let grandTotal = 0
    films.forEach(film => {
      const value = valueOf(film)
      grandTotal += value
      film.directors.forEach(director => {
        if (director && director !== '(unknown)') {
          directorCounts[director] = (directorCounts[director] || 0) + value
        }
      })
    })

    // Sort and take top directors
    const sorted = Object.entries(directorCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    // Take top 30 for visualization
    const topDirectors = sorted.slice(0, 30)

    if (topDirectors.length === 0) {
      return { packedData: null, topDirectors: [], totalFilms: grandTotal }
    }

    // Create hierarchy data for D3 circle packing
    const hierarchyData = {
      name: 'root',
      children: topDirectors.map(d => ({
        name: d.name,
        value: d.count,
        count: d.count
      }))
    }

    const root = hierarchy(hierarchyData)
      .sum(d => d.value || 0)
      .sort((a, b) => b.value - a.value)

    const packLayout = pack()
      .size([BASE_WIDTH, BASE_HEIGHT])
      .padding(3)

    const packed = packLayout(root)

    return {
      packedData: packed,
      topDirectors,
      totalFilms: grandTotal
    }
  }, [films])

  const handleNodeMouseMove = (e, node) => {
    setMousePos({ x: e.clientX, y: e.clientY })
    setHoveredNode(node)
  }

  const handleNodeMouseLeave = () => {
    setHoveredNode(null)
  }

  // Color scale based on count
  const getColor = (count, maxCount) => {
    const intensity = 0.3 + (count / maxCount) * 0.7
    // Parse the continent color and adjust brightness
    const hex = continentColor.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)

    // Darker for higher counts
    const factor = intensity
    return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`
  }

  if (!packedData || topDirectors.length === 0) {
    return (
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 h-[25rem] flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">🎬</div>
          <div className="font-bold mb-2">Not Enough Data</div>
          <div className="text-sm">
            No directors found for the current filter settings
          </div>
        </div>
      </div>
    )
  }

  const maxCount = topDirectors[0].count
  const directorNodes = packedData.descendants().filter(d => d.depth === 1)

  return (
    <div>
      {/* Circle Packing Visualization */}
      <div
        ref={containerRef}
        className="border-2 border-black bg-gray-50 relative"
        style={{ height: '25rem' }}
        onMouseLeave={handleNodeMouseLeave}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${BASE_WIDTH} ${BASE_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {directorNodes.map((node, i) => {
            const isHovered = hoveredNode && hoveredNode.data.name === node.data.name
            const color = getColor(node.data.count, maxCount)

            // Show label if circle is large enough
            const showLabel = node.r > 25
            const showCount = node.r > 15 && !showLabel

            // Truncate name to fit
            let displayName = ''
            if (showLabel) {
              const maxChars = Math.floor(node.r / 4)
              displayName = node.data.name.length > maxChars
                ? node.data.name.substring(0, maxChars - 1) + '…'
                : node.data.name
            }

            return (
              <g
                key={`director-${i}`}
                onMouseMove={(e) => handleNodeMouseMove(e, node)}
                onMouseLeave={handleNodeMouseLeave}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.r}
                  fill={color}
                  stroke="#000000"
                  strokeWidth={isHovered ? 3 : 1}
                  style={{
                    transition: 'stroke-width 0.15s ease',
                    filter: isHovered ? 'brightness(1.15)' : 'none'
                  }}
                />
                {showLabel && (
                  <>
                    <text
                      x={node.x}
                      y={node.y - 5}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#000000"
                      fontSize={Math.min(11, node.r / 4)}
                      fontWeight="600"
                      style={{
                        pointerEvents: 'none',
                        textShadow: '-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff'
                      }}
                    >
                      {displayName}
                    </text>
                    <text
                      x={node.x}
                      y={node.y + 8}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#000000"
                      fontSize={Math.min(10, node.r / 5)}
                      fontWeight="bold"
                      style={{
                        pointerEvents: 'none',
                        textShadow: '-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff'
                      }}
                    >
                      {node.data.count}
                    </text>
                  </>
                )}
                {showCount && (
                  <text
                    x={node.x}
                    y={node.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#000000"
                    fontSize={Math.min(10, node.r / 2)}
                    fontWeight="bold"
                    style={{
                      pointerEvents: 'none',
                      textShadow: '-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff'
                    }}
                  >
                    {node.data.count}
                  </text>
                )}
              </g>
            )
          })}
        </svg>

        {/* Tooltip */}
        {hoveredNode && (() => {
          const containerRect = containerRef.current?.getBoundingClientRect()
          if (!containerRect) return null

          const tooltipWidth = TOOLTIP_WIDTH
          const tooltipHeight = 100
          const offset = 10

          const isRightHalf = mousePos.x > window.innerWidth / 2
          let tooltipX = isRightHalf ? mousePos.x - tooltipWidth - offset : mousePos.x + offset

          const containerMidY = containerRect.top + containerRect.height / 2
          const isBottomHalf = mousePos.y > containerMidY
          let tooltipY = isBottomHalf ? mousePos.y - tooltipHeight - offset : mousePos.y + offset

          const minY = containerRect.top
          const maxY = containerRect.bottom - tooltipHeight
          tooltipY = Math.max(minY, Math.min(maxY, tooltipY))

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
              <p className={TOOLTIP_TITLE}>{hoveredNode.data.name}</p>
              <p className={TOOLTIP_VALUE}>
                {hoveredNode.data.count} {hoveredNode.data.count === 1 ? one : unit}
              </p>
              <p className={TOOLTIP_DETAIL}>
                {((hoveredNode.data.count / totalFilms) * 100).toFixed(1)}% of country's {unit}
              </p>
            </div>
          )
        })()}
      </div>

      {/* Top Directors List */}
      <div className="mt-4 border-t-2 border-gray-200 pt-4">
        <div className="text-sm font-bold uppercase tracking-wide text-black mb-3">
          Top Directors ({topDirectors.length} shown)
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {topDirectors.slice(0, 10).map((director, idx) => (
            <div
              key={director.name}
              className="flex items-center gap-2 p-2 border border-gray-200 bg-white"
            >
              <div
                className="w-6 h-6 flex items-center justify-center text-xs font-bold text-white border border-black"
                style={{ backgroundColor: continentColor }}
              >
                {idx + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm text-black truncate">
                  {director.name}
                </div>
                <div className="text-xs text-gray-600">
                  {director.count} {director.count === 1 ? one : unit}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
