import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Dot,
} from 'recharts'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { backdropUrl, posterUrl } from '../utils/filmImages'

const POLL_YEARS = [1952, 1962, 1972, 1982, 1992, 2002, 2012, 2022]

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
    return () => { alive = false }
  }, [])

  const film = useMemo(() => {
    if (!films) return null
    return films.find(f => String(f.key) === String(key)) || null
  }, [films, key])

  const filmVoters = voters && film ? (voters[String(film.key)] || {}) : null

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

  const backdrop = backdropUrl(film, 'w1280')
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
                          <Link to={`/search?director=${encodeURIComponent(d)}`} className="underline decoration-white/30 hover:decoration-white">
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
                  to={`/visualizations/country/${encodeURIComponent(c)}`}
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
                      to={`/visualizations/country/${encodeURIComponent(c)}`}
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
          <SectionHeading title="Votes across the polls" />
          <VotesStrip film={film} />
          <VotesLineChart film={film} />
        </section>

        {/* Voters */}
        <section>
          <SectionHeading title="Who voted for it" />
          <VotersSection film={film} filmVoters={filmVoters} />
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

// A cell per poll: rank + vote count, greyed when the film didn't appear.
function VotesStrip({ film }) {
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
              {appeared ? `${poll.votes} ${poll.votes === 1 ? 'vote' : 'votes'}` : '—'}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function VotesLineChart({ film }) {
  const chartData = useMemo(() => POLL_YEARS.map(year => {
    const poll = film.pollHistory.find(p => p.year === year)
    return {
      year: `'${year.toString().slice(2)}`,
      yearNum: year,
      votes: poll && poll.votes > 0 ? poll.votes : null,
      rank: poll && poll.votes > 0 ? poll.rank : null,
    }
  }), [film.pollHistory])

  const hasHistory = chartData.some(d => d.rank !== null)

  // Reversed rank axis (#1 at top); scale to the film's own rank range.
  const yDomain = useMemo(() => {
    const ranks = chartData.filter(d => d.rank !== null).map(d => d.rank)
    if (!ranks.length) return [1, 100]
    const minRank = Math.min(...ranks)
    const maxRank = Math.max(...ranks)
    const upper = Math.max(maxRank * 1.3, minRank + 5)
    return [Math.max(1, minRank - 1), Math.ceil(upper)]
  }, [chartData])

  if (!hasHistory) return null

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <div className="bg-black text-white text-xs px-3 py-2 border border-white/20">
        <div className="font-bold">{d.yearNum} poll</div>
        <div>{d.rank ? `rank #${d.rank}` : 'unranked'}{d.votes ? ` · ${d.votes} ${d.votes === 1 ? 'vote' : 'votes'}` : ''}</div>
      </div>
    )
  }

  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2">Rank by poll</div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="year"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={false}
          />
          <YAxis
            reversed
            domain={yDomain}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            width={40}
            allowDecimals={false}
            tickFormatter={(v) => `#${v}`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#d1d5db' }} />
          <Line
            type="monotone"
            dataKey="rank"
            stroke="#000000"
            strokeWidth={2}
            connectNulls
            dot={<Dot r={3} fill="#000" stroke="#fff" strokeWidth={1.5} />}
            activeDot={{ r: 5, fill: '#000', stroke: '#fff', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function VotersSection({ film, filmVoters }) {
  // Which polls have voter data, most recent first.
  const pollsWithVoters = useMemo(() => {
    if (!filmVoters) return []
    return POLL_YEARS.filter(y => (filmVoters[String(y)] || []).length > 0).reverse()
  }, [filmVoters])

  // Default-open the most recent poll that has voters.
  const [openPoll, setOpenPoll] = useState(null)
  useEffect(() => {
    if (pollsWithVoters.length && openPoll === null) setOpenPoll(pollsWithVoters[0])
  }, [pollsWithVoters, openPoll])

  if (filmVoters === null) {
    return <p className="text-sm text-gray-500">Loading voters…</p>
  }
  if (!pollsWithVoters.length) {
    return <p className="text-sm text-gray-500">No individual voter records for this film.</p>
  }

  return (
    <div className="space-y-2">
      {pollsWithVoters.map(year => {
        const list = filmVoters[String(year)] || []
        const poll = film.pollHistory.find(p => p.year === year)
        const voteCount = poll?.votes ?? 0
        const partial = voteCount > list.length
        const isOpen = openPoll === year
        return (
          <div key={year} className="border-2 border-black bg-white">
            <button
              onClick={() => setOpenPoll(isOpen ? -1 : year)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
            >
              <span className="font-black uppercase tracking-tight">
                {year}
                <span className="ml-3 text-sm font-bold text-gray-500 normal-case tracking-normal">
                  {list.length} {list.length === 1 ? 'voter' : 'voters'}
                  {partial && ` of ${voteCount} votes`}
                </span>
              </span>
              <span className="text-xs text-gray-400">{isOpen ? '▼' : '▶'}</span>
            </button>
            {isOpen && (
              <div className="px-4 pb-4 pt-1 border-t border-gray-200">
                {partial && (
                  <p className="text-xs text-gray-500 italic mb-3">
                    Named ballots for this early poll are incompletely recorded, so fewer names appear than the published vote total.
                  </p>
                )}
                <VotersByCountry voters={list} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function VotersByCountry({ voters }) {
  const groups = useMemo(() => {
    const byCountry = new Map()
    voters.forEach(v => {
      const c = v.c || 'Unknown'
      if (!byCountry.has(c)) byCountry.set(c, [])
      byCountry.get(c).push(v.n)
    })
    return Array.from(byCountry.entries())
      .map(([country, names]) => ({ country, names: names.sort() }))
      .sort((a, b) => b.names.length - a.names.length || a.country.localeCompare(b.country))
  }, [voters])

  return (
    <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
      {groups.map(({ country, names }) => (
        <div key={country}>
          <div className="text-xs font-bold uppercase tracking-widest text-gray-500 border-b border-gray-200 pb-1 mb-1.5">
            {country} <span className="text-gray-400">({names.length})</span>
          </div>
          <ul className="text-sm text-gray-800 space-y-0.5">
            {names.map((n, i) => <li key={`${n}-${i}`}>{n}</li>)}
          </ul>
        </div>
      ))}
    </div>
  )
}
