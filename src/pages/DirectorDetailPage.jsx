import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import PageShell, { SidebarLayout } from '../components/layout/PageShell'
import SectionHeading, { HeadingToggle } from '../components/layout/SectionHeading'
import DetailHeader, { Figure } from '../components/layout/DetailHeader'
import NotFound, { LoadingState } from '../components/layout/NotFound'
import FilmographyGrid from '../components/films/FilmographyGrid'
import DirectorDecadeBars from '../components/director/DirectorDecadeBars'
import DirectorFilterPanel from '../components/director/DirectorFilterPanel'
import StandingStrip from '../components/standing/StandingStrip'
import StandingChart from '../components/standing/StandingChart'
import { buildTierCutoffs, votesIn } from '../lib/rankTiers'
import { buildDirectorStandings, standingByPoll } from '../lib/standings'
import { pollLabel } from '../lib/metrics'
import { directorsHubUrl, countryUrl } from '../lib/routes'
import useFilterParams from '../hooks/useFilterParams'

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

  // Which poll the page is showing. In the URL, under the same name and with the
  // same meaning as everywhere else, so arriving from the Directors hub keeps
  // the poll you had picked there.
  //
  // The default is 'all', not the hub's 2022: a filmography is a career, and
  // opening 43 Godard films filtered to one poll would hide most of it. There is
  // no ?top= here — the page has no rank-depth control, so lib/routes.js drops
  // one rather than filtering the grid by something invisible.
  const { poll: gridPoll, setPoll: setGridPoll } = useFilterParams({ defaultPoll: 'all' })

  // How the filmography grid is ordered. Rank-first by default: the canon's own
  // ordering is the more useful opening read, chronological is one click away.
  // Local state, not the URL — it reorders one section, not the page.
  const [gridSort, setGridSort] = useState('rank')

  // Just the selection; FilmographyGrid owns the ordering for both detail pages.
  const gridFilms = useMemo(() => {
    const key = gridPoll === 'all' ? 'all' : parseInt(gridPoll, 10)
    return directorFilms.filter(f => {
      const p = f.pollHistory.find(x => x.year === key)
      return p && p.votes > 0
    })
  }, [directorFilms, gridPoll])

  // Header figures. Computed from the POLL-FILTERED set, not the whole
  // filmography: the header is where this page reports what the rail selects, so
  // every number in it has to move when the rail moves. Switching to 1972 should
  // narrow the year span and drop the countries that only appear in later work.
  const stats = useMemo(() => {
    if (!gridFilms.length) return null
    const years = gridFilms.map(startYear).filter(y => !Number.isNaN(y))
    const countries = new Set()
    gridFilms.forEach(f => (f.countries || []).forEach(c => c && countries.add(c)))
    return {
      filmCount: gridFilms.length,
      votes: gridFilms.reduce((sum, f) => sum + votesIn(f, gridPoll), 0),
      yearFrom: years.length ? Math.min(...years) : null,
      yearTo: years.length ? Math.max(...years) : null,
      countries: [...countries],
    }
  }, [gridFilms, gridPoll])

  // Where this director sits among everyone in the canon, poll by poll. Computed
  // from the same films.json rather than directors.json, which only carries 2022
  // ranks.
  const standings = useMemo(() => (films ? buildDirectorStandings(films) : null), [films])
  const standingRows = useMemo(
    () => standingByPoll(standings, canonicalName),
    [standings, canonicalName]
  )

  if (loading) {
    return (
      <PageShell>
        <LoadingState />
      </PageShell>
    )
  }

  if (!directorFilms.length) {
    return (
      <PageShell>
        <NotFound
          title="Director not found"
          body={`No films in the canon are credited to “${directorName}”.`}
          action={{ to: directorsHubUrl(), label: 'Back to Directors' }}
        />
      </PageShell>
    )
  }

  // Up to the Directors hub, not to Explore. This crumb pointed at Explore only
  // because no hub existed to point at when the page shipped — and Explore lists
  // FILMS, so going "up" from a director left you among 4,851 films rather than
  // among the other directors. It carries the poll back with it.
  const crumb = { to: directorsHubUrl({ poll: gridPoll }), label: 'Directors' }

  const activeYears =
    stats.yearFrom != null
      ? stats.yearFrom === stats.yearTo
        ? `${stats.yearFrom}`
        : `${stats.yearFrom}–${stats.yearTo}`
      : null

  return (
    <PageShell>
      <DetailHeader
        crumb={crumb}
        title={canonicalName}
        facts={[
          <Figure key="films" value={stats.filmCount}>
            {stats.filmCount === 1 ? 'film' : 'films'}
          </Figure>,
          <Figure key="votes" value={stats.votes.toLocaleString()}>
            {stats.votes === 1 ? 'vote' : 'votes'}
          </Figure>,
          activeYears && <span key="years" className="tabular-nums">{activeYears}</span>,
          stats.countries.length > 0 && (
            <span key="countries" className="flex flex-wrap gap-x-2">
              {stats.countries.map(c => (
                <Link
                  key={c}
                  to={countryUrl(c, { poll: gridPoll })}
                  className="underline decoration-gray-300 hover:decoration-black hover:text-black"
                >
                  {c}
                </Link>
              ))}
            </span>
          ),
          // What the rail is set to, de-emphasised — it names the figures above
          // rather than being one of them.
          <span key="filter" className="text-gray-400">{pollLabel(gridPoll)}</span>,
        ]}
      />

      {/* Control rail + content, via the shared SidebarLayout — this was a
          hand-rolled copy of the same grid-cols-12 3/9 split, which is how the
          two detail pages drifted apart. The rail stays with you down the page,
          so the poll is still switchable while you're reading the decade chart. */}
      <SidebarLayout
        sidebar={
          <DirectorFilterPanel
            poll={gridPoll}
            onPollChange={setGridPoll}
            counts={pollCounts}
          />
        }
      >
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
              <StandingStrip rows={standingRows} />
              <StandingChart rows={standingRows} noun="director" nounPlural="directors" />
            </section>
          )}

          <section className="mt-10 mb-4">
            <SectionHeading
              title="Which decade the canon rewards"
              note="One chunk per film · darker ranks higher"
            />
            <DirectorDecadeBars films={directorFilms} poll={gridPoll} cutoffs={tierCutoffs} />
          </section>
      </SidebarLayout>
    </PageShell>
  )
}

