import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import SectionHeading, { HeadingToggle } from '../components/layout/SectionHeading'
import FilmographyGrid from '../components/films/FilmographyGrid'
import DirectorDecadeBars from '../components/director/DirectorDecadeBars'
import DirectorFilterPanel from '../components/director/DirectorFilterPanel'
import DirectorPollStrip from '../components/director/DirectorPollStrip'
import DirectorStandingChart from '../components/director/DirectorStandingChart'
import { totalVotes } from '../components/director/filmColors'
import { buildTierCutoffs } from '../components/director/rankTiers'
import { buildDirectorStandings } from '../components/director/directorStandings'

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

  // Just the selection; FilmographyGrid owns the ordering for both detail pages.
  const gridFilms = useMemo(() => {
    const key = gridPoll === 'all' ? 'all' : parseInt(gridPoll, 10)
    return directorFilms.filter(f => {
      const p = f.pollHistory.find(x => x.year === key)
      return p && p.votes > 0
    })
  }, [directorFilms, gridPoll])

  // Where this director sits among everyone in the canon, poll by poll. Computed
  // from the same films.json rather than directors.json, which only carries 2022
  // ranks.
  const standings = useMemo(() => (films ? buildDirectorStandings(films) : null), [films])

  if (loading) {
    return (
      <PageShell>
        <div className="text-center py-20">
          <div className="inline-block w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-black font-medium">Loading…</p>
        </div>
      </PageShell>
    )
  }

  if (!directorFilms.length) {
    return (
      <PageShell>
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
      </PageShell>
    )
  }

  const activeYears =
    stats.yearFrom != null
      ? stats.yearFrom === stats.yearTo
        ? `${stats.yearFrom}`
        : `${stats.yearFrom}–${stats.yearTo}`
      : null

  return (
    <PageShell>
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
                    to={`/countries/${encodeURIComponent(c)}`}
                    className="underline decoration-gray-300 hover:decoration-black hover:text-black"
                  >
                    {c}
                  </Link>
                ))}
              </span>
            </>
          )}
        </div>
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
                <HeadingToggle
                  value={gridSort}
                  onChange={setGridSort}
                  options={[
                    ['rank', gridPoll === 'all' ? 'Most votes' : 'By rank'],
                    ['chrono', 'Chronological'],
                  ]}
                />
              }
            />
            <FilmographyGrid
              films={gridFilms}
              poll={gridPoll}
              sort={gridSort}
              explore={{ director: canonicalName }}
              emptyMessage={`Nothing from ${canonicalName} drew a vote in the ${gridPoll} poll.`}
            />
          </section>

          {/* The one block on this side of the page that ignores the rail — it
              ranks the DIRECTOR across all eight polls, so a single poll isn't an
              input to it. Strip above, chart below, as on the film page: the strip
              is the per-poll lookup, the chart is the trend and the depth context
              the strip's cells have no room for. */}
          {standings && (
            <section className="mt-10">
              <SectionHeading
                title="Among all directors"
                note="All eight polls, whatever the filter is set to"
              />
              <DirectorPollStrip standings={standings} name={canonicalName} />
              <DirectorStandingChart standings={standings} name={canonicalName} />
            </section>
          )}

          <section className="mt-10 mb-4">
            <SectionHeading
              title="Which decade the canon rewards"
              note="One chunk per film — hover for the film"
            />
            <DirectorDecadeBars films={directorFilms} poll={gridPoll} cutoffs={tierCutoffs} />
          </section>
        </div>
      </div>
    </PageShell>
  )
}

