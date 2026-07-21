import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import GridTile, { withCurrent } from '../components/search/GridTile'
import DirectorDecadeBars from '../components/director/DirectorDecadeBars'
import DirectorFilterPanel from '../components/director/DirectorFilterPanel'
import DirectorRankTrajectory from '../components/director/DirectorRankTrajectory'
import { totalVotes } from '../components/director/filmColors'
import { buildTierCutoffs } from '../components/director/rankTiers'

const POLL_YEARS = [1952, 1962, 1972, 1982, 1992, 2002, 2012, 2022]

/** Production year as a number; ranges like "1960-1964" resolve to their start. */
const startYear = film => parseInt(String(film.Year ?? ''), 10)

export default function DirectorDetailPage() {
  const { name } = useParams()
  const directorName = decodeURIComponent(name || '')
  const [films, setFilms] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/data/films.json')
      .then(r => r.json())
      .then(data => { if (alive) { setFilms(data); setLoading(false) } })
      .catch(() => { if (alive) { setFilms([]); setLoading(false) } })
    return () => { alive = false }
  }, [])

  // Resolve the name from the URL against the credits, then take every film they
  // directed (co-directed films appear on both directors' pages), oldest first.
  const { canonicalName, directorFilms } = useMemo(() => {
    if (!films) return { canonicalName: directorName, directorFilms: [] }
    const lower = directorName.toLowerCase()
    let resolved = null
    const matches = films.filter(f =>
      (f.directors || []).some(d => {
        if (d === directorName) { resolved = resolved || d; return true }
        if (d.toLowerCase() === lower) { resolved = resolved || d; return true }
        return false
      })
    )
    const sorted = [...matches].sort((a, b) => {
      const ya = startYear(a)
      const yb = startYear(b)
      if (Number.isNaN(ya) && Number.isNaN(yb)) return 0
      if (Number.isNaN(ya)) return 1
      if (Number.isNaN(yb)) return -1
      return ya - yb || (a.FilmTitle || '').localeCompare(b.FilmTitle || '')
    })
    return { canonicalName: resolved || directorName, directorFilms: sorted }
  }, [films, directorName])

  // Shading thresholds come from each poll's whole field, not this director's
  // slice, so a shade means the same thing on every director's page.
  const tierCutoffs = useMemo(() => (films ? buildTierCutoffs(films) : null), [films])

  const stats = useMemo(() => {
    if (!directorFilms.length) return null
    const years = directorFilms.map(startYear).filter(y => !Number.isNaN(y))
    const countries = new Set()
    directorFilms.forEach(f => (f.countries || []).forEach(c => c && countries.add(c)))
    return {
      filmCount: directorFilms.length,
      votes: directorFilms.reduce((sum, f) => sum + totalVotes(f), 0),
      yearFrom: years.length ? Math.min(...years) : null,
      yearTo: years.length ? Math.max(...years) : null,
      countries: [...countries],
    }
  }, [directorFilms])

  // How many of this director's films drew votes in each poll — drives the
  // filmography's poll selector.
  const pollCounts = useMemo(() => {
    const out = { all: directorFilms.length }
    POLL_YEARS.forEach(year => {
      out[year] = directorFilms.filter(f => {
        const p = f.pollHistory.find(x => x.year === year)
        return p && p.votes > 0
      }).length
    })
    return out
  }, [directorFilms])

  // Which poll the page is showing, and how the filmography grid is ordered.
  // Rank-first by default: the canon's own ordering is the more useful opening
  // read, and chronological is one click away.
  const [gridPoll, setGridPoll] = useState('all')
  const [gridSort, setGridSort] = useState('rank')

  const gridFilms = useMemo(() => {
    const key = gridPoll === 'all' ? 'all' : parseInt(gridPoll, 10)
    const list = directorFilms.filter(f => {
      const p = f.pollHistory.find(x => x.year === key)
      return p && p.votes > 0
    })
    // directorFilms is already oldest-first, so chronological needs no re-sort.
    if (gridSort === 'chrono') return list
    return [...list].sort((a, b) => {
      const pa = a.pollHistory.find(x => x.year === key) || {}
      const pb = b.pollHistory.find(x => x.year === key) || {}
      if (pa.rank != null && pb.rank != null) return pa.rank - pb.rank
      if (pa.rank != null) return -1
      if (pb.rank != null) return 1
      return (pb.votes || 0) - (pa.votes || 0)
    })
  }, [directorFilms, gridPoll, gridSort])

  // Where this director sits among everyone in the canon. Computed from the same
  // films.json rather than directors.json, which only carries 2022 ranks.
  const peers = useMemo(() => {
    if (!films || !directorFilms.length) return null
    const byDirector = new Map()
    films.forEach(film => {
      const v = totalVotes(film)
      ;(film.directors || []).forEach(d => {
        const entry = byDirector.get(d) || { films: 0, votes: 0 }
        entry.films += 1
        entry.votes += v
        byDirector.set(d, entry)
      })
    })
    const mine = byDirector.get(canonicalName)
    if (!mine) return null
    const all = [...byDirector.values()]
    // Rank = how many directors sit strictly ahead, +1 (ties share a rank).
    return {
      total: byDirector.size,
      filmsRank: all.filter(e => e.films > mine.films).length + 1,
      votesRank: all.filter(e => e.votes > mine.votes).length + 1,
    }
  }, [films, directorFilms, canonicalName])

  if (loading) {
    return (
      <Shell>
        <div className="text-center py-20">
          <div className="inline-block w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-black font-medium">Loading…</p>
        </div>
      </Shell>
    )
  }

  if (!directorFilms.length) {
    return (
      <Shell>
        <div className="py-20 text-center">
          <h1 className="text-3xl font-black uppercase mb-3">Director not found</h1>
          <p className="text-gray-600 mb-6">
            No films in the canon are credited to “{directorName}”.
          </p>
          <Link
            to="/explore?poll=all"
            className="inline-block px-6 py-3 bg-black text-white font-bold uppercase tracking-wide text-sm hover:bg-gray-800"
          >
            ← Back to Explore
          </Link>
        </div>
      </Shell>
    )
  }

  const activeYears =
    stats.yearFrom != null
      ? stats.yearFrom === stats.yearTo
        ? `${stats.yearFrom}`
        : `${stats.yearFrom}–${stats.yearTo}`
      : null

  return (
    <Shell>
      {/* Header — typographic, no imagery: the filmography grid carries the page */}
      <div className="pt-2 pb-8">
        <Link
          to="/explore?poll=all"
          className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-black"
        >
          ← Explore
        </Link>
        <h1 className="mt-3 text-5xl sm:text-6xl font-black text-black uppercase tracking-tight leading-none">
          {canonicalName}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-lg text-gray-600">
          <span className="font-bold text-black">
            {stats.filmCount} {stats.filmCount === 1 ? 'film' : 'films'} in the canon
          </span>
          <span className="text-gray-300">·</span>
          <span className="font-bold text-black tabular-nums">{stats.votes.toLocaleString()}</span>
          <span className="-ml-1.5">votes all-time</span>
          {activeYears && (
            <><span className="text-gray-300">·</span><span className="tabular-nums">{activeYears}</span></>
          )}
          {stats.countries.length > 0 && (
            <>
              <span className="text-gray-300">·</span>
              <span className="flex flex-wrap gap-x-2">
                {stats.countries.map(c => (
                  <Link
                    key={c}
                    to={`/visualizations/country/${encodeURIComponent(c)}`}
                    className="underline decoration-gray-300 hover:decoration-black hover:text-black"
                  >
                    {c}
                  </Link>
                ))}
              </span>
            </>
          )}
        </div>
        {peers && <PeerContext peers={peers} />}
      </div>

      {/* Control rail + content. The rail stays with you down the page, so the
          poll is still switchable while you're reading the decade chart. */}
      <div className="grid grid-cols-12 gap-8">
        <aside className="col-span-12 lg:col-span-3">
          <DirectorFilterPanel
            poll={gridPoll}
            onPollChange={setGridPoll}
            counts={pollCounts}
            showing={gridFilms.length}
          />
        </aside>

        <div className="col-span-12 lg:col-span-9">
          <section>
            <SectionHeading
              title="The filmography"
              action={
                <SortToggle
                  sort={gridSort}
                  onChange={setGridSort}
                  rankLabel={gridPoll === 'all' ? 'Most votes' : 'By rank'}
                />
              }
            />
            {gridFilms.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {gridFilms.map(f => (
                  <GridTile key={f.key} film={withCurrent(f, gridPoll)} activePoll={gridPoll} />
                ))}
              </div>
            ) : (
              <div className="bg-white border-2 border-black p-10 text-center">
                <p className="font-bold text-black">
                  Nothing from {canonicalName} drew a vote in the {gridPoll} poll.
                </p>
              </div>
            )}
          </section>

          <section className="mt-10">
            <SectionHeading
              title="Which decade the canon rewards"
              note="One chunk per film — hover for the film"
            />
            <DirectorDecadeBars films={directorFilms} poll={gridPoll} cutoffs={tierCutoffs} />
          </section>

          <section className="mt-10 mb-4">
            <SectionHeading
              title="How the films moved"
              note="Tick films to plot them — the scale follows your selection"
            />
            <DirectorRankTrajectory films={directorFilms} poll={gridPoll} />
          </section>
        </div>
      </div>
    </Shell>
  )
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</div>
      <Footer />
    </div>
  )
}

function SectionHeading({ title, note, action }) {
  return (
    <div className="mb-3 border-b-2 border-black pb-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2 className="text-xl font-black uppercase tracking-tight">{title}</h2>
      {note && <span className="text-xs text-gray-500">{note}</span>}
      {action}
    </div>
  )
}

/** Ordering for the filmography grid — scoped to it, so it sits on its heading. */
function SortToggle({ sort, onChange, rankLabel }) {
  return (
    <div className="flex border-2 border-black self-center">
      {[['rank', rankLabel], ['chrono', 'Chronological']].map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          aria-pressed={sort === value}
          className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors ${
            sort === value ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function PeerContext({ peers }) {
  return (
    <p className="mt-2 text-sm text-gray-500">
      Among the <span className="font-bold text-black">{peers.total.toLocaleString()}</span> directors
      in the canon, ranks <span className="font-bold text-black">#{peers.filmsRank.toLocaleString()}</span>{' '}
      by number of films and{' '}
      <span className="font-bold text-black">#{peers.votesRank.toLocaleString()}</span> by total votes.
    </p>
  )
}
