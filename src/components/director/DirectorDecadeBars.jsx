import { useState, useMemo, useRef } from 'react'
import { rankIn, votesIn, tierColorOf, tierIndexOf } from './rankTiers'

const PLOT_HEIGHT = 300
const MIN_CHUNK = 14 // px — a bar of many films still leaves each one hoverable

/** Production year as a number; ranges like "1960-1964" resolve to their start. */
const startYear = film => parseInt(String(film.Year ?? ''), 10)

/**
 * One bar per decade of the director's career; bar height is the NUMBER of films
 * from that decade, and each film is an equal chunk shaded by where it lands in
 * the ranking for the selected poll.
 *
 * Counting films rather than summing votes is what keeps this readable: vote
 * totals per decade span up to 677x (canon attention is winner-take-all, so one
 * masterpiece swamps every other bar), while film counts span at most ~17x.
 * Depth doesn't disappear — it moves into the color ramp, where a single dark
 * chunk says "top 10" far more directly than a tall bar ever did.
 *
 * `poll` follows the filmography's selector, so switching to 1972 redraws this
 * with only the films that drew votes that year, shaded by their standing in the
 * 1972 field (see rankTiers — shading is percentile-based, so a shade means the
 * same thing whichever poll is showing).
 */
export default function DirectorDecadeBars({ films, poll = 'all', cutoffs }) {
  const [hover, setHover] = useState(null) // { film, x, y }
  const wrapRef = useRef(null)

  // Only films that drew a vote in the selected poll appear at all.
  const inPoll = useMemo(
    () => films.filter(f => votesIn(f, poll) > 0),
    [films, poll]
  )

  const columns = useMemo(() => {
    const byDecade = new Map()
    inPoll.forEach(film => {
      const y = startYear(film)
      if (Number.isNaN(y)) return
      const decade = Math.floor(y / 10) * 10
      if (!byDecade.has(decade)) byDecade.set(decade, [])
      byDecade.get(decade).push(film)
    })
    if (!byDecade.size) return []

    const decades = [...byDecade.keys()].sort((a, b) => a - b)
    const out = []
    // Walk the full span so empty decades stay on the axis as gaps.
    for (let d = decades[0]; d <= decades[decades.length - 1]; d += 10) {
      const films = (byDecade.get(d) || [])
        // Best-ranked at the base, so every bar reads dark → pale going up.
        .sort(
          (a, b) =>
            tierIndexOf(a, poll, cutoffs) - tierIndexOf(b, poll, cutoffs) ||
            (rankIn(a, poll) ?? 1e9) - (rankIn(b, poll) ?? 1e9)
        )
      out.push({ decade: d, films, count: films.length })
    }
    return out
  }, [inPoll, poll, cutoffs])

  const maxCount = useMemo(() => Math.max(...columns.map(c => c.count), 0), [columns])

  // Integer axis: one tick per film, thinned out when a decade is crowded.
  const ticks = useMemo(() => {
    if (!maxCount) return [0]
    const stride = Math.ceil(maxCount / 6)
    const out = []
    for (let v = 0; v <= maxCount; v += stride) out.push(v)
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
    <div ref={wrapRef} className="relative bg-white border-2 border-black p-5">
      <div className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-5">
        Films per decade · darker means higher in {scopeLabel}
      </div>

      <div
        className="flex"
        role="img"
        aria-label={`Number of films per decade of release, each film shaded by its rank in ${scopeLabel}.`}
      >
        {/* Y axis */}
        <div className="relative w-8 flex-shrink-0" style={{ height: PLOT_HEIGHT }}>
          {ticks.map(v => (
            <div
              key={v}
              className="absolute right-2 -translate-y-1/2 text-[10px] tabular-nums text-gray-400"
              style={{ bottom: `${(v / maxCount) * 100}%` }}
            >
              {v}
            </div>
          ))}
        </div>

        {/* Plot */}
        <div className="relative flex-1" style={{ height: PLOT_HEIGHT }}>
          {ticks.map(v => (
            <div
              key={v}
              aria-hidden="true"
              className={`absolute inset-x-0 border-t ${v === 0 ? 'border-gray-300' : 'border-gray-100'}`}
              style={{ bottom: `${(v / maxCount) * 100}%` }}
            />
          ))}

          <div className="absolute inset-0 flex items-end justify-center gap-3">
            {columns.map(col => (
              <div key={col.decade} className="flex-1 max-w-[110px] h-full flex flex-col justify-end">
                {col.count > 0 && (
                  <div
                    className="flex flex-col-reverse w-full"
                    style={{ height: `${(col.count / maxCount) * 100}%` }}
                  >
                    {col.films.map(film => {
                      const active = hoveredKey === film.key
                      return (
                        <div
                          key={film.key}
                          onMouseEnter={e => showTip(e, film)}
                          onMouseMove={e => showTip(e, film)}
                          onMouseLeave={() => setHover(null)}
                          className="w-full"
                          style={{
                            // Equal slice per film — every film stays hoverable
                            // however lopsided its vote count.
                            height: `${100 / col.count}%`,
                            minHeight: Math.min(MIN_CHUNK, PLOT_HEIGHT / maxCount),
                            backgroundColor: tierColorOf(film, poll, cutoffs),
                            boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.9)',
                            outline: active ? '2px solid #0b0b0b' : 'none',
                            outlineOffset: '-2px',
                          }}
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* X axis — decade + film count */}
      <div className="flex">
        <div className="w-8 flex-shrink-0" />
        <div className="flex-1 flex gap-3 justify-center pt-2">
          {columns.map(col => (
            <div key={col.decade} className="flex-1 max-w-[110px] text-center">
              <div className="text-xs font-bold text-gray-700">{col.decade}s</div>
              <div className="text-[11px] tabular-nums text-gray-400">
                {col.count > 0 ? col.count : '—'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {hover && (
        <div
          className="pointer-events-none absolute z-20 bg-black text-white text-xs px-3 py-2 border border-white/20 max-w-[16rem]"
          style={{
            left: Math.min(hover.x + 12, (wrapRef.current?.clientWidth ?? 0) - 200),
            top: Math.max(hover.y - 12, 0),
          }}
        >
          <div className="font-bold leading-tight">{hover.film.FilmTitle}</div>
          <div className="text-white/60">{hover.film.Year}</div>
          {/* Rank and votes only — the shading's tier boundaries are deliberately
              never surfaced. */}
          <div className="mt-1 tabular-nums">
            {rankIn(hover.film, poll) != null ? `#${rankIn(hover.film, poll)}` : 'unranked'} ·{' '}
            {votesIn(hover.film, poll).toLocaleString()}{' '}
            {votesIn(hover.film, poll) === 1 ? 'vote' : 'votes'}
          </div>
          <div className="text-white/60">
            {poll === 'all' ? 'across all polls' : `in the ${poll} poll`}
          </div>
        </div>
      )}
    </div>
  )
}
