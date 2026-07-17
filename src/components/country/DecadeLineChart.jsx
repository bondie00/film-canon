import { useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

// Poll years and their colors
const POLL_YEARS = ['1952', '1962', '1972', '1982', '1992', '2002', '2012', '2022']

const POLL_COLORS = {
  '1952': '#94a3b8', // slate-400
  '1962': '#a1a1aa', // zinc-400
  '1972': '#f97316', // orange-500
  '1982': '#eab308', // yellow-500
  '1992': '#22c55e', // green-500
  '2002': '#06b6d4', // cyan-500
  '2012': '#8b5cf6', // violet-500
  '2022': '#ec4899', // pink-500
}

// Generate decades from 1890s to 2020s
const DECADES = ['1890', '1900', '1910', '1920', '1930', '1940', '1950', '1960', '1970', '1980', '1990', '2000', '2010', '2020']

export default function DecadeLineChart({ films, selectedPoll, continentColor }) {
  const [hoveredPoll, setHoveredPoll] = useState(null)

  // Build data for chart
  const { chartData, pollTotals, hasData, maxPercentage } = useMemo(() => {
    if (!films || films.length === 0) {
      return { chartData: [], pollTotals: {}, hasData: false, maxPercentage: 0 }
    }

    // First, count films per poll (for normalization denominator)
    const pollTotals = {}
    POLL_YEARS.forEach(poll => {
      pollTotals[poll] = 0
    })

    // Count films per decade per poll
    const decadePollCounts = {}
    DECADES.forEach(decade => {
      decadePollCounts[decade] = {}
      POLL_YEARS.forEach(poll => {
        decadePollCounts[decade][poll] = 0
      })
    })

    // Process each film
    films.forEach(film => {
      const yearStr = film.Year?.toString() || ''
      const year = parseInt(yearStr.split('-')[0])
      if (isNaN(year) || year < 1890) return

      const decade = Math.floor(year / 10) * 10
      const decadeKey = decade.toString()

      // Count appearances in each poll
      film.pollHistory.forEach(pollEntry => {
        if (pollEntry.votes > 0 && pollEntry.year !== 'all') {
          const pollKey = pollEntry.year.toString()
          if (pollTotals[pollKey] !== undefined) {
            pollTotals[pollKey]++
            if (decadePollCounts[decadeKey]) {
              decadePollCounts[decadeKey][pollKey]++
            }
          }
        }
      })
    })

    // Build chart data with percentages
    let maxPercentage = 0
    const chartData = DECADES.map(decade => {
      const row = { decade: `${decade}s` }

      POLL_YEARS.forEach(poll => {
        const count = decadePollCounts[decade]?.[poll] || 0
        const total = pollTotals[poll] || 1
        const percentage = (count / total) * 100
        row[`${poll}_pct`] = percentage
        row[`${poll}_count`] = count
        maxPercentage = Math.max(maxPercentage, percentage)
      })

      return row
    }).filter(row => {
      // Only include decades that have at least some data
      return POLL_YEARS.some(poll => row[`${poll}_count`] > 0)
    })

    const hasData = chartData.length > 0

    return { chartData, pollTotals, hasData, maxPercentage }
  }, [films])

  // Custom tooltip for line chart
  const LineTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null

    // Sort by percentage descending
    const sorted = [...payload].sort((a, b) => b.value - a.value)

    return (
      <div className="bg-white border-2 border-black p-3 shadow-lg">
        <p className="font-bold text-sm text-black uppercase tracking-wide mb-2">{label}</p>
        <div className="space-y-1">
          {sorted.map((entry, idx) => {
            const poll = entry.dataKey.replace('_pct', '')
            const count = payload[0]?.payload?.[`${poll}_count`] || 0
            return (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="font-bold">{poll}:</span>
                <span>{entry.value.toFixed(1)}%</span>
                <span className="text-gray-500">({count} films)</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Custom tooltip for bar chart
  const BarTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null

    const count = payload[0]?.value || 0
    const total = pollTotals[selectedPoll] || 1
    const pct = ((count / total) * 100).toFixed(1)

    return (
      <div className="bg-white border-2 border-black p-3 shadow-lg">
        <p className="font-bold text-sm text-black uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-black" style={{ color: continentColor }}>
          {count} films
        </p>
        <p className="text-xs text-gray-600">
          {pct}% of {selectedPoll} poll
        </p>
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
            No decade distribution data available for current filters
          </div>
        </div>
      </div>
    )
  }

  // Individual poll view - show bar chart with raw counts
  if (selectedPoll !== 'all') {
    const barData = chartData.map(row => ({
      decade: row.decade,
      count: row[`${selectedPoll}_count`] || 0
    })).filter(d => d.count > 0 || chartData.some(r => r[`${selectedPoll}_count`] > 0))

    return (
      <div>
        <div className="h-[21.875rem]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="decade"
                tick={{ fontSize: 12, fontWeight: 'bold' }}
                tickLine={{ stroke: '#000' }}
                axisLine={{ stroke: '#000', strokeWidth: 2 }}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#000' }}
                axisLine={{ stroke: '#000', strokeWidth: 2 }}
                label={{
                  value: 'Number of Films',
                  angle: -90,
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fontWeight: 'bold', fontSize: 12 }
                }}
              />
              <Tooltip content={<BarTooltip />} />
              <Bar
                dataKey="count"
                fill={continentColor}
                stroke="#000"
                strokeWidth={1}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary */}
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 text-sm">
          <span className="font-bold">Peak decade in {selectedPoll}: </span>
          {(() => {
            const peak = barData.reduce((max, d) => d.count > max.count ? d : max, { decade: 'N/A', count: 0 })
            const total = pollTotals[selectedPoll] || 1
            const pct = ((peak.count / total) * 100).toFixed(1)
            return `${peak.decade} with ${peak.count} films (${pct}% of poll)`
          })()}
        </div>
      </div>
    )
  }

  // All polls combined view - show line chart with normalized percentages
  return (
    <div>
      <div className="h-[25rem]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="decade"
              tick={{ fontSize: 12, fontWeight: 'bold' }}
              tickLine={{ stroke: '#000' }}
              axisLine={{ stroke: '#000', strokeWidth: 2 }}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={{ stroke: '#000' }}
              axisLine={{ stroke: '#000', strokeWidth: 2 }}
              domain={[0, Math.ceil(maxPercentage / 5) * 5 + 5]}
              tickFormatter={(v) => `${v}%`}
              label={{
                value: '% of Poll Total',
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle', fontWeight: 'bold', fontSize: 12 }
              }}
            />
            <Tooltip content={<LineTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: 10 }}
              formatter={(value) => value.replace('_pct', '')}
            />
            {POLL_YEARS.map(poll => (
              <Line
                key={poll}
                type="monotone"
                dataKey={`${poll}_pct`}
                name={poll}
                stroke={POLL_COLORS[poll]}
                strokeWidth={hoveredPoll === poll ? 4 : 2}
                dot={{ r: hoveredPoll === poll ? 5 : 3, strokeWidth: 1, fill: POLL_COLORS[poll] }}
                activeDot={{ r: 6, strokeWidth: 2, fill: '#fff' }}
                opacity={hoveredPoll && hoveredPoll !== poll ? 0.2 : 1}
                onMouseEnter={() => setHoveredPoll(poll)}
                onMouseLeave={() => setHoveredPoll(null)}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend interaction hint */}
      <div className="mt-2 text-center text-xs text-gray-500">
        Hover over a line to highlight that poll
      </div>

      {/* Insight */}
      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 text-sm">
        <span className="font-bold">Reading this chart: </span>
        Each line shows what percentage of a poll's total films came from each decade.
        This normalizes for the different poll sizes (1952 had 199 films, 2022 had 3,817)
        so you can compare which decades each poll valued most.
      </div>
    </div>
  )
}
