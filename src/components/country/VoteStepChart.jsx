import { useMemo, useState, useRef } from 'react'

export default function VoteStepChart({ films, selectedPoll, continentColor }) {
  const [hoveredFilm, setHoveredFilm] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const containerRef = useRef(null)

  // Get top films sorted by votes
  const { topFilms, maxVotes } = useMemo(() => {
    if (!films || films.length === 0) {
      return { topFilms: [], maxVotes: 0 }
    }

    const pollKey = selectedPoll === 'all' ? 'all' : parseInt(selectedPoll)

    // Get films with vote data and sort by votes descending
    const filmsWithVotes = films
      .map(film => {
        const pollData = film.pollHistory.find(p =>
          pollKey === 'all' ? p.year === 'all' : p.year === pollKey
        )
        return {
          ...film,
          votes: pollData?.votes || 0,
          rank: pollData?.rank || null
        }
      })
      .filter(f => f.votes > 0)
      .sort((a, b) => b.votes - a.votes)
      .slice(0, 15) // Top 15 films

    const maxVotes = filmsWithVotes.length > 0 ? filmsWithVotes[0].votes : 0

    return { topFilms: filmsWithVotes, maxVotes }
  }, [films, selectedPoll])

  // SVG dimensions
  const width = 700
  const height = 350
  const margin = { top: 30, right: 30, bottom: 60, left: 60 }
  const plotWidth = width - margin.left - margin.right
  const plotHeight = height - margin.top - margin.bottom

  // Scales
  const xScale = (index) => {
    return margin.left + (index / (topFilms.length - 1 || 1)) * plotWidth
  }

  const yScale = (votes) => {
    return margin.top + plotHeight - (votes / (maxVotes || 1)) * plotHeight
  }

  // Generate step path
  const stepPath = useMemo(() => {
    if (topFilms.length === 0) return ''

    let path = `M ${xScale(0)} ${yScale(topFilms[0].votes)}`

    for (let i = 1; i < topFilms.length; i++) {
      // Horizontal line to next x position
      path += ` H ${xScale(i)}`
      // Vertical line down to next vote level
      path += ` V ${yScale(topFilms[i].votes)}`
    }

    return path
  }, [topFilms, maxVotes])

  // Y-axis ticks
  const yTicks = useMemo(() => {
    if (maxVotes === 0) return []
    const step = maxVotes <= 50 ? 10 : maxVotes <= 100 ? 20 : maxVotes <= 200 ? 25 : 50
    const ticks = []
    for (let i = 0; i <= maxVotes; i += step) {
      ticks.push(i)
    }
    if (ticks[ticks.length - 1] < maxVotes) {
      ticks.push(Math.ceil(maxVotes / step) * step)
    }
    return ticks
  }, [maxVotes])

  const handleFilmHover = (e, film, index) => {
    setMousePos({ x: e.clientX, y: e.clientY })
    setHoveredFilm({ ...film, index })
  }

  const handleMouseLeave = () => {
    setHoveredFilm(null)
  }

  if (topFilms.length === 0) {
    return (
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 h-[350px] flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">📊</div>
          <div className="font-bold mb-2">No Films to Display</div>
          <div className="text-sm">Try adjusting the filters</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div
        ref={containerRef}
        className="border-2 border-black bg-white"
        onMouseLeave={handleMouseLeave}
      >
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
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
          </g>

          {/* Y-axis */}
          <g className="y-axis">
            <line
              x1={margin.left}
              y1={margin.top}
              x2={margin.left}
              y2={margin.top + plotHeight}
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
              y={margin.top + plotHeight / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={12}
              fontWeight="bold"
              transform={`rotate(-90, 20, ${margin.top + plotHeight / 2})`}
            >
              Votes
            </text>
          </g>

          {/* X-axis */}
          <g className="x-axis">
            <line
              x1={margin.left}
              y1={margin.top + plotHeight}
              x2={width - margin.right}
              y2={margin.top + plotHeight}
              stroke="#000"
              strokeWidth={2}
            />
            <text
              x={margin.left + plotWidth / 2}
              y={height - 10}
              textAnchor="middle"
              fontSize={12}
              fontWeight="bold"
            >
              Country Rank (by votes)
            </text>
          </g>

          {/* Step path */}
          <path
            d={stepPath}
            fill="none"
            stroke={continentColor}
            strokeWidth={3}
          />

          {/* Fill area under steps */}
          <path
            d={`${stepPath} V ${margin.top + plotHeight} H ${xScale(0)} Z`}
            fill={continentColor}
            opacity={0.15}
          />

          {/* Data points */}
          {topFilms.map((film, i) => {
            const cx = xScale(i)
            const cy = yScale(film.votes)
            const isHovered = hoveredFilm?.key === film.key

            // Calculate drop from previous film
            const drop = i > 0 ? topFilms[i - 1].votes - film.votes : 0

            return (
              <g key={film.key}>
                {/* Drop annotation for significant drops */}
                {drop > 10 && (
                  <g>
                    <line
                      x1={cx - 3}
                      y1={yScale(topFilms[i - 1].votes)}
                      x2={cx - 3}
                      y2={cy}
                      stroke="#999"
                      strokeWidth={1}
                      strokeDasharray="2,2"
                    />
                    <text
                      x={cx - 8}
                      y={(yScale(topFilms[i - 1].votes) + cy) / 2}
                      textAnchor="end"
                      dominantBaseline="middle"
                      fontSize={9}
                      fill="#666"
                    >
                      -{drop}
                    </text>
                  </g>
                )}

                {/* Data point */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 8 : 6}
                  fill={continentColor}
                  stroke="#000"
                  strokeWidth={isHovered ? 2 : 1.5}
                  style={{ cursor: 'pointer', transition: 'r 0.1s' }}
                  onMouseEnter={(e) => handleFilmHover(e, film, i)}
                  onMouseMove={(e) => handleFilmHover(e, film, i)}
                />

                {/* Rank label below point */}
                <text
                  x={cx}
                  y={margin.top + plotHeight + 18}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight="500"
                >
                  {i + 1}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Tooltip */}
        {hoveredFilm && (() => {
          const containerRect = containerRef.current?.getBoundingClientRect()
          if (!containerRect) return null

          const tooltipWidth = 240
          const tooltipHeight = 100
          const offset = 12

          const isRightHalf = mousePos.x > window.innerWidth / 2
          let tooltipX = isRightHalf ? mousePos.x - tooltipWidth - offset : mousePos.x + offset

          const isBottomHalf = mousePos.y > containerRect.top + containerRect.height / 2
          let tooltipY = isBottomHalf ? mousePos.y - tooltipHeight - offset : mousePos.y + offset

          const drop = hoveredFilm.index > 0
            ? topFilms[hoveredFilm.index - 1].votes - hoveredFilm.votes
            : 0

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
                  <span className="font-bold text-black">#{hoveredFilm.index + 1}</span>
                  <span className="text-gray-600 ml-1">in country</span>
                </div>
                <div>
                  <span className="font-bold text-black">{hoveredFilm.votes}</span>
                  <span className="text-gray-600 ml-1">votes</span>
                </div>
              </div>
              {drop > 0 && (
                <div className="text-xs text-gray-500 mt-1 border-t border-gray-200 pt-1">
                  {drop} fewer votes than #{hoveredFilm.index}
                </div>
              )}
            </div>
          )
        })()}
      </div>

      {/* Summary stats */}
      <div className="mt-4 flex justify-between text-sm border-t-2 border-gray-200 pt-4">
        <div>
          <span className="font-bold text-black">Top film:</span>
          <span className="text-gray-600 ml-1">{topFilms[0]?.FilmTitle} ({topFilms[0]?.votes} votes)</span>
        </div>
        {topFilms.length > 1 && (
          <div>
            <span className="font-bold text-black">Gap to #2:</span>
            <span className="text-gray-600 ml-1">{topFilms[0].votes - topFilms[1].votes} votes</span>
          </div>
        )}
      </div>
    </div>
  )
}
