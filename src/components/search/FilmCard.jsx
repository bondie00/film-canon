import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Dot } from 'recharts'

const POLL_YEARS = [1952, 1962, 1972, 1982, 1992, 2002, 2012, 2022]

export default function FilmCard({ film, activePoll }) {
  const [expanded, setExpanded] = useState(false)

  const getActivePollData = () => {
    if (activePoll === 'all') {
      return film.pollHistory.find(p => p.year === 'all') || { rank: null, votes: 0 }
    }
    return film.pollHistory.find(p => p.year === parseInt(activePoll)) || { rank: null, votes: 0 }
  }

  const activePollData = getActivePollData()

  // Count how many polls this film appeared in (for "all polls" display)
  const pollAppearances = useMemo(() => {
    return film.pollHistory.filter(p => p.year !== 'all' && p.votes > 0).length
  }, [film.pollHistory])

  // Build chart data for Recharts
  const chartData = useMemo(() => {
    return POLL_YEARS.map(year => {
      const pollData = film.pollHistory.find(p => p.year === year)
      const hasVotes = pollData && pollData.votes > 0
      return {
        year: `'${year.toString().slice(2)}`,
        yearNum: year,
        rank: hasVotes && pollData.rank ? pollData.rank : null,
        votes: pollData?.votes || 0,
      }
    })
  }, [film.pollHistory])

  // Calculate Y domain — use the film's own rank range for better scaling
  const yDomain = useMemo(() => {
    const ranks = chartData.filter(d => d.rank !== null).map(d => d.rank)
    if (ranks.length === 0) return [1, 100]
    const minRank = Math.min(...ranks)
    const maxRank = Math.max(...ranks)
    // Add some padding: go a bit above #1 and below the worst rank
    const upper = Math.max(maxRank * 1.3, minRank + 5)
    return [Math.max(1, minRank - 1), Math.ceil(upper)]
  }, [chartData])

  const hasHistory = chartData.some(d => d.rank !== null)

  // Custom dot to highlight active poll
  const CustomDot = (props) => {
    const { cx, cy, payload } = props
    if (cx === undefined || cy === undefined || payload.rank === null) return null
    const isActive = activePoll !== 'all' && parseInt(activePoll) === payload.yearNum
    return (
      <circle
        cx={cx}
        cy={cy}
        r={isActive ? 5 : 3}
        fill={isActive ? '#000' : '#000'}
        stroke="#fff"
        strokeWidth={isActive ? 2 : 1.5}
      />
    )
  }

  return (
    <div className={`bg-white border-2 border-black transition-all ${expanded ? '' : 'hover:bg-gray-50'}`}>
      {/* Header — always visible */}
      <div
        className="flex items-center gap-4 px-5 py-3.5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-xs text-gray-400 flex-shrink-0">
          {expanded ? '▼' : '▶'}
        </span>

        <div className="flex-1 min-w-0">
          <span className="font-bold text-black text-base leading-tight">
            {film.FilmTitle}
          </span>
          {expanded ? (
            <>
              {film.AlternateTitle && (
                <div className="text-sm text-gray-500 italic mt-0.5">
                  {film.AlternateTitle}
                </div>
              )}
              <div className="text-sm text-gray-600 mt-0.5">
                Directed by {film.directors.join(', ')}
              </div>
              <div className="text-sm text-gray-600 mt-0.5">
                {film.countries.join(', ')}, {film.Year}
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-600 mt-0.5">
              {film.directors.join(', ')}
              <span className="text-gray-300 mx-1.5">·</span>
              {film.countries.join(', ')}
              <span className="text-gray-300 mx-1.5">·</span>
              {film.Year}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 flex items-center gap-3">
          {activePoll === 'all' ? (
            <span className="text-sm font-semibold text-black">
              {activePollData.votes.toLocaleString()} total votes
            </span>
          ) : (
            <>
              {activePollData.rank && (
                <span className="text-lg font-black text-black">
                  #{activePollData.rank}
                </span>
              )}
              <span className="text-sm font-semibold text-gray-500">
                {activePollData.votes.toLocaleString()} {activePollData.votes === 1 ? 'vote' : 'votes'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="px-5 py-4">
          {hasHistory && (
            <div>
              {/* Recharts line chart */}
              <div className="mb-2">
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickLine={false}
                    />
                    <YAxis
                      reversed
                      domain={yDomain}
                      tick={{ fontSize: 10, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                      width={30}
                      tickFormatter={(v) => `#${v}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="rank"
                      stroke="#000000"
                      strokeWidth={2}
                      connectNulls
                      dot={<CustomDot />}
                      activeDot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Horizontal data row */}
              <div className="grid grid-cols-8 text-center pt-2">
                {POLL_YEARS.map(year => {
                  const pollData = film.pollHistory.find(p => p.year === year)
                  const hasVotes = pollData && pollData.votes > 0
                  const isActive = activePoll !== 'all' && parseInt(activePoll) === year

                  return (
                    <div
                      key={year}
                      className={`py-1 ${isActive ? 'bg-black text-white' : ''}`}
                    >
                      {hasVotes ? (
                        <>
                          <div className={`text-sm font-black ${isActive ? 'text-white' : 'text-black'}`}>
                            {pollData.rank ? `#${pollData.rank}` : '—'}
                          </div>
                          <div className={`text-xs ${isActive ? 'text-gray-400' : 'text-gray-500'}`}>
                            {pollData.votes.toLocaleString()} {pollData.votes === 1 ? 'vote' : 'votes'}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className={`text-sm ${isActive ? 'text-gray-600' : 'text-gray-300'}`}>—</div>
                          <div className={`text-xs ${isActive ? 'text-gray-600' : 'text-gray-300'}`}>—</div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {!hasHistory && (
            <div className="text-sm text-gray-500 text-center py-2">
              No ranking history available
            </div>
          )}
        </div>
      )}
    </div>
  )
}
