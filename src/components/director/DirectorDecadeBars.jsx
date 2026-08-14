import { useState, useMemo, useRef } from 'react'
import { rankIn, votesIn, tierColorOf, tierIndexOf } from '../../lib/rankTiers'
import {
  TOOLTIP_BOX_SM, TOOLTIP_NAME_SM, TOOLTIP_SUBTITLE_SM,
  TOOLTIP_DETAIL_SM, TOOLTIP_WIDTH_SM,
} from '../../utils/tooltip'

// Shared with the country page's decade heatmap, so the two decade views read as
// one family: same axis-label gutter, same 2px black rules boxing the plot, same
// minimum column width and header/footer strips.
const LABEL_WIDTH = 56
const HEADER_HEIGHT = 24
const AXIS_HEIGHT = 40
const MIN_COL = 50

// One square per film. The pitch is fixed rather than fitted to the tallest
// column, so a square means the same thing on every director page and two pages
// can be read against each other — the whole point of a unit chart.
//
// Squares TOUCH, as the heatmap's cells do. They're stacked with a 1px negative
// margin so each pair shares one black edge instead of stacking two, which keeps
// every rule in the column the same weight as the outer border. A gap here read
// as a dot plot; flush squares read as one mark subdivided, which is what a
// decade's filmography is.
const SQUARE = 26
const OVERLAP = 1
const PITCH = SQUARE - OVERLAP
// Densest decade in the dataset is Godard's 1960s at 17 films (426px at this
// size, near the country heatmap's own height); 99% of directors peak at 6 or
// fewer. The cap only exists so a future data change can't run the plot off the
// page — past ~17 films the squares shrink instead of the plot growing. MIN_ROWS
// keeps a one-film filmography from drawing a 26px-tall chart.
const MAX_PLOT = 440
const MIN_PITCH = 8
const MIN_ROWS = 3

/** Production year as a number; ranges like "1960-1964" resolve to their start. */
const startYear = film => parseInt(String(film.Year ?? ''), 10)

/**
 * One column per decade of the director's career, drawn as a stack of squares —
 * ONE SQUARE PER FILM — each shaded by where that film lands in the ranking for
 * the selected poll.
 *
 * A unit chart, not a bar chart. It was a bar subdivided into per-film slices,
 * which meant a film's mark changed size with the height of the bar it sat in:
 * one of Godard's seventeen 1960s films was a sliver, while a lone 1990s film was
 * a 300px block. Same datum, wildly different visual weight. Fixed squares make
 * the count literally countable and comparable across decades and across pages,
 * which is what the rest of the site already does with discrete marks (see
 * ContinentBreakdown's swatches).
 *
 * The data supports it exactly: the densest decade anyone has is Godard's 1960s
 * at 17 films, and 99% of directors peak at 6 or fewer, so no column ever needs
 * to wrap or scroll.
 *
 * Counting films rather than summing votes is what keeps this readable: vote
 * totals per decade span up to 677x (canon attention is winner-take-all, so one
 * masterpiece swamps every other column), while film counts span at most ~17x.
 * Depth doesn't disappear — it moves into the color ramp, where a single dark
 * square says "top 10" far more directly than a tall bar ever did.
 *
 * `poll` follows the filmography's selector, so switching to 1972 shows only the
 * films that drew votes that year, shaded by their standing in the 1972 field
 * (see rankTiers — shading is percentile-based, so a shade means the same thing
 * whichever poll is showing).
 *
 * THE FRAME IS FIXED AND THE SQUARES CHANGE. Both axes come from the whole
 * career, never from the selected poll, so stepping the selector is how this page
 * answers "what did the canon make of him, and when" — the columns stay put and
 * you watch them fill. That reading is the reason the page carries no separate
 * poll x decade chart: a prototype of one was built and set beside this, and this
 * won. See [[decade-views]] in the project notes.
 *
 * The CHROME deliberately copies the country page's decade heatmap — 2px black
 * rules boxing the plot, a bold uppercase label in the axis gutter, flat
 * black-bordered marks, counts printed under each column, and no outer frame. It
 * used to sit in its own border-2 box under a "Films per decade · darker means
 * higher in…" caption strip, both of which we'd already stripped from every other
 * chart on the site.
 *
 * The ENCODING can't become that heatmap: a poll x decade matrix needs a
 * filmography with spread, and 66% of directors place one film while 73% span one
 * decade. Even Godard, the largest filmography in the set, fills under half such
 * a grid. Countries carry it (France 69%, Japan 52%); directors would render an
 * eight-row grid to show one number.
 */
export default function DirectorDecadeBars({ films, poll = 'all', cutoffs }) {
  const [hover, setHover] = useState(null) // { film, x, y }
  const wrapRef = useRef(null)

  // Every film that ever drew a vote, in any poll. BOTH AXES ARE BUILT FROM THIS
  // AND NOT FROM THE SELECTED POLL, which is what makes the poll selector a way
  // of watching the career fill in over time rather than eight unrelated charts.
  // Scoped to the poll, Hitchcock's frame ran 1 column in 1952, 4 spanning
  // 1930-1960 in 1972 and 10 spanning 1920-2010 in 2022 — the decade under a
  // given column changed every time you moved the control, so nothing could be
  // compared with anything. Now only the squares change.
  //
  // The cost is real: at 1952 Hitchcock is one square in a ten-column frame. That
  // emptiness is the same fact the country heatmap keeps its blank poll rows for
  // — it says he entered the canon as a 1930s director and nothing else of his
  // had landed yet.
  const career = useMemo(() => films.filter(f => votesIn(f, 'all') > 0), [films])

  const byDecade = useMemo(() => {
    const m = new Map()
    career.forEach(film => {
      const y = startYear(film)
      if (Number.isNaN(y)) return
      const decade = Math.floor(y / 10) * 10
      if (!m.has(decade)) m.set(decade, [])
      m.get(decade).push(film)
    })
    return m
  }, [career])

  // The full career span, with empty decades kept as gaps on the axis.
  const decades = useMemo(() => {
    const ds = [...byDecade.keys()].sort((a, b) => a - b)
    if (!ds.length) return []
    const out = []
    for (let d = ds[0]; d <= ds[ds.length - 1]; d += 10) out.push(d)
    return out
  }, [byDecade])

  const columns = useMemo(
    () =>
      decades.map(d => {
        const inPoll = (byDecade.get(d) || [])
          .filter(f => votesIn(f, poll) > 0)
          // Best-ranked at the base, so every column reads dark → pale going up.
          .sort(
            (a, b) =>
              tierIndexOf(a, poll, cutoffs) - tierIndexOf(b, poll, cutoffs) ||
              (rankIn(a, poll) ?? 1e9) - (rankIn(b, poll) ?? 1e9)
          )
        return { decade: d, films: inPoll, count: inPoll.length }
      }),
    [decades, byDecade, poll, cutoffs]
  )

  // Height scale comes from the career too, not the visible poll, so a square
  // sits at the same y on every setting and a column's growth is legible.
  const maxCount = useMemo(
    () => Math.max(...[...byDecade.values()].map(list => list.length), 0),
    [byDecade]
  )

  // Square size holds at PITCH until a column would overflow MAX_PLOT, then
  // shrinks. Unreachable with the current data; it's a guard, not a feature.
  const { pitch, square, plotHeight } = useMemo(() => {
    const rows = Math.max(maxCount, MIN_ROWS)
    const p = Math.max(MIN_PITCH, Math.min(PITCH, Math.floor(MAX_PLOT / rows)))
    // The tallest column is rows * pitch + OVERLAP tall, since the topmost square
    // contributes its full height rather than a pitch.
    return { pitch: p, square: p + OVERLAP, plotHeight: rows * p + OVERLAP }
  }, [maxCount])

  // Ticks only once there are enough rows for counting-by-eye to get tedious.
  // Below that the squares ARE the axis, and a scale beside three of them is
  // noise. No gridlines either: the uniform pitch already aligns every column's
  // nth square, so the rows read as the grid.
  const ticks = useMemo(() => {
    if (maxCount < 8) return []
    const stride = maxCount > 12 ? 5 : 2
    const out = []
    for (let v = stride; v <= maxCount; v += stride) out.push(v)
    return out
  }, [maxCount])

  const showTip = (event, film) => {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect) return
    setHover({ film, x: event.clientX - rect.left, y: event.clientY - rect.top })
  }

  if (!columns.length) return null

  const hoveredKey = hover?.film?.key ?? null
  const scopeLabel = poll === 'all' ? 'all polls combined' : `the ${poll} poll`

  return (
    <div ref={wrapRef} className="relative">
      <div
        className="bg-white overflow-x-auto"
        role="img"
        aria-label={`One square per film, stacked by decade of release, each shaded by its rank in ${scopeLabel}.`}
      >
        <div className="flex">
          {/* Y axis gutter — label strip, scale, then a spacer level with the
              x-axis strip, exactly as the heatmap's poll column is built. */}
          <div
            className="shrink-0 flex flex-col border-r-2 border-black"
            style={{ width: LABEL_WIDTH }}
          >
            <div
              className="flex items-center justify-center text-xs font-bold uppercase tracking-wide text-gray-500 border-b border-gray-300"
              style={{ height: HEADER_HEIGHT }}
            >
              Films
            </div>
            <div className="relative" style={{ height: plotHeight }}>
              {ticks.map(v => (
                <div
                  key={v}
                  className="absolute right-3 text-[10px] tabular-nums text-gray-400"
                  style={{
                    // Level with the CENTRE of the vth square, so the number
                    // labels a mark rather than floating between two.
                    bottom: (v - 1) * pitch + square / 2,
                    transform: 'translateY(50%)',
                  }}
                >
                  {v}
                </div>
              ))}
            </div>
            <div style={{ height: AXIS_HEIGHT }} />
          </div>

          {/* Plot */}
          <div className="flex-1 flex flex-col">
            <div style={{ height: HEADER_HEIGHT }} />

            <div className="flex items-end gap-2" style={{ height: plotHeight }}>
              {columns.map(col => (
                <div
                  key={col.decade}
                  className="flex-1 flex flex-col-reverse items-center"
                  style={{ minWidth: MIN_COL }}
                >
                  {col.films.map(film => {
                    const active = hoveredKey === film.key
                    return (
                      <div
                        key={film.key}
                        onMouseEnter={e => showTip(e, film)}
                        onMouseMove={e => showTip(e, film)}
                        onMouseLeave={() => setHover(null)}
                        className="border border-black"
                        style={{
                          width: square,
                          height: square,
                          // Collapse the shared edge with the square above.
                          marginTop: -OVERLAP,
                          backgroundColor: tierColorOf(film, poll, cutoffs),
                          // Inset, so a hovered square doesn't bleed over its
                          // touching neighbours.
                          outline: active ? '2px solid #0b0b0b' : 'none',
                          outlineOffset: -2,
                          position: active ? 'relative' : undefined,
                        }}
                      />
                    )
                  })}
                </div>
              ))}
            </div>

            {/* X axis — decade over film count */}
            <div
              className="border-t-2 border-black flex gap-2"
              style={{ height: AXIS_HEIGHT }}
            >
              {columns.map(col => (
                <div
                  key={col.decade}
                  className="flex-1 text-center pt-1.5"
                  style={{ minWidth: MIN_COL }}
                >
                  <div className="text-xs font-bold tracking-wide text-black">
                    {col.decade}s
                  </div>
                  <div className="text-[11px] tabular-nums text-gray-400">
                    {col.count > 0 ? col.count : '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip — the shared styling from utils/tooltip, in its compact size, so
          this matches the standing chart directly above it on the page. Compact
          rather than full because this plot is as short as 76px for a one-film
          director, where the full box would be taller than the chart it explains.
          The hovered mark is a FILM, so it takes the title slot the country
          visualizations give to a country; rank takes the value slot, since rank
          is what the shading encodes. Votes and the poll scope are the detail
          line. Tier boundaries are deliberately never surfaced. */}
      {hover && (
        <div
          className={`pointer-events-none absolute z-20 ${TOOLTIP_BOX_SM}`}
          style={{
            left: Math.min(
              hover.x + 12,
              Math.max(0, (wrapRef.current?.clientWidth ?? 0) - TOOLTIP_WIDTH_SM)
            ),
            top: Math.max(hover.y - 12, 0),
            width: TOOLTIP_WIDTH_SM,
          }}
        >
          <p className={TOOLTIP_NAME_SM}>{hover.film.FilmTitle}</p>
          <p className={TOOLTIP_SUBTITLE_SM}>{hover.film.Year}</p>
          <p className={`${TOOLTIP_DETAIL_SM} font-bold tabular-nums mt-1`}>
            {rankIn(hover.film, poll) != null
              ? `#${rankIn(hover.film, poll).toLocaleString()}`
              : 'Unranked'}
            {' · '}
            {votesIn(hover.film, poll).toLocaleString()}{' '}
            {votesIn(hover.film, poll) === 1 ? 'vote' : 'votes'}
          </p>
          <p className={TOOLTIP_DETAIL_SM}>
            {poll === 'all' ? 'all polls' : `${poll} poll`}
          </p>
        </div>
      )}
    </div>
  )
}
