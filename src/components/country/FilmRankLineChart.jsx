import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

// Poll years in order
const POLL_YEARS = [1952, 1962, 1972, 1982, 1992, 2002, 2012, 2022]

// Color palette for different films
const LINE_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
]

export default function FilmRankLineChart({ films, continentColor }) {
  // Select top films that appeared in 2+ polls
  const { chartData, topFilms, hasData } = useMemo(() => {
    // Filter films with 2+ poll appearances
    const multiPollFilms = films.filter(film => {
      const appearances = film.pollHistory.filter(p => p.rank !== null && p.rank <= 500).length
      return appearances >= 2
    })

    if (multiPollFilms.length === 0) {
      return { chartData: [], topFilms: [], hasData: false }
    }

    // Sort by best rank ever achieved
    const sorted = multiPollFilms.sort((a, b) => {
      const bestA = Math.min(...a.pollHistory.filter(p => p.rank).map(p => p.rank))
      const bestB = Math.min(...b.pollHistory.filter(p => p.rank).map(p => p.rank))
      return bestA - bestB
    })

    // Take top 8 films
    const topFilms = sorted.slice(0, 8)

    // Build chart data - one entry per poll year
    const chartData = POLL_YEARS.map(year => {
      const entry = { year: year.toString() }

      topFilms.forEach((film, index) => {
        const pollData = film.pollHistory.find(p => p.year === year)
        // Only include if ranked (not null and reasonably ranked)
        if (pollData?.rank && pollData.rank <= 500) {
          entry[`film${index}`] = pollData.rank
        }
      })

      return entry
    })

    return { chartData, topFilms, hasData: true }
  }, [films])

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null

    return (
      <div className="bg-white border-2 border-black p-3 shadow-lg">
        <div className="font-bold text-black mb-2">{label} Poll</div>
        {payload
          .filter(p => p.value !== undefined)
          .sort((a, b) => a.value - b.value)
          .map((entry, idx) => (
            <div key={idx} className="text-sm flex items-center gap-2">
              <div
                className="w-3 h-3 border border-black"
                style={{ backgroundColor: entry.color }}
              />
              <span className="font-medium" style={{ color: entry.color }}>
                #{entry.value}
              </span>
              <span className="text-gray-600 truncate max-w-[200px]">
                {entry.name}
              </span>
            </div>
          ))}
      </div>
    )
  }

  if (!hasData) {
    return (
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 h-[25rem] flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">📊</div>
          <div className="font-bold mb-2">Not Enough Data</div>
          <div className="text-sm">
            Need films that appeared in at least 2 polls to show rank progression
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="h-[25rem]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 12, fontWeight: 'bold' }}
            tickLine={{ stroke: '#000' }}
            axisLine={{ stroke: '#000', strokeWidth: 2 }}
          />
          <YAxis
            reversed
            domain={[1, 'dataMax + 20']}
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: '#000' }}
            axisLine={{ stroke: '#000', strokeWidth: 2 }}
            label={{
              value: 'Rank (lower is better)',
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle', fontWeight: 'bold', fontSize: 12 }
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            wrapperStyle={{ paddingTop: '20px' }}
            formatter={(value, entry) => (
              <span className="text-xs font-medium text-gray-700">
                {topFilms[parseInt(value.replace('film', ''))]?.FilmTitle.slice(0, 30)}
                {topFilms[parseInt(value.replace('film', ''))]?.FilmTitle.length > 30 ? '...' : ''}
              </span>
            )}
          />
          {topFilms.map((film, index) => (
            <Line
              key={film.key}
              type="monotone"
              dataKey={`film${index}`}
              name={film.FilmTitle}
              stroke={LINE_COLORS[index % LINE_COLORS.length]}
              strokeWidth={3}
              dot={{
                r: 5,
                fill: LINE_COLORS[index % LINE_COLORS.length],
                stroke: '#000',
                strokeWidth: 1
              }}
              activeDot={{
                r: 8,
                fill: LINE_COLORS[index % LINE_COLORS.length],
                stroke: '#000',
                strokeWidth: 2
              }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      </div>

      {/* Film Legend with Full Names */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm border-t-2 border-gray-200 pt-4">
        {topFilms.map((film, index) => (
          <div key={film.key} className="flex items-start gap-2">
            <div
              className="w-4 h-4 flex-shrink-0 border border-black mt-0.5"
              style={{ backgroundColor: LINE_COLORS[index % LINE_COLORS.length] }}
            />
            <div>
              <div className="font-bold text-black leading-tight">{film.FilmTitle}</div>
              <div className="text-xs text-gray-600">{film.Year}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
