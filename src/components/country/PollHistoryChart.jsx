import { useMemo, useState, useRef, useCallback } from 'react'
import CountryPanel from './CountryPanel'
import { TOOLTIP_BOX, TOOLTIP_TITLE, TOOLTIP_VALUE, TOOLTIP_DETAIL, TOOLTIP_WIDTH } from '../../utils/tooltip'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

const POLL_YEARS = [1952, 1962, 1972, 1982, 1992, 2002, 2012, 2022]

// A share below 0.1% needs a second decimal — one would render every small
// country as a flat 0.0%. (In the 2022 poll at full depth, 53 of 105 countries
// sit under that line.)
function formatShare(share) {
  if (share > 0 && share < 0.1) return share.toFixed(2)
  return share.toFixed(1)
}

// Allowed axis maxima. The floor is 2.5% (gridlines every 0.5%) so that a country
// with a tiny share still LOOKS tiny — fitting the axis to each country's own
// magnitude made every country fill the chart and destroyed that comparison. Each
// value divides by 5 into a clean interval.
const AXIS_MAXIMA = [2.5, 5, 7.5, 10, 15, 20, 25, 30, 40, 50, 75, 100]

function axisMaxFor(v) {
  return AXIS_MAXIMA.find(m => v <= m) ?? 100
}

// Decimals needed to write the tick interval exactly: 0.5 -> 1, 1.5 -> 1, 5 -> 0.
function decimalsFor(x) {
  const dot = String(x).indexOf('.')
  return dot === -1 ? 0 : String(x).length - dot - 1
}

export default function PollHistoryChart({
  filmsData,
  countryName,
  cutoffByPoll = {},
  metric = 'films',
  topTarget = null,
  continentColor,
}) {
  // { year } for the expanded panel. Each bar is one poll's films from this
  // country, which is exactly what CountryPanel takes.
  const [selectedYear, setSelectedYear] = useState(null)
  const expandedPanelRef = useRef(null)
  // Calculate percentage share per poll for this country
  const chartData = useMemo(() => {
    if (!filmsData || !countryName) return []

    return POLL_YEARS.map(pollYear => {
      // Count ALL films in this poll, at the depth cutoff resolved for that poll.
      const cutoffRank = cutoffByPoll[pollYear] ?? null

      const allFilmsInPoll = filmsData.filter(film => {
        const pollData = film.pollHistory.find(p => p.year === pollYear)
        if (!pollData || pollData.votes === 0) return false
        if (cutoffRank == null) return true
        return pollData.rank != null && pollData.rank <= cutoffRank
      })

      // Count films from THIS COUNTRY in this poll
      const countryFilmsInPoll = allFilmsInPoll.filter(film =>
        film.countries.includes(countryName)
      )

      const votesIn = (list) => list.reduce((sum, film) => {
        const pollData = film.pollHistory.find(p => p.year === pollYear)
        return sum + (pollData?.votes || 0)
      }, 0)

      const totalFilms = allFilmsInPoll.length
      const countryFilms = countryFilmsInPoll.length
      const countryVotes = votesIn(countryFilmsInPoll)

      // Share is measured in whichever metric is active, so the line means the same
      // thing as the rest of the page.
      const totalForMetric = metric === 'votes' ? votesIn(allFilmsInPoll) : totalFilms
      const countryForMetric = metric === 'votes' ? countryVotes : countryFilms
      const countryShare = totalForMetric > 0 ? (countryForMetric / totalForMetric) * 100 : 0
      const restOfWorld = 100 - countryShare

      return {
        year: pollYear,
        countryShare,
        restOfWorld,
        countryFilms,
        totalFilms,
        countryVotes,
      }
    })
  }, [filmsData, countryName, cutoffByPoll, metric])

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

  // Hover gives the shape; clicking a bar opens its films. Everything the old
  // tooltip listed (best rank, top-10 count) is visible in the panel as tiles,
  // sorted by votes with each showing its own rank.
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const data = payload[0].payload
    const shown = metric === 'votes'
      ? `${data.countryVotes.toLocaleString()} votes`
      : `${data.countryFilms} of ${data.totalFilms} films`

    return (
      <div className={TOOLTIP_BOX} style={{ width: TOOLTIP_WIDTH }}>
        <p className={TOOLTIP_TITLE}>{data.year} Poll</p>
        <p className={TOOLTIP_VALUE}>
          {formatShare(data.countryShare)}%
        </p>
        <p className={TOOLTIP_DETAIL}>{shown}</p>
      </div>
    )
  }

  const openPanel = useCallback((state) => {
    const year = state?.activeLabel
    if (!year || selectedYear) return
    const row = chartData.find(d => String(d.year) === String(year))
    if (!row || row.countryFilms === 0) return
    setSelectedYear(Number(year))
  }, [chartData, selectedYear])

  const closePanel = useCallback(() => setSelectedYear(null), [])

  // The films behind the clicked bar, under that poll's own rank cutoff.
  const panelFilms = useMemo(() => {
    if (!selectedYear || !filmsData) return []
    const cutoff = cutoffByPoll[selectedYear] ?? null
    return filmsData
      .filter(f => f.countries?.includes(countryName))
      .map(f => {
        const entry = f.pollHistory?.find(x => x.year === selectedYear)
        if (!entry || !(entry.votes > 0)) return null
        if (cutoff != null && (entry.rank == null || entry.rank > cutoff)) return null
        return { f, votes: entry.votes, rank: entry.rank ?? null }
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (b.votes !== a.votes) return b.votes - a.votes
        if (a.rank && b.rank) return a.rank - b.rank
        return 0
      })
      .map(x => x.f)
  }, [selectedYear, filmsData, countryName, cutoffByPoll])

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

  // Y-axis: the smallest standard scale that fits, floored at 2.5%. 101 of the 110
  // countries land on that floor, so they share one axis and stay comparable with
  // each other — and a small share still reads as small rather than being stretched
  // to fill the chart. A log scale was ruled out for the same reason, plus it can't
  // plot the zero-bars that most small countries have.
  const maxShare = Math.max(...chartData.map(d => d.countryShare), 0)
  const yAxisMax = axisMaxFor(maxShare)
  const yAxisInterval = yAxisMax / 5
  const tickDecimals = decimalsFor(yAxisInterval)

  // Built by repeated addition, so round off the accumulated float error.
  const yAxisTicks = []
  for (let i = 0; i <= 5; i++) {
    yAxisTicks.push(parseFloat((i * yAxisInterval).toPrecision(12)))
  }

  return (
    <div className="relative">
      {/* Bar Chart with auto-scaled Y-axis. Height is set to CountryPanel's max
          (28.44rem, including the p-4 its wrapper adds) so an expanded panel is
          always contained by this section instead of spilling past it. */}
      <div className="h-[28.5rem]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 30, right: 30, left: 20, bottom: 20 }}
          onClick={openPanel}
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
                fill="#000"
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
            tickFormatter={(value) => `${value.toFixed(tickDecimals)}%`}
            label={{
              value: 'SHARE OF POLL',
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle', fontWeight: 700, fontSize: 12, fill: '#6b7280', letterSpacing: '0.05em' }
            }}
          />
          {!selectedYear && <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />}
          <Bar
            dataKey="countryShare"
            name={countryName}
            radius={[4, 4, 0, 0]}
            // On the 2.5% axis a single 2022 vote is 0.9px. Floor non-zero bars at
            // 3px so they stay visible; a callback keeps true zeros at zero height.
            minPointSize={(value) => (value > 0 ? 3 : 0)}
            fill={continentColor}
            stroke="#000"
            strokeWidth={1}
          />
        </BarChart>
      </ResponsiveContainer>
      </div>

      {/* Expanded panel — selectedPoll is the CLICKED bar's poll, so each tile's
          rank strip highlights the poll you opened. */}
      {selectedYear && (
        <CountryPanel
          name={countryName}
          films={panelFilms}
          metric={metric}
          selectedPoll={String(selectedYear)}
          topTarget={topTarget}
          subtitle={`${selectedYear} Poll`}
          onClose={closePanel}
          panelRef={expandedPanelRef}
        />
      )}

    </div>
  )
}
