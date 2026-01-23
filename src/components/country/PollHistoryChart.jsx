import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend
} from 'recharts'

const POLL_YEARS = [1952, 1962, 1972, 1982, 1992, 2002, 2012, 2022]

export default function PollHistoryChart({
  films,
  filmsData,
  countryName,
  selectedPoll,
  rankRange,
  continentColor
}) {
  // Calculate percentage share per poll for this country
  const chartData = useMemo(() => {
    if (!filmsData || !countryName) return []

    return POLL_YEARS.map(pollYear => {
      // Count ALL films in this poll (applying rank filter)
      const allFilmsInPoll = filmsData.filter(film => {
        const pollData = film.pollHistory.find(p => p.year === pollYear)
        if (!pollData || pollData.votes === 0) return false

        if (rankRange === 'top100') {
          return pollData.rank && pollData.rank <= 100
        }
        return true
      })

      // Count films from THIS COUNTRY in this poll
      const countryFilmsInPoll = allFilmsInPoll.filter(film =>
        film.countries.includes(countryName)
      )

      const totalFilms = allFilmsInPoll.length
      const countryFilms = countryFilmsInPoll.length
      const countryShare = totalFilms > 0 ? (countryFilms / totalFilms) * 100 : 0
      const restOfWorld = 100 - countryShare

      // Calculate total votes for this country's films
      const countryVotes = countryFilmsInPoll.reduce((sum, film) => {
        const pollData = film.pollHistory.find(p => p.year === pollYear)
        return sum + (pollData?.votes || 0)
      }, 0)

      // Find best rank for this country in this poll
      const ranks = countryFilmsInPoll
        .map(film => film.pollHistory.find(p => p.year === pollYear)?.rank)
        .filter(r => r && r <= 100)
        .sort((a, b) => a - b)

      return {
        year: pollYear,
        countryShare: parseFloat(countryShare.toFixed(2)),
        restOfWorld: parseFloat(restOfWorld.toFixed(2)),
        countryFilms,
        totalFilms,
        countryVotes,
        bestRank: ranks[0] || null,
        top10Count: ranks.filter(r => r <= 10).length,
        isHighlighted: selectedPoll === pollYear.toString()
      }
    })
  }, [filmsData, countryName, rankRange, selectedPoll])

  // Calculate stats
  const stats = useMemo(() => {
    if (!chartData.length) return null

    const pollsWithPresence = chartData.filter(d => d.countryFilms > 0)
    const totalFilmAppearances = chartData.reduce((sum, d) => sum + d.countryFilms, 0)
    const totalVotes = chartData.reduce((sum, d) => sum + d.countryVotes, 0)

    // Find peak share poll
    const peakSharePoll = chartData.reduce((a, b) => a.countryShare > b.countryShare ? a : b)

    // Latest poll data
    const latestPoll = chartData[chartData.length - 1]

    // Average share across all polls
    const avgShare = pollsWithPresence.length > 0
      ? pollsWithPresence.reduce((sum, d) => sum + d.countryShare, 0) / pollsWithPresence.length
      : 0

    // Calculate trend (comparing 2012 to 2022 share)
    const poll2012 = chartData.find(d => d.year === 2012)
    const poll2022 = chartData.find(d => d.year === 2022)
    let trend = null
    if (poll2012 && poll2022) {
      const shareChange = poll2022.countryShare - poll2012.countryShare
      trend = {
        shareChange: shareChange.toFixed(1),
        direction: shareChange >= 0 ? 'up' : 'down',
        from: poll2012.countryShare.toFixed(1),
        to: poll2022.countryShare.toFixed(1)
      }
    }

    return {
      totalFilmAppearances,
      totalVotes,
      peakSharePoll,
      latestPoll,
      avgShare: avgShare.toFixed(1),
      trend,
      pollsWithPresence: pollsWithPresence.length
    }
  }, [chartData])

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null

    const data = payload[0].payload

    return (
      <div className="bg-white border-2 border-black p-3 shadow-lg min-w-[180px]">
        <div className="font-black text-lg text-black mb-2">{data.year} Poll</div>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-600">{countryName}:</span>
            <span className="font-bold text-black">{data.countryShare.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Films:</span>
            <span className="font-medium text-gray-700">{data.countryFilms} of {data.totalFilms}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Votes:</span>
            <span className="font-medium text-gray-700">{data.countryVotes.toLocaleString()}</span>
          </div>
          {data.bestRank && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Best Rank:</span>
              <span className="font-medium text-gray-700">#{data.bestRank}</span>
            </div>
          )}
          {data.top10Count > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Top 10 Films:</span>
              <span className="font-medium text-gray-700">{data.top10Count}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!chartData.length || !stats) {
    return (
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 h-[300px] flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">📊</div>
          <div className="font-bold mb-2">No Data Available</div>
        </div>
      </div>
    )
  }

  // Determine bar styling based on highlight
  const getBarFill = (entry) => {
    if (selectedPoll === 'all') return continentColor
    return entry.isHighlighted ? continentColor : '#d1d5db'
  }

  const getBarStroke = (entry) => {
    if (selectedPoll === 'all') return '#000'
    return entry.isHighlighted ? '#000' : '#9ca3af'
  }

  // Calculate Y-axis domain and ticks
  const maxShare = Math.max(...chartData.map(d => d.countryShare))

  // If max < 5%, use 0-5% with increments of 1
  // Otherwise, round up to nearest 5 with increments of 5
  const isSmallShare = maxShare < 5
  const yAxisMax = isSmallShare ? 5 : Math.ceil(maxShare / 5) * 5
  const yAxisInterval = isSmallShare ? 1 : 5

  // Generate tick values
  const yAxisTicks = []
  for (let i = 0; i <= yAxisMax; i += yAxisInterval) {
    yAxisTicks.push(i)
  }

  return (
    <div>
      {/* Bar Chart with auto-scaled Y-axis */}
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={chartData}
          margin={{ top: 30, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 12, fontWeight: 'bold' }}
            tickLine={{ stroke: '#000' }}
            axisLine={{ stroke: '#000', strokeWidth: 2 }}
          />
          <YAxis
            domain={[0, yAxisMax]}
            ticks={yAxisTicks}
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: '#000' }}
            axisLine={{ stroke: '#000', strokeWidth: 2 }}
            tickFormatter={(value) => `${value}%`}
            label={{
              value: 'Share of Poll',
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle', fontWeight: 'bold', fontSize: 12 }
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="countryShare"
            name={countryName}
            radius={[4, 4, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getBarFill(entry)}
                stroke={getBarStroke(entry)}
                strokeWidth={entry.isHighlighted ? 2 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      {selectedPoll !== 'all' && (
        <div className="mt-2 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 border-2 border-black"
              style={{ backgroundColor: continentColor }}
            />
            <span className="font-medium">Focused Poll ({selectedPoll})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-300 border border-gray-400" />
            <span className="text-gray-600">Other Polls</span>
          </div>
        </div>
      )}
    </div>
  )
}
