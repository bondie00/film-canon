import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import { Crumb } from '../components/layout/DetailHeader'
import NotFound, { LoadingState } from '../components/layout/NotFound'
import StandingStrip from '../components/standing/StandingStrip'
import StandingChart from '../components/standing/StandingChart'
import { backdropUrl, posterUrl } from '../utils/filmImages'
import { POLL_YEARS, buildPollFloors } from '../utils/polls'
import { filmStandingRows } from '../lib/standings'
import { EXPLORE, countryUrl, directorUrl, voterUrl } from '../lib/routes'

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
  const standingRows = useMemo(() => filmStandingRows(film, pollFloors), [film, pollFloors])

  if (loading) {
    return (
      <PageShell width="narrow">
        <LoadingState />
      </PageShell>
    )
  }

  if (!film) {
    return (
      <PageShell width="narrow">
        <NotFound title="Film not found" body="No film matches this address." />
      </PageShell>
    )
  }

  const backdrop = backdropUrl(film, { mubiWidth: 1280, tmdbSize: 'w1280' })
  const poster = posterUrl(film, 'w342')
  const runtime = formatRuntime(film.runtime)

  // Co-production countries not already in the primary list.
  const extraCoProd = (film.coProductionCountries || []).filter(
    c => !(film.countries || []).includes(c)
  )

  // The hero runs edge to edge behind the content column, so it goes in
  // PageShell's bleed slot rather than inside the column.
  const hero = (
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
        {/* This page had NO way back at all — the only crumb was on its
            not-found state, so arriving from global search or a shared link
            left the browser's back button as the sole exit. Explore is the
            parent overview for a film, being the page that lists them. */}
        <div className="mb-5">
          <Crumb to={EXPLORE} label="Explore" tone="dark" />
        </div>
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
                          <Link to={directorUrl(d)} className="underline decoration-white/30 hover:decoration-white">
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
  )

  return (
    <PageShell width="narrow" bleed={hero}>
      <div className="space-y-10">

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
                  to={countryUrl(c)}
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
                      to={countryUrl(c)}
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
          <StandingStrip rows={standingRows} />
          <StandingChart rows={standingRows} noun="film" nounPlural="films" />
        </section>

        {/* Voters */}
        <section>
          <SectionHeading title="Who voted for it" />
          <VotersSection film={film} filmVoters={filmVoters} voterSlugs={voterSlugs} />
        </section>
      </div>
    </PageShell>
  )
}

function SectionHeading({ title }) {
  return (
    <div className="mb-3 border-b-2 border-black pb-1">
      <h2 className="text-xl font-black uppercase tracking-tight">{title}</h2>
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
                    to={voterUrl(p.slug)}
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
