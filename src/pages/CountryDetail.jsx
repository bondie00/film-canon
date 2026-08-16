import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import PageShell, { SidebarLayout } from '../components/layout/PageShell'
import DetailHeader, { Figure } from '../components/layout/DetailHeader'
import NotFound, { LoadingState } from '../components/layout/NotFound'
import SectionHeading, { HeadingToggle } from '../components/layout/SectionHeading'
import FilterCard, { FilterSection } from '../components/filters/FilterCard'
import PollGrid, { POLL_YEARS } from '../components/filters/PollGrid'
import FilmographyGrid, { COUNTRY_EXPANDED_ROWS } from '../components/films/FilmographyGrid'
import DirectorsRanked from '../components/country/DirectorsRanked'
import DecadeHeatmapRows from '../components/country/DecadeHeatmapRows'
import StandingStrip from '../components/standing/StandingStrip'
import StandingChart from '../components/standing/StandingChart'
import RankDepthFilter from '../components/RankDepthFilter'
import { buildRankIndex, resolveTarget, describeDepth, EMPTY_RANK_INDEX } from '../lib/rankDepth'
import { buildCountryStandings, standingByPoll } from '../lib/standings'
import { pollLabel } from '../lib/metrics'
import { countriesHubUrl } from '../lib/routes'
import useFilterParams from '../hooks/useFilterParams'

// Continent color mapping
const continentColors = {
  'Europe': '#3b82f6',
  'Asia': '#10b981',
  'North America': '#8b5cf6',
  'South America': '#f59e0b',
  'Africa': '#ef4444',
  'Oceania': '#ec4899',
}

export default function CountryDetail() {
  const { countryName } = useParams()
  const decodedCountryName = decodeURIComponent(countryName)

  // Poll and rank depth live in the URL, exactly as they do on the Countries
  // hub — same param names, same meanings, same parsing (useFilterParams). That
  // is what lets a link between the two carry the selection: arriving here from
  // a hub filtered to 1972 at Top 100 used to reset you to 2022 at All films,
  // discarding two deliberate choices for no reason you could see.
  const {
    poll: selectedPoll,
    setPoll: setSelectedPoll,
    top: topTarget,
    setTop: setTopTarget,
    filters,
  } = useFilterParams()
  // No metric toggle here, unlike the Countries hub. On a hub the switch is
  // load-bearing — it reorders the field (Italy and the UK swap, Belgium falls
  // #7 to #23), which is the whole point of a hub. A detail page has no field to
  // reorder, and most of what's on this one can't answer to a metric at all:
  // standing is a rank, and the decade bars shade by rank tier. So each section
  // uses the quantity that suits it, as the director page already does.
  // Ordering for the films grid. Scoped to that section, so it sits on its heading.
  const [gridSort, setGridSort] = useState('rank')
  const [countriesData, setCountriesData] = useState(null)
  const [filmsData, setFilmsData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Load data
  useEffect(() => {
    setLoading(true)
    setError(null)

    Promise.all([
      fetch('/data/countries.json').then(res => res.json()),
      fetch('/data/films.json').then(res => res.json())
    ])
      .then(([countries, films]) => {
        setCountriesData(countries)
        setFilmsData(films)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading data:', err)
        setError('Failed to load data')
        setLoading(false)
      })
  }, [])

  // Get country info
  const countryInfo = useMemo(() => {
    if (!countriesData || !decodedCountryName) return null
    return countriesData[decodedCountryName]
  }, [countriesData, decodedCountryName])

  // The depth target resolves to a different rank in every poll, and this page
  // reads several polls at once (the poll selector's counts, the 'all' aggregate
  // behind the hero visualizations), so resolve the cutoff for all of them.
  const rankIndexes = useMemo(() => {
    const out = { all: EMPTY_RANK_INDEX }
    if (!filmsData) return out
    out.all = buildRankIndex(filmsData, 'all')
    POLL_YEARS.forEach(y => { out[y] = buildRankIndex(filmsData, String(y)) })
    return out
  }, [filmsData])

  const cutoffByPoll = useMemo(() => {
    const out = {}
    Object.entries(rankIndexes).forEach(([key, index]) => {
      out[key] = resolveTarget(index, topTarget).cutoffRank
    })
    return out
  }, [rankIndexes, topTarget])

  // Ranks every country in every poll. Built from the whole dataset, not this
  // country's films — a standing needs the field it was drawn from.
  const standings = useMemo(
    () => (filmsData ? buildCountryStandings(filmsData) : null),
    [filmsData]
  )
  const standingRows = useMemo(
    () => standingByPoll(standings, decodedCountryName),
    [standings, decodedCountryName]
  )

  const activeIndex = rankIndexes[selectedPoll] || EMPTY_RANK_INDEX
  const activeDepth = useMemo(() => resolveTarget(activeIndex, topTarget), [activeIndex, topTarget])

  const withinDepth = (entry, pollKey) => {
    if (!entry || !(entry.votes > 0)) return false
    const cutoff = cutoffByPoll[pollKey]
    if (cutoff == null) return true
    return entry.rank != null && entry.rank <= cutoff
  }

  // Every film from this country that placed in any poll. Deliberately NOT depth
  // filtered here: Decades by Poll draws a row per poll, so each row applies its
  // own poll's cutoff (via cutoffByPoll) rather than one shared cutoff. Filtering
  // by the all-polls rank up front would drop films that were elite in a single
  // poll but middling overall — Last Year at Marienbad was #25 in 1972 yet #122
  // across all polls, so at Top 100 it vanished from the 1972 row entirely.
  const allCountryFilms = useMemo(() => {
    if (!filmsData || !decodedCountryName) return []
    return filmsData.filter(film => {
      if (!film.countries.includes(decodedCountryName)) return false
      return film.pollHistory.some(p => p.year !== 'all' && p.votes > 0)
    })
  }, [filmsData, decodedCountryName])

  // How many of this country's films the poll would show under the current
  // filters — drives the poll selector's grey-out. Mirrors the countryFilms
  // logic per poll, so tightening the depth disables any poll where the country
  // has no films left inside that poll's resolved cutoff.
  const pollCounts = useMemo(() => {
    const counts = { all: 0 }
    POLL_YEARS.forEach(y => { counts[y] = 0 })
    if (!filmsData || !decodedCountryName) return counts
    filmsData.forEach(film => {
      if (!film.countries.includes(decodedCountryName)) return
      if (withinDepth(film.pollHistory.find(p => p.year === 'all'), 'all')) counts.all += 1
      POLL_YEARS.forEach(y => {
        if (withinDepth(film.pollHistory.find(p => p.year === y), y)) counts[y] += 1
      })
    })
    return counts
  }, [filmsData, decodedCountryName, cutoffByPoll])

  // Filter films for this country
  const countryFilms = useMemo(() => {
    if (!filmsData || !decodedCountryName) return []
    const pollKey = selectedPoll === 'all' ? 'all' : parseInt(selectedPoll, 10)

    return filmsData.filter(film => {
      if (!film.countries.includes(decodedCountryName)) return false
      return withinDepth(film.pollHistory.find(p => p.year === pollKey), pollKey)
    })
  }, [filmsData, decodedCountryName, selectedPoll, cutoffByPoll])

  // The header's figures. Every one of them is drawn from the FILTERED set, so
  // the header reports what the rail selects — tightening the depth narrows the
  // year span and drops the directors who only place in the long tail.
  const metrics = useMemo(() => {
    if (!countryFilms.length) {
      return { films: 0, votes: 0, directors: 0, span: null }
    }

    const years = []
    const directors = new Set()
    countryFilms.forEach(film => {
      const y = parseInt(String(film.Year ?? '').split(/[-–]/)[0], 10)
      if (!Number.isNaN(y)) years.push(y)
      ;(film.directors || []).forEach(d => {
        if (d && d !== '(unknown)') directors.add(d)
      })
    })

    let totalVotes = 0
    countryFilms.forEach(film => {
      if (selectedPoll === 'all') {
        // Use the pre-computed 'all' entry votes to avoid double-counting
        const allPollData = film.pollHistory.find(p => p.year === 'all')
        totalVotes += allPollData?.votes || 0
      } else {
        const pollData = film.pollHistory.find(p => p.year.toString() === selectedPoll)
        if (pollData) {
          totalVotes += pollData.votes || 0
        }
      }
    })

    return {
      films: countryFilms.length,
      votes: totalVotes,
      directors: directors.size,
      span: years.length ? `${Math.min(...years)}–${Math.max(...years)}` : null,
    }
  }, [countryFilms, selectedPoll])

  // The three states before the page can render, all going through the shared
  // components so they look the same here as on the film, director and voter
  // pages. Each offers the country hub, which is both this page's crumb target
  // and the useful next move when the country you asked for isn't there.
  const backToHub = { to: countriesHubUrl(filters), label: 'Back to Countries' }

  if (loading) {
    return (
      <PageShell>
        <LoadingState label="Loading country data…" />
      </PageShell>
    )
  }

  if (error) {
    return (
      <PageShell>
        <NotFound title="Error loading data" body={error} action={backToHub} />
      </PageShell>
    )
  }

  if (!countryInfo) {
    return (
      <PageShell>
        <NotFound
          title="Country not found"
          body={`“${decodedCountryName}” is not one of the 117 countries in the poll data.`}
          action={backToHub}
        />
      </PageShell>
    )
  }

  const continentColor = continentColors[countryInfo.continent] || '#6b7280'
  // What the rail is currently showing. This used to sit in the header banner
  // beside the country's totals, which conflated two different things — the size
  // of the canon and the size of the current slice of it. It reads better next to
  // the controls that produce it, which is where the director page puts it.
  const filterText = `${pollLabel(selectedPoll)} • ${describeDepth(topTarget, activeDepth.filmCount, activeDepth.minVotes)}`

  return (
    <PageShell>
      {/* Above the split, not inside it — the header names the whole page, so it
          runs full width rather than being inset into the content column. Same
          shape as the director page. */}
      <DetailHeader
        crumb={{ to: countriesHubUrl(filters), label: 'Countries' }}
        chip={{ label: countryInfo.continent, color: continentColor }}
        title={decodedCountryName}
        facts={[
          <Figure key="films" value={metrics.films.toLocaleString()}>
            {metrics.films === 1 ? 'film' : 'films'}
          </Figure>,
          <Figure key="votes" value={metrics.votes.toLocaleString()}>
            {metrics.votes === 1 ? 'vote' : 'votes'}
          </Figure>,
          metrics.directors > 0 && (
            <Figure key="dirs" value={metrics.directors.toLocaleString()}>
              {metrics.directors === 1 ? 'director' : 'directors'}
            </Figure>
          ),
          metrics.span && <span key="span" className="tabular-nums">{metrics.span}</span>,
          // What the rail is set to, de-emphasised — it names the figures above
          // rather than being one of them.
          <span key="filter" className="text-gray-400">{filterText}</span>,
        ]}
      />

      <SidebarLayout
        sidebar={
          <FilterCard>
            {/* Poll leads the rail, as on the director page. It used to sit inline
                at the head of a "In the YYYY poll" zone, which made its scope
                obvious but left the page with controls in two places; now every
                page-wide control is in one column and the one section that
                ignores the poll says so on its own heading. */}
            <FilterSection label="Poll Selection" first>
              <PollGrid
                value={selectedPoll}
                onChange={setSelectedPoll}
                counts={pollCounts}
                emptyLabel={poll => `${decodedCountryName} has no films in the ${poll} poll`}
              />
            </FilterSection>

            <FilterSection>
              <RankDepthFilter index={activeIndex} target={topTarget} onChange={setTopTarget} />
            </FilterSection>

          </FilterCard>
        }
      >
        {/* The films come first. They used to sit at the very bottom, behind four
            abstract charts, in a bespoke card grid with no poster, no cross-poll
            rank strip and no link to the film pages. */}
        <section className="mb-10">
          <SectionHeading
            title="The films"
            action={
              <HeadingToggle
                value={gridSort}
                onChange={setGridSort}
                options={[
                  ['rank', selectedPoll === 'all' ? 'Most votes' : 'By rank'],
                  ['chrono', 'Chronological'],
                ]}
              />
            }
          />
          <FilmographyGrid
            films={countryFilms}
            poll={selectedPoll}
            sort={gridSort}
            expandedRows={COUNTRY_EXPANDED_ROWS}
            explore={{ country: decodedCountryName, top: topTarget }}
            emptyMessage={`No films from ${decodedCountryName} match the current filters.`}
          />
        </section>

        {/* Ignores the poll rail — this ranks the COUNTRY across all eight polls,
            so a single poll isn't an input to it. Strip above, chart below, as on
            the director and film pages: the strip is the per-poll lookup, the
            chart is the trend and the field-depth context the cells have no room
            for. Replaced a share-of-poll chart whose percentages were so small
            that half the countries needed two decimals to avoid reading as 0.0%,
            and which could never say "France is the #2 country". */}
        {standings && (
          <section className="mb-10">
            <SectionHeading
              title="Among all countries"
              note="All eight polls, whatever the filter is set to"
            />
            <StandingStrip rows={standingRows} />
            <StandingChart
              rows={standingRows}
              noun="country"
              nounPlural="countries"
              color={continentColor}
            />
          </section>
        )}

        <section className="mb-10">
          {/* Ignores the poll rail, like the standing section above — the poll is
              an AXIS here rather than a filter. It earns one because a country
              has the density to spend a dimension on it (France fills 69% of the
              poll x decade grid, Japan 52%); the director page's decade chart
              spends the poll as a control instead, because 73% of directors span
              a single decade and would draw an eight-row grid to show one number.
              Same phrasing as the standing sections, so "whatever the filter is
              set to" means the same thing wherever it appears. */}
          <SectionHeading
            title="Decades by poll"
            note="All eight polls, whatever the filter is set to"
          />
          <DecadeHeatmapRows
            films={allCountryFilms}
            countryName={decodedCountryName}
            topTarget={topTarget}
            cutoffByPoll={cutoffByPoll}
            continentColor={continentColor}
          />
        </section>

        <section className="mb-10">
          <SectionHeading title="Directors" />
          {/* Votes, matching the standing chart. Ranking a country's directors by
              film count is mostly ties down the tail — the great majority place
              one film — so votes are what separate them. */}
          <DirectorsRanked
            films={countryFilms}
            selectedPoll={selectedPoll}
            continentColor={continentColor}
            country={decodedCountryName}
            topTarget={topTarget}
          />
        </section>

      </SidebarLayout>
    </PageShell>
  )
}
