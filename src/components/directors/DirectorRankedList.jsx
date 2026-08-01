import { useState, useMemo, useEffect, useRef } from 'react'
import DirectorPanel from './DirectorPanel'

// One ink for every bar. The bar restates the ranking the row order already
// gives, so it's there to show the SHAPE of the drop-off, not a second variable.
const BAR_INK = 'rgba(28, 92, 171, 0.72)'

/**
 * The ranked field below the podium — and, more importantly, the place it stops.
 *
 * There is no page size and no "show more", because a director ranking ENDS on
 * its own. Past a certain depth every director is tied with someone, and a list
 * of tied names in an arbitrary order isn't a ranking however far you scroll it:
 * in 2022 the last director with a rank nobody shares is #149, and 1,038 of the
 * 2,071 sit together on the vote floor. The equivalent depths are #96 in 2012,
 * #41 in 1992, #22 in 1952 — so the list is short in the small polls and long in
 * the big ones, which is the truth about those polls rather than a display cap.
 *
 * Everyone below the cut is still reachable, by name, through the search box —
 * it queries the whole field and reports the rank a director shares.
 */
export default function DirectorRankedList({ rows, metric = 'votes', selectedPoll, topTarget, skipRanks = 10 }) {
  const [query, setQuery] = useState('')
  const [openDirector, setOpenDirector] = useState(null)
  const panelRef = useRef(null)

  const valueKey = metric === 'films' ? 'films' : 'votes'
  const rankKey = metric === 'films' ? 'filmsRank' : 'votesRank'

  const ordered = useMemo(
    () => [...(rows || [])].sort((a, b) => b[valueKey] - a[valueKey] || a.name.localeCompare(b.name)),
    [rows, valueKey]
  )

  // Where the ranking stops meaning anything: the deepest position whose value no
  // other director shares. Everything after it is ties all the way down.
  const { lastUnique, tiedBelow } = useMemo(() => {
    const counts = new Map()
    ordered.forEach(r => counts.set(r[valueKey], (counts.get(r[valueKey]) || 0) + 1))
    let last = 0
    ordered.forEach((r, i) => {
      if (counts.get(r[valueKey]) === 1) last = i + 1
    })
    return { lastUnique: last, tiedBelow: ordered.length - last }
  }, [ordered, valueKey])

  const ranked = useMemo(
    () => ordered.slice(0, lastUnique).filter(r => r[rankKey] > skipRanks),
    [ordered, lastUnique, rankKey, skipRanks]
  )

  // Search runs against the WHOLE field, including everyone past the cut — that's
  // the point of it. Ranks shown are the real ones, ties included.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    return ordered.filter(r => r.name.toLowerCase().includes(q)).slice(0, 40)
  }, [ordered, query])

  const maxValue = useMemo(() => Math.max(...ordered.map(r => r[valueKey]), 1), [ordered, valueKey])

  const openRow = useMemo(() => ordered.find(r => r.name === openDirector) || null, [ordered, openDirector])

  useEffect(() => {
    if (openRow && panelRef.current) panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [openRow])

  useEffect(() => {
    if (openDirector && !ordered.some(r => r.name === openDirector)) setOpenDirector(null)
  }, [ordered, openDirector])

  const shown = results ?? ranked
  const isSearching = results !== null

  // The Films metric routinely runs out of unique ranks before the podium ends —
  // 2022 has 2,071 directors but only eight positions nobody shares, because a
  // film count is a small integer that hundreds of directors land on. There's no
  // list to draw in that case, so the explanation becomes the whole section
  // rather than a caption under an empty table.
  const nothingToRank = !isSearching && ranked.length === 0

  return (
    <div className="bg-white border-4 border-black p-6 mb-8">
      <div className="mb-4 border-b-2 border-gray-300 pb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-black text-black uppercase tracking-wide">
            {isSearching ? 'Search' : nothingToRank ? 'Beyond the Top' : 'The Rest of the Field'}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {isSearching
              ? `Any of the ${ordered.length.toLocaleString()} directors at these filters`
              : nothingToRank
                ? `${ordered.length.toLocaleString()} directors at these filters`
                : // Derived from the first row, not skipRanks — a tie can push the
                  // podium past rank 10, and the heading must not claim otherwise.
                  `#${ranked[0][rankKey]} to #${lastUnique} by ${metric === 'films' ? 'film count' : 'votes'}`}
          </p>
        </div>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={`Search all ${ordered.length.toLocaleString()} directors…`}
          className="w-64 px-3 py-2 border-2 border-black text-sm font-medium text-black focus:outline-none focus:ring-2 focus:ring-black"
        />
      </div>

      <div className="relative">
        {!nothingToRank && (
        <div className="flex items-center gap-3 pb-2 mb-1 border-b-2 border-black text-[10px] font-black uppercase tracking-widest text-gray-500">
          <span className="w-10 text-right flex-shrink-0">#</span>
          <span className="w-44 flex-shrink-0">Director</span>
          <span className="flex-1 min-w-0">{metric === 'films' ? 'Films' : 'Votes'}</span>
          <span className="w-16 text-right flex-shrink-0 hidden sm:inline">
            {metric === 'films' ? 'Votes' : 'Films'}
          </span>
          <span className="w-24 text-right flex-shrink-0 hidden md:inline">Span</span>
        </div>
        )}

        <ol>
          {shown.map(row => (
            <li
              key={row.name}
              className="flex items-center gap-3 py-1.5 border-b border-gray-100 hover:bg-gray-50"
            >
              <span className="w-10 text-right text-sm font-black tabular-nums text-gray-400 flex-shrink-0">
                {row[rankKey]}
              </span>

              <button
                type="button"
                onClick={() => setOpenDirector(row.name)}
                title={row.name}
                className="w-44 flex-shrink-0 text-left text-sm font-bold text-black truncate hover:underline decoration-2 underline-offset-2"
              >
                {row.name}
              </button>

              <div className="flex-1 min-w-0 flex items-center gap-2">
                <div
                  className="h-4 flex-shrink-0"
                  style={{
                    width: `${Math.max((row[valueKey] / maxValue) * 100, 0.6)}%`,
                    backgroundColor: BAR_INK,
                  }}
                />
                <span className="text-xs font-black tabular-nums text-black">
                  {row[valueKey].toLocaleString()}
                </span>
              </div>

              <span className="w-16 text-right text-xs tabular-nums text-gray-500 flex-shrink-0 hidden sm:inline">
                {metric === 'films' ? row.votes.toLocaleString() : row.films.toLocaleString()}
              </span>

              <span className="w-24 text-right text-xs tabular-nums text-gray-400 flex-shrink-0 hidden md:inline">
                {row.yearFrom == null
                  ? '—'
                  : row.yearFrom === row.yearTo
                    ? row.yearFrom
                    : `${row.yearFrom}–${row.yearTo}`}
              </span>
            </li>
          ))}
        </ol>

        {isSearching && shown.length === 0 && (
          <p className="py-12 text-center text-gray-500 font-medium">
            No director matching “{query.trim()}” at these filters.
          </p>
        )}

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

      {/* Why the list stops. Stated rather than hidden behind a cap, because the
          number is the interesting part: half this poll's directors share one
          value. */}
      {!isSearching && tiedBelow > 0 && (
        <div className={nothingToRank ? '' : 'mt-5 pt-4 border-t-2 border-black'}>
          <p className="text-sm text-black font-bold">
            {nothingToRank ? `The ranking ends at #${lastUnique}.` : 'The ranking ends here.'}
          </p>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-2xl">
            The {tiedBelow.toLocaleString()} directors below #{lastUnique} are all tied with someone on{' '}
            {metric === 'films' ? 'film count' : 'votes'}
            {metric === 'films'
              ? ' — most of them on a single film.'
              : ', and most of them on a single vote.'}{' '}
            Ordering them would be arbitrary. Search above to find any of them by name.
            {metric === 'films' && (
              <>
                {' '}A film count is a small integer, so it ties almost the whole field —{' '}
                <span className="font-bold text-black">switch the metric to Votes</span> for a ranking with
                real depth.
              </>
            )}
          </p>
        </div>
      )}
    </div>
  )
}
