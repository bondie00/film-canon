import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import VizCard from '../layout/VizCard'
import GenrePanel, { panelFilms } from './GenrePanel'
import GenreFamilyToggle from './GenreFamilyToggle'
import { orderRows } from '../directors/rankedField'
import { TIER_COLORS } from '../../lib/rankTiers'
import { TOOLTIP_BOX, TOOLTIP_TITLE, TOOLTIP_SUBTITLE, TOOLTIP_VALUE, TOOLTIP_DETAIL, TOOLTIP_WIDTH } from '../../utils/tooltip'

// The leading segment is a genre's single top film; the rest of the bar is
// everything else it placed. Two steps of the one blue ramp the site uses for
// standing, far enough apart to read as "one film" against "the field".
const LEAD_COLOR = TIER_COLORS[0]
const REST_COLOR = TIER_COLORS[4]

/**
 * Genres ranked by the active metric, every genre drawn (there are only ~22,
 * so there's no Top N to choose).
 *
 * In VOTES mode each bar is split: the dark head is the genre's best-voted
 * film, the pale body is the rest. That's the concentration story in one
 * glance — a Western's head is a fifth of its bar, Drama's is a sliver — and it
 * is what makes this more than a size chart. In FILMS mode the bar is plain: a
 * film count has no "one film's share" reading worth drawing.
 *
 * Bar length is the metric, unlike the directors chart, whose tiles are one per
 * film. Genres can't do tiles — Drama places 1,600 films in 2022 and a tile
 * would be a hairline.
 */
export default function GenresRankedBarChart({ aggregates, metric = 'votes', selectedPoll, topTarget }) {
  const [family, setFamily] = useState('content')
  const [openGenre, setOpenGenre] = useState(null)
  const chartContainerRef = useRef(null)
  const panelRef = useRef(null)

  const valueKey = metric === 'votes' ? 'votes' : 'films'

  const chartData = useMemo(() => {
    const rows = family === 'formats' ? aggregates?.formats : aggregates?.content
    return orderRows(rows || [], valueKey)
      .filter(r => r[valueKey] > 0)
      .map(r => ({
        ...r,
        value: r[valueKey],
        lead: metric === 'votes' ? r.topVotes : 0,
        rest: metric === 'votes' ? r.votes - r.topVotes : r.films,
      }))
  }, [aggregates, family, valueKey, metric])

  const rowHeight = chartData.length <= 10 ? 40 : 30
  const chartHeight = Math.max(150, Math.min(1100, chartData.length * rowHeight))

  const openRow = useMemo(
    () => chartData.find(r => r.name === openGenre) || null,
    [chartData, openGenre]
  )
  const openFilms = useMemo(
    () => (openRow ? panelFilms(openRow, selectedPoll) : []),
    [openRow, selectedPoll]
  )

  useEffect(() => {
    if (openRow && panelRef.current) panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [openRow])

  // Filter changes leave the panel open to re-read the new data; only close if
  // the genre dropped out (a format pinned, then the family switched).
  useEffect(() => {
    if (openGenre && !chartData.some(r => r.name === openGenre)) setOpenGenre(null)
  }, [chartData, openGenre])

  const handleBarClick = useCallback(state => {
    const label = state?.activeLabel
    if (!label || openGenre) return
    setOpenGenre(label)
  }, [openGenre])

  const panelMinHeight = openFilms.length
    ? Math.max(280, Math.min(230 + openFilms.length * 42, 448))
    : undefined

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    const filmsText = `${d.films.toLocaleString()} ${d.films === 1 ? 'film' : 'films'}`
    const votesText = `${d.votes.toLocaleString()} votes`
    return (
      <div className={TOOLTIP_BOX} style={{ width: TOOLTIP_WIDTH + 40 }}>
        <p className={TOOLTIP_TITLE}>{d.name}</p>
        <p className={TOOLTIP_SUBTITLE}>#{d[metric === 'votes' ? 'votesRank' : 'filmsRank']} by {metric}</p>
        <p className={TOOLTIP_VALUE}>{metric === 'votes' ? votesText : filmsText}</p>
        <p className={TOOLTIP_DETAIL}>{metric === 'votes' ? filmsText : votesText}</p>
        {d.topFilm && (
          <p className={`${TOOLTIP_DETAIL} border-t border-gray-300 mt-1.5 pt-1.5`}>
            <span className="font-bold">{d.topFilm.FilmTitle}</span>
            {' · '}
            {Math.round(d.topShare * 100)}% of its votes
          </p>
        )}
      </div>
    )
  }

  return (
    <VizCard
      title={family === 'formats' ? 'Formats Ranked' : 'Genres Ranked'}
      controls={<GenreFamilyToggle value={family} onChange={f => { setOpenGenre(null); setFamily(f) }} />}
    >
      <div ref={chartContainerRef} className="relative" style={openRow && panelMinHeight ? { minHeight: `${panelMinHeight}px` } : undefined}>
        <style>{`.genre-bar-chart *:focus,
          .genre-bar-chart *:focus-visible,
          .genre-bar-chart * { outline: none; }`}</style>
        <div className="genre-bar-chart">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              onClick={handleBarClick}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
              <XAxis
                type="number"
                allowDecimals={false}
                stroke="#000000"
                tick={{ fill: '#000000', fontSize: 12 }}
                axisLine={{ stroke: '#000000', strokeWidth: 2 }}
                tickLine={{ stroke: '#000000' }}
                label={{
                  value: metric === 'votes' ? 'Votes' : 'Films',
                  position: 'insideBottom',
                  offset: -5,
                  style: { fontWeight: 'bold', fill: '#000000' },
                }}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={130}
                interval={0}
                stroke="#000000"
                axisLine={{ stroke: '#000000', strokeWidth: 2 }}
                tickLine={{ stroke: '#000000' }}
                tick={{ fill: '#000000', fontSize: 12, fontWeight: 600 }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              {/* Head then body, in one stack. Recharts draws a stroke on each
                  segment, so the boundary between them is a real black rule. */}
              <Bar dataKey="lead" stackId="g" fill={LEAD_COLOR} stroke="#000000" strokeWidth={1} isAnimationActive={false} cursor={openRow ? 'default' : 'pointer'} />
              <Bar dataKey="rest" stackId="g" fill={REST_COLOR} stroke="#000000" strokeWidth={1} isAnimationActive={false} cursor={openRow ? 'default' : 'pointer'} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {openRow && (
          <GenrePanel
            row={openRow}
            films={openFilms}
            metric={metric}
            selectedPoll={selectedPoll}
            topTarget={topTarget}
            onClose={() => setOpenGenre(null)}
            panelRef={panelRef}
          />
        )}
      </div>
    </VizCard>
  )
}
