import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import DirectorPanel from './DirectorPanel'
import VizCard from '../layout/VizCard'
import { TIER_COLORS, tierIndexForRank } from '../director/rankTiers'
import { orderRows } from './rankedField'
import useDirectorSelection from '../../hooks/useDirectorSelection'
import { DirectorQuickFilters, DirectorSearchDropdown } from './DirectorSelectionControls'
import { posterUrl } from '../../utils/filmImages'
import { TOOLTIP_BOX, TOOLTIP_TITLE, TOOLTIP_SUBTITLE, TOOLTIP_VALUE, TOOLTIP_DETAIL, TOOLTIP_WIDTH } from '../../utils/tooltip'

// 2:3, and sized so it fits inside the 72px row of the ten-director view.
const POSTER = { w: 40, h: 60 }

/** Nearest 1/2/5/10 at the right magnitude — the axis step, rounded up. */
function niceStep(raw) {
  if (!(raw > 0)) return 1
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)))
  const normalized = raw / magnitude
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return Math.max(1, step * magnitude)
}

/**
 * Directors ranked, drawn as the Countries page's bar chart with one difference:
 * every bar is built out of its own films, one tile per film, shaded by that
 * film's rank tier.
 *
 * **Tiles are equal, never sized by votes.** Sizing segments by votes is the
 * obvious encoding and it fails outright: within a single filmography votes span
 * 215:1 (Akerman) and 440:1 across the field, so a one-vote film lands at half a
 * percent of the bar — about a pixel. A minimum width doesn't rescue it either,
 * because a legible floor on one vote lets twenty of them out-measure Jeanne
 * Dielman and the bar starts lying. Equal tiles give every film the same footprint
 * and move depth into color — the same trade the director decade bars already
 * make, for the same reason. It also makes each film a target big enough to hover.
 *
 * **So bar LENGTH is film count, while bar ORDER is the active metric.** Those are
 * deliberately different quantities, and the gap between them is the point. In
 * 2022 Godard draws the longest bar — 30 films — and still ranks #5 on 238 votes,
 * because nothing anchors it: his best film, Breathless, is 22% of his total and
 * the bar is mostly pale. Akerman ranks #2 on 312 votes from a bar barely half as
 * long, because 215 of those votes are Jeanne Dielman alone. Reading length
 * against order is reading breadth against weight; the axis label names the
 * length and the sidebar's metric toggle names the order, so no caption has to.
 *
 * Implemented as a STACKED bar: one Recharts <Bar> per film slot, each carrying a
 * value of 1, so the x-axis is a plain film count and every tile is a real rect
 * with its own hover target. Rows with fewer films leave later slots undefined and
 * Recharts simply doesn't draw them.
 */
export default function DirectorsRankedBarChart({ rows, metric = 'votes', selectedPoll, topTarget, cuts }) {
  const [openDirector, setOpenDirector] = useState(null)

  const [hover, setHover] = useState(null)
  const [mouse, setMouse] = useState({ x: 0, y: 0 })

  const chartContainerRef = useRef(null)
  const panelRef = useRef(null)

  const valueKey = metric === 'films' ? 'films' : 'votes'
  const rankKey = metric === 'films' ? 'filmsRank' : 'votesRank'

  const ordered = useMemo(() => orderRows(rows, valueKey), [rows, valueKey])
  const sel = useDirectorSelection(ordered, rankKey)

  const chartData = useMemo(
    () => sel.selectedData.map(row => {
      // One key per film slot; the value is always 1 so the axis counts films.
      const slots = {}
      row.filmList.forEach((_, i) => { slots[`f${i}`] = 1 })
      return { ...row, ...slots, rank: row[rankKey], value: row[valueKey] }
    }),
    [sel.selectedData, rankKey, valueKey]
  )

  const maxFilms = useMemo(
    () => chartData.reduce((max, row) => Math.max(max, row.films), 0),
    [chartData]
  )

  // Taller than the countries chart's 40/30, because this is the page's hero and
  // because each bar has internal structure to read — thirty tiles in a 28px bar
  // are too fine to aim at, let alone tell apart. 72px at the top view is also
  // what buys the poster its 60px of height; see POSTER below.
  const rowHeight = chartData.length <= 10 ? 72 : chartData.length <= 25 ? 40 : 28
  const chartHeight = useMemo(
    () => Math.max(180, Math.min(1900, chartData.length * rowHeight)),
    [chartData.length, rowHeight]
  )

  /**
   * Posters appear only in the ten-row view, and that is a size decision, not a
   * taste one. A poster is 2:3, so a 40px-wide one needs 60px of height, and only
   * the 72px row has that to give — at Top 25's 40px row the poster falls to
   * 24px wide, which is below the size where anyone recognises an image. The
   * deeper views are for reading the field; the top view is the one where "who
   * IS that" is a real question, and where the retired podium used to answer it.
   */
  // A module constant, not an inline literal: this feeds the chart's memo deps,
  // and a fresh object every render would invalidate it on every mouse move —
  // which is exactly the re-render that destroys the tiles' hover events.
  const poster = chartData.length <= 10 ? POSTER : null
  const axisWidth = poster ? 140 + poster.w + 10 : 140

  const rowsByName = useMemo(() => {
    const map = new Map()
    chartData.forEach(row => map.set(row.name, row))
    return map
  }, [chartData])

  /**
   * The x-axis is pinned to the real maximum instead of Recharts' "nice" domain.
   *
   * Left to itself Recharts rounds the top of the axis out to whatever suits five
   * round ticks, and the overshoot is severe: All Polls Combined maxes at Godard's
   * 42 films and Recharts opens the domain to 60, so the longest bar in the chart
   * stops 30% short of the plot edge and every other bar is squashed for nothing.
   * Fixing the domain at maxFilms and choosing the tick step ourselves keeps the
   * widest bar full-width in every poll.
   */
  const { domain, ticks } = useMemo(() => {
    const top = Math.max(maxFilms, 1)
    const step = niceStep(top / 5)
    const marks = []
    for (let t = 0; t <= top; t += step) marks.push(t)
    return { domain: [0, top], ticks: marks }
  }, [maxFilms])

  const openRow = useMemo(
    () => ordered.find(r => r.name === openDirector) || null,
    [ordered, openDirector]
  )

  useEffect(() => {
    if (openRow && panelRef.current) panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [openRow])

  // Filter changes leave the panel open — it re-reads the new data, matching the
  // countries chart. Only close if the director dropped out of the data entirely.
  useEffect(() => {
    if (openDirector && !ordered.some(r => r.name === openDirector)) setOpenDirector(null)
  }, [ordered, openDirector])

  // Both stable, so they never change the memoized chart's identity below.
  const enterTile = useCallback(next => setHover(next), [])
  const leaveTile = useCallback((rowName, filmIndex) => {
    // Functional form: adjacent tiles fire leave-then-enter, and an
    // unconditional clear would wipe the tile just entered.
    setHover(prev =>
      prev && prev.row.name === rowName && prev.filmIndex === filmIndex ? null : prev
    )
  }, [])

  /**
   * The chart is memoized and deliberately does NOT depend on `hover`.
   *
   * This is load-bearing, not an optimization. Feeding hover state into the bars
   * re-renders them, and Recharts rebuilds every tile as a NEW DOM node. The
   * cursor then sits inside an element that never received a mouseover, so the
   * browser stops firing mouse events entirely — verified in the page: hovering
   * one tile produced a single native mouseover and then nothing, no matter
   * where the mouse went. The first hover killed every hover after it. Keeping
   * hover out means the tile nodes are created once and survive, and the
   * highlight is drawn on an overlay above the chart instead.
   */
  const chart = useMemo(() => (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
        <XAxis
          type="number"
          allowDecimals={false}
          domain={domain}
          ticks={ticks}
          stroke="#000000"
          tick={{ fill: '#000000', fontSize: 12 }}
          axisLine={{ stroke: '#000000', strokeWidth: 2 }}
          tickLine={{ stroke: '#000000' }}
          label={{
            value: 'Films in the canon',
            position: 'insideBottom',
            offset: -5,
            style: { fontWeight: 'bold', fill: '#000000' },
          }}
        />
        <YAxis
          dataKey="name"
          type="category"
          width={axisWidth}
          interval={0}
          stroke="#000000"
          axisLine={{ stroke: '#000000', strokeWidth: 2 }}
          tickLine={{ stroke: '#000000' }}
          tick={<DirectorTick rowsByName={rowsByName} poster={poster} />}
        />

        {/* One Bar per film slot, each drawn by a custom shape. Bar's own
            onMouseEnter fires on the Bar's LAYER rather than per rectangle, so
            it never re-fires as you cross tiles inside one stack; the shape
            puts a real handler on every tile instead. */}
        {Array.from({ length: maxFilms }, (_, i) => (
          <Bar
            key={`f${i}`}
            dataKey={`f${i}`}
            stackId="films"
            isAnimationActive={false}
            shape={
              <FilmTile
                filmIndex={i}
                cuts={cuts}
                onEnter={enterTile}
                onLeave={leaveTile}
                onSelect={setOpenDirector}
              />
            }
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  ), [chartData, maxFilms, chartHeight, cuts, domain, ticks, axisWidth, rowsByName, poster, enterTile, leaveTile])

  if (!rows?.length) {
    return (
      <div className="bg-white border-4 border-black p-6 mb-8">
        <div className="text-center text-black font-medium py-8">Loading director data…</div>
      </div>
    )
  }

  const hoveredFilm = hover ? hover.row.filmList[hover.filmIndex] : null

  return (
    <VizCard title="Directors Ranked" controls={<DirectorQuickFilters sel={sel} />}>
      <div
        ref={chartContainerRef}
        className="relative"
        onMouseMove={e => setMouse({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setHover(null)}
      >
        <style>{`.director-bar-chart *:focus,
          .director-bar-chart *:focus-visible,
          .director-bar-chart * { outline: none; }`}</style>

        <div className="director-bar-chart relative">
          {chart}

          {/* Highlight lives on an overlay, for two reasons. It keeps hover state
              out of the chart (see `chart` above), and SVG has no z-index — a
              stroke drawn on the tile itself would be painted over along the
              edge it shares with the next slot, so it would look heavier on one
              side. Amber, because the ramp is a single blue and a blue outline
              would read as one more rank tier. */}
          {hover && (
            <svg
              className="absolute inset-0 pointer-events-none"
              width="100%"
              height={chartHeight}
              aria-hidden="true"
            >
              <rect
                x={hover.x + 1.25}
                y={hover.y + 1.25}
                width={Math.max(hover.width - 2.5, 0.5)}
                height={Math.max(hover.height - 2.5, 0.5)}
                fill="none"
                stroke="#f59e0b"
                strokeWidth={2.5}
              />
            </svg>
          )}
        </div>

        {openRow && (
          <DirectorPanel
            row={openRow}
            metric={metric}
            selectedPoll={selectedPoll}
            topTarget={topTarget}
            onClose={() => setOpenDirector(null)}
            panelRef={panelRef}
          />
        )}
      </div>

      {/* Per-tile tooltip: the film first, then the director whose bar it sits in */}
      {hoveredFilm && !openRow && (
        <div
          className={`fixed pointer-events-none z-50 ${TOOLTIP_BOX}`}
          style={{
            width: TOOLTIP_WIDTH,
            left: mouse.x > window.innerWidth / 2 ? mouse.x - 220 : mouse.x + 14,
            top: mouse.y + 14,
          }}
        >
          <p className={TOOLTIP_TITLE}>{hoveredFilm.film?.FilmTitle}</p>
          <p className={TOOLTIP_SUBTITLE}>
            {hoveredFilm.film?.Year} · {hover.row.name}
          </p>
          <p className={TOOLTIP_VALUE}>
            {hoveredFilm.rank == null ? 'Unranked' : `#${hoveredFilm.rank.toLocaleString()}`}
            {' · '}
            {hoveredFilm.votes.toLocaleString()} {hoveredFilm.votes === 1 ? 'vote' : 'votes'}
          </p>
          <p className={TOOLTIP_DETAIL}>
            Film {hover.filmIndex + 1} of {hover.row.films} · {hover.row.name} is #
            {hover.row[rankKey].toLocaleString()} on {metric === 'films' ? 'film count' : 'votes'}
          </p>
        </div>
      )}

      {/* Search-and-add sits BELOW the chart, as on the countries page. */}
      <DirectorSearchDropdown sel={sel} />
    </VizCard>
  )

}

/**
 * One film, as one tile in its director's bar.
 *
 * Recharts clones this element with the computed rectangle props (x/y/width/
 * height/payload), keeping the props passed at the call site, so `filmIndex`
 * plus `payload` identifies the exact film. The tile reports its own geometry
 * on enter so the overlay can outline it without the chart ever knowing which
 * tile is hovered.
 */
function FilmTile({ x, y, width, height, payload, filmIndex, cuts, onEnter, onLeave, onSelect }) {
  const entry = payload?.filmList?.[filmIndex]
  if (!entry || !(width > 0) || !(height > 0)) return null

  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={TIER_COLORS[tierIndexForRank(entry.rank, cuts)]}
      stroke="#000000"
      strokeWidth={1}
      style={{ cursor: 'pointer' }}
      onMouseEnter={() => onEnter({ row: payload, filmIndex, x, y, width, height })}
      onMouseLeave={() => onLeave(payload.name, filmIndex)}
      onClick={() => onSelect(payload.name)}
    />
  )
}

/**
 * The axis label: the director's name, and in the top view their most-voted
 * film's poster.
 *
 * The poster is doing the one job the bars cannot. A reader who doesn't know the
 * name "Chantal Akerman" recognises the Jeanne Dielman poster on sight, and
 * without it the row is a name and an abstract shape. This is the job the retired
 * podium existed for; putting it on the axis keeps it without restating the top
 * ten in a second section.
 *
 * Names run long — Rainer Werner Fassbinder is 25 characters — so the label gets
 * more room than the countries chart's 95px and still truncates.
 */
function DirectorTick({ x, y, payload, rowsByName, poster }) {
  const name = payload.value
  const row = rowsByName?.get(name)
  const film = row?.topFilm
  const src = poster && film ? posterUrl(film, 'w185') : null

  const maxChars = 20
  const display = name.length > maxChars ? `${name.substring(0, maxChars - 1)}…` : name
  const textX = poster ? -(poster.w + 18) : -8

  return (
    <g transform={`translate(${x},${y})`}>
      <title>{film ? `${name} — ${film.FilmTitle}` : name}</title>

      {poster && (
        // No poster art for this film: a bordered blank still reads as "a film
        // sits here", where an absent box would punch a hole in the column.
        <g transform={`translate(${-(poster.w + 8)}, ${-poster.h / 2})`}>
          <rect width={poster.w} height={poster.h} fill="#111827" stroke="#000000" strokeWidth={1} />
          {src && (
            <image
              href={src}
              width={poster.w}
              height={poster.h}
              preserveAspectRatio="xMidYMid slice"
            />
          )}
        </g>
      )}

      <text x={textX} y={0} dy={poster ? -1 : 4} textAnchor="end" fill="#000000" fontSize="12" fontWeight="600">
        {display}
      </text>
      {poster && film && (
        <text x={textX} y={0} dy={13} textAnchor="end" fill="#6b7280" fontSize="10" fontStyle="italic">
          {film.FilmTitle.length > 24 ? `${film.FilmTitle.substring(0, 23)}…` : film.FilmTitle}
        </text>
      )}
    </g>
  )
}
