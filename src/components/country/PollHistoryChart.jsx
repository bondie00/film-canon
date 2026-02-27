import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'

const POLL_YEARS = [1952, 1962, 1972, 1982, 1992, 2002, 2012, 2022]

export default function PollHistoryChart({
  films,
  filmsData,
  countryName,
  selectedPoll,
  rankRange,
  continentColor,
  countriesData
}) {
  // Calculate percentage share per poll for this country
  const chartData = useMemo(() => {
    if (!filmsData || !countryName) return []

    return POLL_YEARS.map(pollYear => {
      // Count ALL films in this poll (applying rank filter)
      const cutoffRank = countriesData?._pollMetadata?.[pollYear.toString()]?.consensus?.cutoffRank

      const allFilmsInPoll = filmsData.filter(film => {
        const pollData = film.pollHistory.find(p => p.year === pollYear)
        if (!pollData || pollData.votes === 0) return false

        if (rankRange === 'consensus') {
          return pollData.rank && cutoffRank && pollData.rank <= cutoffRank
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

      // Find best rank and film title for this country in this poll
      const rankedFilms = countryFilmsInPoll
        .map(film => {
          const pd = film.pollHistory.find(p => p.year === pollYear)
          return { title: film.FilmTitle, rank: pd?.rank }
        })
        .filter(f => {
          if (!f.rank) return false
          if (rankRange === 'consensus') return cutoffRank && f.rank <= cutoffRank
          return f.rank <= 100
        })
        .sort((a, b) => a.rank - b.rank)

      return {
        year: pollYear,
        countryShare: parseFloat(countryShare.toFixed(2)),
        restOfWorld: parseFloat(restOfWorld.toFixed(2)),
        countryFilms,
        totalFilms,
        countryVotes,
        bestRank: rankedFilms[0]?.rank || null,
        bestRankTitle: rankedFilms[0]?.title || null,
        top10Count: rankedFilms.filter(f => f.rank <= 10).length,
        isHighlighted: selectedPoll === pollYear.toString()
      }
    })
  }, [filmsData, countryName, rankRange, selectedPoll, countriesData])

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

  // Custom tooltip — changes content based on rankRange
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null

    const data = payload[0].payload
    const isConsensus = rankRange === 'consensus'

    return (
      <div className="bg-white border-2 border-black p-3 shadow-lg min-w-[180px]">
        <div className="font-black text-lg text-black mb-2">{data.year} Poll</div>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-600">{countryName}:</span>
            <span className="font-bold text-black">
              {data.countryShare.toFixed(1)}%{isConsensus ? ' of consensus films' : ''}
            </span>
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
              <span className="font-medium text-gray-700">#{data.bestRank}{isConsensus && data.bestRankTitle ? ` ${data.bestRankTitle}` : ''}</span>
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
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 h-[18.75rem] flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">📊</div>
          <div className="font-bold mb-2">No Data Available</div>
        </div>
      </div>
    )
  }

  // Determine bar styling — always continent color, gold outline on selected poll
  const getBarFill = () => continentColor

  const getBarStroke = (entry) => {
    return entry.isHighlighted && selectedPoll !== 'all' ? '#D4AF37' : '#000'
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
      <div className="h-[20rem]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 30, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="year"
            tick={({ x, y, payload }) => (
              <text
                x={x} y={y + 12}
                textAnchor="middle"
                fontSize={12}
                fontWeight={700}
                fill={payload.value.toString() === selectedPoll ? '#D4AF37' : '#000'}
                letterSpacing="0.05em"
              >
                {payload.value}
              </text>
            )}
            tickLine={{ stroke: '#000' }}
            axisLine={{ stroke: '#000', strokeWidth: 2 }}
          />
          <YAxis
            domain={[0, yAxisMax]}
            ticks={yAxisTicks}
            tick={{ fontSize: 12, fontWeight: 700, fill: '#000' }}
            tickLine={{ stroke: '#000' }}
            axisLine={{ stroke: '#000', strokeWidth: 2 }}
            tickFormatter={(value) => `${value}%`}
            label={{
              value: 'SHARE OF POLL',
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle', fontWeight: 700, fontSize: 12, fill: '#6b7280', letterSpacing: '0.05em' }
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
                fill={getBarFill()}
                stroke={getBarStroke(entry)}
                strokeWidth={entry.isHighlighted && selectedPoll !== 'all' ? 3.5 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      </div>

    </div>
  )
}
