import { useMemo } from 'react'
import {
  ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, ReferenceLine
} from 'recharts'

const POLL_YEARS = ['1952', '1962', '1972', '1982', '1992', '2002', '2012', '2022']

export default function ContinentShareChart({ countriesData, selectedPoll, rankRange }) {
  const chartData = useMemo(() => {
    if (!countriesData) return []

    const isConsensus = rankRange === 'consensus'
    const filmsKey = isConsensus ? 'distinctFilmsConsensus' : 'distinctFilms'

    return POLL_YEARS.map(year => {
      // Collect per-country film counts for this poll year
      const countryCounts = []
      let totalFilms = 0
      let countryCount = 0

      Object.entries(countriesData).forEach(([name, info]) => {
        if (name.startsWith('_')) return
        const pollData = info.byPoll?.[year]
        if (!pollData) return
        const films = pollData[filmsKey] || 0
        if (films > 0) {
          totalFilms += films
          countryCount++
          countryCounts.push({ name, films })
        }
      })

      // Dynamic top 5 for this poll year
      countryCounts.sort((a, b) => b.films - a.films)
      const top5 = countryCounts.slice(0, 5)
      const top5Names = top5.map(c => c.name)
      const top5Films = top5.reduce((sum, c) => sum + c.films, 0)

      const top5Pct = totalFilms > 0 ? (top5Films / totalFilms) * 100 : 0
      const restPct = 100 - top5Pct

      return {
        year,
        countries: countryCount,
        top5Pct,
        restPct,
        top5Films,
        top5Names,
        top5,
        restFilms: totalFilms - top5Films,
        totalFilms,
        isHighlighted: selectedPoll === year,
      }
    })
  }, [countriesData, rankRange, selectedPoll])

  if (!chartData.length) return null

  // Y-axis scaling for country count
  const maxCountries = Math.max(...chartData.map(d => d.countries))
  const countryAxisMax = Math.ceil(maxCountries / 20) * 20

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const data = payload[0]?.payload
    if (!data) return null

    const isConsensus = rankRange === 'consensus'

    return (
      <div className="bg-white border-2 border-black p-3 shadow-lg min-w-[260px]">
        <div className="font-black text-lg text-black mb-2">{data.year} Poll</div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Countries represented</span>
            <span className="font-black text-black text-lg">{data.countries}</span>
          </div>
          <div className="border-t border-gray-200 pt-2">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Top 5 share</span>
              <span className="font-bold text-black">
                {data.top5Pct.toFixed(1)}% <span className="font-medium text-gray-500">({data.top5Films} films)</span>
              </span>
            </div>
            <div className="pl-2 space-y-0.5">
              {data.top5.map((c, i) => (
                <div key={c.name} className="flex justify-between text-xs text-gray-500">
                  <span>{i + 1}. {c.name}</span>
                  <span className="font-medium">{c.films}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-600">Rest of world</span>
              <span className="font-bold" style={{ color: '#10b981' }}>
                {data.restPct.toFixed(1)}% <span className="font-medium text-gray-500">({data.restFilms} films)</span>
              </span>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-2 text-sm flex justify-between">
            <span className="text-gray-500">Total {isConsensus ? 'consensus ' : ''}films</span>
            <span className="font-bold text-black">{data.totalFilms.toLocaleString()}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="year"
            tick={({ x, y, payload }) => (
              <text
                x={x} y={y + 12}
                textAnchor="middle"
                fontSize={12}
                fontWeight={700}
                fill={payload.value === selectedPoll ? '#D4AF37' : '#000'}
                letterSpacing="0.05em"
              >
                {payload.value}
              </text>
            )}
            tickLine={{ stroke: '#000' }}
            axisLine={{ stroke: '#000', strokeWidth: 2 }}
          />
          {/* Left axis: country count */}
          <YAxis
            yAxisId="left"
            domain={[0, countryAxisMax]}
            tick={{ fontSize: 12, fontWeight: 700, fill: '#000' }}
            tickLine={{ stroke: '#000' }}
            axisLine={{ stroke: '#000', strokeWidth: 2 }}
            label={{
              value: 'COUNTRIES',
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle', fontWeight: 700, fontSize: 12, fill: '#6b7280', letterSpacing: '0.05em' }
            }}
          />
          {/* Right axis: Big 5 share % */}
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fontSize: 12, fontWeight: 700, fill: '#000' }}
            tickLine={{ stroke: '#000' }}
            axisLine={{ stroke: '#000', strokeWidth: 2 }}
            tickFormatter={v => `${v}%`}
            label={{
              value: 'TOP 5 SHARE',
              angle: 90,
              position: 'insideRight',
              style: { textAnchor: 'middle', fontWeight: 700, fontSize: 12, fill: '#6b7280', letterSpacing: '0.05em' }
            }}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Bar: country count */}
          <Bar
            yAxisId="left"
            dataKey="countries"
            radius={[4, 4, 0, 0]}
            barSize={40}
          >
            {chartData.map((entry, idx) => (
              <Cell
                key={`cell-${idx}`}
                fill={entry.isHighlighted ? '#D4AF37' : '#000'}
                fillOpacity={entry.isHighlighted ? 0.9 : 0.15}
                stroke={entry.isHighlighted ? '#D4AF37' : '#000'}
                strokeWidth={entry.isHighlighted ? 2 : 1}
              />
            ))}
          </Bar>

          {/* Line: Big 5 share */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="top5Pct"
            stroke="#ef4444"
            strokeWidth={3}
            dot={({ cx, cy, payload }) => (
              <circle
                key={payload.year}
                cx={cx}
                cy={cy}
                r={payload.isHighlighted ? 7 : 5}
                fill={payload.isHighlighted ? '#D4AF37' : '#ef4444'}
                stroke={payload.isHighlighted ? '#D4AF37' : '#000'}
                strokeWidth={payload.isHighlighted ? 2.5 : 1.5}
              />
            )}
            activeDot={{ r: 7, stroke: '#000', strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-sm border-t-2 border-gray-300 pt-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-black opacity-30 border-2 border-black"></div>
          <span className="text-black font-bold">Countries Represented</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-1 bg-red-500 rounded"></div>
          <span className="text-black font-bold">Top 5 Countries Share %</span>
        </div>
      </div>
    </div>
  )
}
