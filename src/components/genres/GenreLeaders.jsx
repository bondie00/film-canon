import { useState, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import VizCard from '../layout/VizCard'
import GenreFamilyToggle from './GenreFamilyToggle'
import { orderRows } from '../directors/rankedField'
import { posterUrl } from '../../utils/filmImages'
import { filmUrl } from '../../lib/routes'
import { TIER_COLORS } from '../../lib/rankTiers'
import { TOOLTIP_BOX, TOOLTIP_NAME, TOOLTIP_SUBTITLE, TOOLTIP_DETAIL, TOOLTIP_WIDTH } from '../../utils/tooltip'

const PLOT_HEIGHT = 380
const AXIS_WIDTH = 56
const MARK_W = 30
const MARK_H = 45
const STEM_COLOR = TIER_COLORS[3]

/**
 * Each genre's top film, placed by its RANK in the poll.
 *
 * One column per genre; the marker — the film's poster — sits at that film's
 * rank on a reversed log axis anchored at #1, the same axis the standing charts
 * use (rank is perceptually logarithmic: #1 to #10 is a bigger gap than #100 to
 * #1000). So the chart reads as "how high does this genre reach": Drama, Thriller
 * and Mystery touch the very top through Jeanne Dielman and Vertigo, while
 * Sport's best film sits down in the hundreds.
 *
 * Under each genre is the share of the genre's votes that its leader holds — the
 * concentration figure, and a votes quantity in both metrics (one film's share
 * of a film COUNT is 1/N and says nothing). The metric otherwise reaches this
 * chart through the Size ordering, which follows the ranked chart above.
 *
 * Default order is by the leader's rank, so the columns descend left to right
 * and the eye reads "which genres reach highest"; Size restates the ranked
 * chart's order so the two can be read together.
 */
export default function GenreLeaders({ aggregates, metric = 'votes', selectedPoll }) {
  const [family, setFamily] = useState('content')
  const [order, setOrder] = useState('rank')
  const [hover, setHover] = useState(null)
  const [mouse, setMouse] = useState({ x: 0, y: 0 })
  const plotRef = useRef(null)

  const valueKey = metric === 'votes' ? 'votes' : 'films'

  const rows = useMemo(() => {
    const source = family === 'formats' ? aggregates?.formats : aggregates?.content
    const withFilm = (source || []).filter(r => r.topFilm && r.topRank != null && r[valueKey] > 0)
    if (order === 'size') return orderRows(withFilm, valueKey)
    return [...withFilm].sort((a, b) => a.topRank - b.topRank || b.votes - a.votes)
  }, [aggregates, family, order, valueKey])

  // Reversed log axis: #1 at the top, the worst leader's rank at the bottom,
  // rounded out to the next decade or half-decade so the last marker isn't on
  // the floor. Ticks at 1-3-10-30 in a tight domain, decades otherwise.
  const { yMax, ticks } = useMemo(() => {
    const worst = rows.reduce((m, r) => Math.max(m, r.topRank), 1)
    const steps = Math.log10(worst) < 2.5 ? [1, 3] : [1]
    let top = 1
    const marks = []
    for (let decade = 1; decade <= 100000; decade *= 10) {
      steps.forEach(s => {
        const t = decade * s
        if (t <= worst) { marks.push(t); top = t }
      })
    }
    // Next tick above the worst, so it has headroom.
    const next = steps.map(s => {
      let d = 1
      while (d * s <= worst) d *= 10
      return d * s
    }).sort((a, b) => a - b)[0]
    if (next > top) { marks.push(next); top = next }
    return { yMax: top, ticks: marks }
  }, [rows])

  const yOf = rank => (Math.log10(rank) / Math.log10(yMax)) * PLOT_HEIGHT

  const isAll = String(selectedPoll) === 'all'

  return (
    <VizCard
      title="Top Film by Genre"
      controls={
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <GenreFamilyToggle value={family} onChange={setFamily} />
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Order by</span>
            <div className="flex border-2 border-black">
              {[['rank', 'Rank'], ['size', 'Size']].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setOrder(key)}
                  aria-pressed={order === key}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                    order === key ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      }
    >
      {rows.length === 0 ? (
        <div className="py-12 text-center text-gray-500 font-medium">No films in this selection.</div>
      ) : (
        <div
          className="relative"
          onMouseMove={e => setMouse({ x: e.clientX, y: e.clientY })}
          onMouseLeave={() => setHover(null)}
        >
          <div className="flex">
            {/* Y axis: rank */}
            <div className="relative flex-shrink-0 border-r-2 border-black" style={{ width: AXIS_WIDTH, height: PLOT_HEIGHT }}>
              {ticks.map(t => (
                <div
                  key={t}
                  className="absolute right-2 text-[11px] font-bold tabular-nums text-gray-500 leading-none"
                  style={{ top: yOf(t), transform: 'translateY(-50%)' }}
                >
                  #{t.toLocaleString()}
                </div>
              ))}
              <div
                className="absolute left-0 text-[10px] font-bold uppercase tracking-wide text-black"
                style={{ top: '50%', transform: 'rotate(-90deg) translateX(-50%)', transformOrigin: 'left top', whiteSpace: 'nowrap' }}
              >
                {isAll ? 'Combined rank' : 'Rank in poll'}
              </div>
            </div>

            {/* Plot */}
            <div ref={plotRef} className="relative flex-1 min-w-0" style={{ height: PLOT_HEIGHT }}>
              {ticks.map(t => (
                <div
                  key={t}
                  className="absolute left-0 right-0 border-t border-dashed border-gray-300"
                  style={{ top: yOf(t) }}
                />
              ))}
              <div className="absolute inset-0 flex">
                {rows.map(row => {
                  const y = yOf(row.topRank)
                  const poster = posterUrl(row.topFilm, 'w154')
                  const isHover = hover?.name === row.name
                  return (
                    <div
                      key={row.name}
                      className="relative flex-1 min-w-0"
                      onMouseEnter={() => setHover(row)}
                    >
                      {/* Stem: from the floor up to the marker */}
                      <div
                        className="absolute left-1/2 w-0.5"
                        style={{ top: y, bottom: 0, backgroundColor: isHover ? '#000' : STEM_COLOR, transform: 'translateX(-50%)' }}
                      />
                      <Link
                        to={filmUrl(row.topFilm.key)}
                        className={`absolute left-1/2 block bg-black overflow-hidden border-2 ${isHover ? 'border-amber-500 z-10' : 'border-black'}`}
                        style={{ top: y, width: MARK_W, height: MARK_H, transform: 'translate(-50%, -50%)' }}
                      >
                        {poster && <img src={poster} alt="" className="w-full h-full object-cover" loading="lazy" />}
                      </Link>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* X axis: genre, and the leader's share of the genre's votes */}
          <div className="flex border-t-2 border-black" style={{ paddingLeft: AXIS_WIDTH }}>
            {rows.map(row => {
              const pct = row.topShare * 100
              const isHover = hover?.name === row.name
              return (
                <div key={row.name} className="flex-1 min-w-0 pt-1 flex flex-col items-center" onMouseEnter={() => setHover(row)}>
                  <div className="h-20 w-full relative">
                    <span
                      className={`absolute left-1/2 top-0 text-[11px] font-bold uppercase tracking-wide whitespace-nowrap ${isHover ? 'text-black' : 'text-gray-700'}`}
                      style={{ transform: 'rotate(55deg) translateX(-4px)', transformOrigin: 'left top' }}
                    >
                      {row.name}
                    </span>
                  </div>
                  <span className="text-[11px] font-black tabular-nums text-black">
                    {pct < 10 ? pct.toFixed(1) : Math.round(pct)}%
                  </span>
                </div>
              )
            })}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mt-1" style={{ paddingLeft: AXIS_WIDTH }}>
            Share of the genre's votes held by its top film
          </div>

          {hover && (
            <div
              className={`fixed pointer-events-none z-50 ${TOOLTIP_BOX}`}
              style={{
                width: TOOLTIP_WIDTH + 40,
                left: mouse.x > window.innerWidth / 2 ? mouse.x - TOOLTIP_WIDTH - 54 : mouse.x + 14,
                top: mouse.y + 14,
              }}
            >
              <p className={TOOLTIP_NAME}>{hover.topFilm.FilmTitle}</p>
              <p className={TOOLTIP_SUBTITLE}>
                {hover.topFilm.Year}{hover.topFilm.directors?.length ? ` · ${hover.topFilm.directors.join(', ')}` : ''}
              </p>
              <p className={`${TOOLTIP_DETAIL} font-bold tabular-nums`}>
                #{hover.topRank.toLocaleString()} · {hover.topVotes.toLocaleString()} {hover.topVotes === 1 ? 'vote' : 'votes'}
              </p>
              <p className={`${TOOLTIP_DETAIL} border-t border-gray-300 mt-1.5 pt-1.5`}>
                <span className="font-bold uppercase tracking-wide">{hover.name}</span>
                {' · '}
                {Math.round(hover.topShare * 100)}% of {hover.votes.toLocaleString()} votes
              </p>
            </div>
          )}
        </div>
      )}
    </VizCard>
  )
}
