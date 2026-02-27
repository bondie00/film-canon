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

// Age buckets
const AGE_BUCKETS = [
  { min: 0, max: 10, label: '0-10 yrs' },
  { min: 10, max: 20, label: '10-20 yrs' },
  { min: 20, max: 30, label: '20-30 yrs' },
  { min: 30, max: 40, label: '30-40 yrs' },
  { min: 40, max: 50, label: '40-50 yrs' },
  { min: 50, max: 60, label: '50-60 yrs' },
  { min: 60, max: 80, label: '60-80 yrs' },
  { min: 80, max: 150, label: '80+ yrs' }
]

export default function FilmAgeHistogram({ films, selectedPoll, continentColor }) {
  // Calculate film ages and bucket them
  const { chartData, stats, hasData } = useMemo(() => {
    if (!films || films.length === 0) {
      return { chartData: [], stats: null, hasData: false }
    }

    // Reference year for age calculation
    const referenceYear = selectedPoll === 'all' ? 2022 : parseInt(selectedPoll)

    // Calculate ages
    const ages = []
    films.forEach(film => {
      const yearStr = film.Year?.toString() || ''
      const year = parseInt(yearStr.split('-')[0])
      if (!isNaN(year) && year > 1800) {
        const age = referenceYear - year
        if (age >= 0) {
          ages.push(age)
        }
      }
    })

    if (ages.length === 0) {
      return { chartData: [], stats: null, hasData: false }
    }

    // Bucket the ages
    const bucketCounts = AGE_BUCKETS.map(bucket => ({
      ...bucket,
      count: 0
    }))

    ages.forEach(age => {
      const bucket = bucketCounts.find(b => age >= b.min && age < b.max)
      if (bucket) {
        bucket.count++
      }
    })

    // Calculate stats
    const sortedAges = [...ages].sort((a, b) => a - b)
    const sum = ages.reduce((a, b) => a + b, 0)
    const avg = sum / ages.length
    const median = sortedAges[Math.floor(sortedAges.length / 2)]
    const min = sortedAges[0]
    const max = sortedAges[sortedAges.length - 1]

    return {
      chartData: bucketCounts,
      stats: {
        count: ages.length,
        average: avg.toFixed(1),
        median,
        min,
        max
      },
      hasData: true
    }
  }, [films, selectedPoll])

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null

    const data = payload[0].payload
    const percentage = stats ? ((data.count / stats.count) * 100).toFixed(1) : 0

    return (
      <div className="bg-white border-2 border-black p-3 shadow-lg">
        <div className="font-bold text-black mb-1">{data.label}</div>
        <div className="text-xl font-black text-black">
          {data.count} {data.count === 1 ? 'film' : 'films'}
        </div>
        <div className="text-sm text-gray-600">
          {percentage}% of total
        </div>
      </div>
    )
  }

  if (!hasData) {
    return (
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 h-[21.875rem] flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">📊</div>
          <div className="font-bold mb-2">Not Enough Data</div>
          <div className="text-sm">
            No film age data available for current filters
          </div>
        </div>
      </div>
    )
  }

  // Find max for color scaling
  const maxCount = Math.max(...chartData.map(d => d.count))

  // Get color with intensity based on count
  const getBarColor = (count) => {
    if (count === 0) return '#e5e7eb'
    const intensity = 0.4 + (count / maxCount) * 0.6
    const hex = continentColor.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    return `rgb(${Math.round(r * intensity)}, ${Math.round(g * intensity)}, ${Math.round(b * intensity)})`
  }

  const referenceYearText = selectedPoll === 'all' ? '2022' : selectedPoll

  return (
    <div>
      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-gray-50 border border-gray-200 p-3 text-center">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-600">Average Age</div>
          <div className="text-2xl font-black text-black">{stats.average}</div>
          <div className="text-xs text-gray-500">years</div>
        </div>
        <div className="bg-gray-50 border border-gray-200 p-3 text-center">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-600">Median Age</div>
          <div className="text-2xl font-black text-black">{stats.median}</div>
          <div className="text-xs text-gray-500">years</div>
        </div>
        <div className="bg-gray-50 border border-gray-200 p-3 text-center">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-600">Youngest</div>
          <div className="text-2xl font-black text-black">{stats.min}</div>
          <div className="text-xs text-gray-500">years old</div>
        </div>
        <div className="bg-gray-50 border border-gray-200 p-3 text-center">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-600">Oldest</div>
          <div className="text-2xl font-black text-black">{stats.max}</div>
          <div className="text-xs text-gray-500">years old</div>
        </div>
      </div>

      {/* Histogram */}
      <div className="h-[18.75rem]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fontWeight: 'bold' }}
            tickLine={{ stroke: '#000' }}
            axisLine={{ stroke: '#000', strokeWidth: 2 }}
            angle={-45}
            textAnchor="end"
            height={60}
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
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getBarColor(entry.count)}
                stroke="#000"
                strokeWidth={1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      </div>

      {/* Reference Note */}
      <div className="mt-4 text-center text-sm text-gray-600">
        Film age calculated relative to {referenceYearText} poll year
      </div>

      {/* Insight */}
      {chartData.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 text-sm">
          <span className="font-bold">Key insight: </span>
          {(() => {
            const peakBucket = chartData.reduce((a, b) => a.count > b.count ? a : b)
            const peakPct = ((peakBucket.count / stats.count) * 100).toFixed(0)
            return (
              <>
                Most films ({peakPct}%) were {peakBucket.label.replace(' yrs', '')} years old when voted for.
                The average film is {stats.average} years old.
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}
