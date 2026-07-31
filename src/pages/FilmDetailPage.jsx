import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Dot,
} from 'recharts'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { backdropUrl, posterUrl } from '../utils/filmImages'
import { POLL_YEARS, buildPollFloors } from '../utils/polls'

function formatRuntime(mins) {
  if (!mins) return null
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h && m) return `${h}h ${m}m`
  if (h) return `${h}h`
  return `${m}m`
}

export default function FilmDetailPage() {
  const { key } = useParams()
  const [films, setFilms] = useState(null)
  const [voters, setVoters] = useState(null)
  const [voterSlugs, setVoterSlugs] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    // Films (required) load first; the voter index is larger and only needed here.
    fetch('/data/films.json')
      .then(r => r.json())
      .then(data => { if (alive) { setFilms(data); setLoading(false) } })
    fetch('/data/film-voters.json')
      .then(r => r.json())
      .then(data => { if (alive) setVoters(data) })
      .catch(() => { if (alive) setVoters({}) })
    // Maps each ballot's raw spelling to the voter page(s) it belongs to. Built
    // alongside voters.json so the slug rules live in one place.
    fetch('/data/voter-slugs.json')
      .then(r => r.json())
      .then(data => { if (alive) setVoterSlugs(data) })
      .catch(() => { if (alive) setVoterSlugs({}) })
    return () => { alive = false }
  }, [])

  const film = useMemo(() => {
    if (!films) return null
    return films.find(f => String(f.key) === String(key)) || null
  }, [films, key])

  const filmVoters = voters && film ? (voters[String(film.key)] || {}) : null

  // Deepest rank recorded in each poll — the floor of the rank chart's axis and
  // its depth band. See buildPollFloors for why it's derived, not hardcoded.
  const pollFloors = useMemo(() => buildPollFloors(films), [films])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-black font-medium">Loading…</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (!film) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="text-3xl font-black uppercase mb-3">Film not found</h1>
          <p className="text-gray-600 mb-6">No film matches this address.</p>
          <Link to="/explore" className="inline-block px-6 py-3 bg-black text-white font-bold uppercase tracking-wide text-sm hover:bg-gray-800">
            ← Back to Explore
          </Link>
        </div>
        <Footer />
      </div>
    )
  }

  const backdrop = backdropUrl(film, { mubiWidth: 1280, tmdbSize: 'w1280' })
  const poster = posterUrl(film, 'w342')
  const runtime = formatRuntime(film.runtime)

  // Co-production countries not already in the primary list.
  const extraCoProd = (film.coProductionCountries || []).filter(
    c => !(film.countries || []).includes(c)
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero band */}
      <div className="relative bg-black">
        {backdrop && (
          <img
            src={backdrop}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          />
        )}
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row gap-6">
            {poster && (
              <img
                src={poster}
                alt={film.FilmTitle}
                className="w-40 flex-shrink-0 border-2 border-white/80 self-start"
              />
            )}
            <div className="text-white pt-1">
              <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight leading-none">
                {film.FilmTitle}
              </h1>
              {film.AlternateTitle && (
                <div className="text-lg text-white/70 italic mt-1">{film.AlternateTitle}</div>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-bold uppercase tracking-wide text-white/90">
                {film.Year && <span>{film.Year}</span>}
                {runtime && <><span className="text-white/40">·</span><span>{runtime}</span></>}
                {film.directors?.length > 0 && (
                  <>
                    <span className="text-white/40">·</span>
                    <span className="normal-case tracking-normal">
                      {film.directors.map((d, i) => (
                        <span key={d}>
                          {i > 0 && ', '}
                          <Link to={`/director/${encodeURIComponent(d)}`} className="underline decoration-white/30 hover:decoration-white">
                            {d}
                          </Link>
                        </span>
                      ))}
                    </span>
                  </>
                )}
              </div>
              {film.genres?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {film.genres.map(g => (
                    <span key={g} className="text-[11px] font-bold uppercase tracking-widest border border-white/40 px-2 py-1">
                      {g}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">

        {/* Countries + synopsis */}
        <section className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            {film.synopsis && (
              <div>
                <SectionHeading title="Synopsis" />
                <p className="text-gray-800 leading-relaxed">{film.synopsis}</p>
              </div>
            )}
          </div>
          <div>
            <SectionHeading title="Country" />
            <div className="flex flex-wrap gap-2">
              {(film.countries || []).map(c => (
                <Link
                  key={c}
                  to={`/countries/${encodeURIComponent(c)}`}
                  className="text-sm font-bold border-2 border-black px-3 py-1 bg-white hover:bg-black hover:text-white transition-colors"
                >
                  {c}
                </Link>
              ))}
            </div>
            {extraCoProd.length > 0 && (
              <div className="mt-3">
                <div className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-1">
                  Co-production
                </div>
                <div className="flex flex-wrap gap-2">
                  {extraCoProd.map(c => (
                    <Link
                      key={c}
                      to={`/countries/${encodeURIComponent(c)}`}
                      className="text-xs font-medium border border-gray-300 px-2 py-1 bg-white text-gray-600 hover:border-black hover:text-black transition-colors"
                    >
                      {c}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Votes across the polls */}
        <section>
          <SectionHeading title="Across the polls" />
          <PollHistoryStrip film={film} />
          <PollTrendChart film={film} pollFloors={pollFloors} />
        </section>

        {/* Voters */}
        <section>
          <SectionHeading title="Who voted for it" />
          <VotersSection film={film} filmVoters={filmVoters} voterSlugs={voterSlugs} />
        </section>
      </div>

      <Footer />
    </div>
  )
}

function SectionHeading({ title }) {
  return (
    <div className="mb-3 border-b-2 border-black pb-1">
      <h2 className="text-xl font-black uppercase tracking-tight">{title}</h2>
    </div>
  )
}

/**
 * A cell per poll: rank, with the vote count beneath it. Greyed when the film
 * didn't appear.
 *
 * Rank leads and votes sits under it in smaller grey type. That hierarchy is the
 * house metric rule (see CLAUDE.md) — votes are a secondary detail — and it earns
 * its keep here specifically because the chart below is rank-only: the strip is
 * where the vote counts live, as a per-poll lookup rather than a trend.
 *
 * Two other shapes were tried and rejected. Giving both figures equal weight left
 * two big numerals stacked in a small box with nothing saying which was which;
 * splitting each cell into labelled halves fixed that but broke the horizontal
 * run. A transposed two-row table fixed the scanning, then became redundant once
 * the chart took over the rank trajectory — and scanning votes across polls was
 * never meaningful anyway, given the electorate grew 35x.
 *
 * Eight columns also put each cell directly above its point on the chart.
 */
function PollHistoryStrip({ film }) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-8 border-2 border-black divide-x divide-y sm:divide-y-0 divide-gray-200 mb-6">
      {POLL_YEARS.map(year => {
        const poll = film.pollHistory.find(p => p.year === year)
        const appeared = poll && poll.votes > 0
        return (
          <div key={year} className={`p-3 text-center ${appeared ? 'bg-white' : 'bg-gray-50'}`}>
            <div className="text-[11px] font-bold uppercase tracking-widest text-gray-500">{year}</div>
            <div className={`text-xl font-black tabular-nums leading-tight mt-1 ${appeared ? 'text-black' : 'text-gray-300'}`}>
              {appeared && poll.rank ? `#${poll.rank}` : '—'}
            </div>
            <div className={`text-xs tabular-nums ${appeared ? 'text-gray-600' : 'text-gray-300'}`}>
              {appeared ? `${poll.votes.toLocaleString()} ${poll.votes === 1 ? 'vote' : 'votes'}` : '—'}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * The film's rank across the eight polls.
 *
 * Rank only, deliberately. Vote counts aren't comparable between polls — the
 * electorate grew from 47 critics to 1,635 — so a rising vote line reads as
 * growing support when it can mean the opposite. A rank/votes toggle was tried
 * and removed: with the depth band in place the rank view answers the positional
 * question properly, and a votes view mostly offered a misleading second reading
 * of the same eight points. The counts live in the strip above, per poll, where
 * they're a lookup rather than a trend.
 *
 * The tooltip is just the poll year and the figures. It also carried each poll's
 * share of voters and its deepest rank; both were dropped once the depth band
 * landed, since the band shows positional context continuously and in place,
 * where the tooltip only offered it one hover at a time.
 *
 * The chart carries no heading of its own — the axis format ('#12') names the
 * measure and the section heading frames the block.
 *
 * The rank axis is logarithmic and always anchored at #1. It used to rescale to
 * each film's own range, which drew relative movement but read as absolute
 * standing: a film hovering around #1,200 filled the plot exactly like Vertigo.
 * Anchoring a LINEAR axis at #1 fixes that but inverts the problem — against a
 * domain of [1, 1652] a top-100 film's real movement collapses into a few pixels.
 * Log escapes the trade because rank is already perceptually logarithmic (#1 to
 * #10 matters far more than #1200 to #1210): height always means absolute
 * standing, while movement stays legible at every depth.
 */
function PollTrendChart({ film, pollFloors = {} }) {
  const chartData = useMemo(() => POLL_YEARS.map(year => {
    const poll = film.pollHistory.find(p => p.year === year)
    const votes = poll && poll.votes > 0 ? poll.votes : null
    return {
      year: `'${year.toString().slice(2)}`,
      yearNum: year,
      votes,
      rank: poll && poll.votes > 0 ? poll.rank : null,
      // Present for every poll, not just the ones this film charted in — the
      // shaded depth band spans the full width regardless.
      floor: pollFloors[year] ?? null,
    }
  }), [film.pollHistory, pollFloors])

  const hasHistory = chartData.some(d => d.rank !== null)

  // Reversed log axis, #1 down to the deepest rank any poll ever recorded — the
  // SAME domain on every film page, so two films can be compared directly.
  //
  // An earlier pass scoped this floor to the film's own polls, to keep a 1952-only
  // film off a #1,652 baseline it could never have reached. The depth band makes
  // that unnecessary and is the better answer: rather than hiding the depth the
  // film couldn't reach, it draws it, so the film reads as sitting at the edge of
  // what existed instead of floating in blank space.
  const yDomain = useMemo(
    () => [1, Math.max(10, ...Object.values(pollFloors))],
    [pollFloors]
  )

  // Decade strata (#1, #10, #100, #1000) — the natural reading of a log rank axis,
  // and steadier across films than letting Recharts pick its own.
  const rankTicks = useMemo(() => {
    const ticks = []
    for (let t = 1; t <= yDomain[1]; t *= 10) ticks.push(t)
    return ticks
  }, [yDomain])

  if (!hasHistory) return null

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <div className="bg-black text-white text-xs px-3 py-2 border border-white/20">
        <div className="font-bold">{d.yearNum} poll</div>
        <div>
          {d.rank ? `rank #${d.rank}` : 'unranked'}
          {d.votes ? ` · ${d.votes} ${d.votes === 1 ? 'vote' : 'votes'}` : ''}
        </div>
      </div>
    )
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="year"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={false}
          />
          <YAxis
            reversed
            scale="log"
            domain={yDomain}
            ticks={rankTicks}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            width={48}
            allowDecimals={false}
            allowDataOverflow={false}
            tickFormatter={(v) => `#${v.toLocaleString()}`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#d1d5db' }} />
          {/* Depth band: ranks that poll never reached. Declared before the Line so
              it paints behind it. Rendering it turns a bare '#83' into '#83, and
              nothing went deeper that year' — which is the difference between The
              Third Man reading as mid-table in 1952 and as dead last, which it was. */}
          <Area
            type="monotone"
            dataKey="floor"
            baseValue={yDomain[1]}
            // gray-200 on the page's gray-50 background. gray-100 was only ~2%
            // off the backdrop and read as nothing. The boundary is dashed and
            // darker than the fill so it reads as a threshold rather than a
            // second data series competing with the film's line.
            fill="#e5e7eb"
            stroke="#9ca3af"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            activeDot={false}
            isAnimationActive={false}
          />
          {/* No connectNulls: a poll the film drew no votes in is a real absence,
              and bridging it drew a straight line implying a trajectory through
              polls where the film simply wasn't there. Gaps now break the line,
              and a lone appearance renders as an unconnected dot. */}
          <Line
            type="monotone"
            dataKey="rank"
            stroke="#000000"
            strokeWidth={2}
            dot={<Dot r={3} fill="#000" stroke="#fff" strokeWidth={1.5} />}
            activeDot={{ r: 5, fill: '#000', stroke: '#fff', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <p className="mt-2 text-xs text-gray-500 italic">
        Shading marks ranks that poll never recorded — 1952 bottomed out at #83, 2022
        runs to #1,652. A film at the edge of the shading was last that year.
      </p>
    </div>
  )
}

function VotersSection({ film, filmVoters, voterSlugs }) {
  // Which polls have voter data, most recent first.
  const pollsWithVoters = useMemo(() => {
    if (!filmVoters) return []
    return POLL_YEARS.filter(y => (filmVoters[String(y)] || []).length > 0).reverse()
  }, [filmVoters])

  // Default to the most recent poll that has voters.
  const [selectedPoll, setSelectedPoll] = useState(null)
  useEffect(() => {
    if (pollsWithVoters.length && selectedPoll === null) setSelectedPoll(pollsWithVoters[0])
  }, [pollsWithVoters, selectedPoll])

  if (filmVoters === null) {
    return <p className="text-sm text-gray-500">Loading voters…</p>
  }
  if (!pollsWithVoters.length) {
    return <p className="text-sm text-gray-500">No individual voter records for this film.</p>
  }

  const list = filmVoters[String(selectedPoll)] || []
  const voteCount = film.pollHistory.find(p => p.year === selectedPoll)?.votes ?? 0
  const partial = voteCount > list.length

  return (
    <div>
      {/* Poll selector — mirrors the Explore page's button row */}
      <div className="flex flex-wrap gap-2 mb-4">
        {pollsWithVoters.map(year => {
          const active = year === selectedPoll
          return (
            <button
              key={year}
              onClick={() => setSelectedPoll(year)}
              className={`px-4 py-2 font-black text-lg border-2 border-black transition-colors ${
                active
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-black hover:text-white'
              }`}
            >
              {year}
            </button>
          )
        })}
      </div>

      <div className="text-sm font-bold text-gray-500 mb-3">
        {list.length} {list.length === 1 ? 'voter' : 'voters'} in the{' '}
        <span className="text-black">{selectedPoll}</span> poll
        {partial && ` of ${voteCount} votes`}
      </div>

      {partial && (
        <p className="text-xs text-gray-500 italic mb-3">
          Named ballots for this early poll are incompletely recorded, so fewer names appear than the published vote total.
        </p>
      )}

      <VotersList voters={list} voterSlugs={voterSlugs} />
    </div>
  )
}

function VotersList({ voters, voterSlugs }) {
  const sorted = useMemo(() => {
    // Cluster by the first country listed (multiples are slash/comma-separated).
    const firstCountry = (c) => (c || 'Unknown').split(/[/,]/)[0].trim() || 'Unknown'
    const freq = new Map()
    voters.forEach(v => {
      const fc = firstCountry(v.c)
      freq.set(fc, (freq.get(fc) || 0) + 1)
    })
    // Order: first country by descending frequency, then A–Z by country, then name.
    return [...voters]
      .map(v => ({ ...v, fc: firstCountry(v.c) }))
      .sort((a, b) =>
        (freq.get(b.fc) - freq.get(a.fc)) ||
        a.fc.localeCompare(b.fc) ||
        a.n.localeCompare(b.n)
      )
  }, [voters])

  return (
    <ul className="columns-2 sm:columns-3 lg:columns-4 gap-x-8 text-sm text-gray-800">
      {sorted.map((v, i) => {
        // A joint ballot resolves to more than one person, so each name links
        // separately; anyone without a page renders as plain text.
        const people = voterSlugs?.[v.n] || []
        return (
          <li key={`${v.n}-${i}`} className="break-inside-avoid mb-1 leading-tight">
            {people.length > 0 ? (
              people.map((p, j) => (
                <span key={p.slug}>
                  {j > 0 && <span className="text-gray-300"> &amp; </span>}
                  <Link
                    to={`/voter/${p.slug}`}
                    className="hover:text-black hover:underline decoration-gray-400"
                  >
                    {p.name}
                  </Link>
                </span>
              ))
            ) : (
              <span>{v.n}</span>
            )}{' '}
            <span className="text-xs text-gray-400">{v.c}</span>
          </li>
        )
      })}
    </ul>
  )
}
