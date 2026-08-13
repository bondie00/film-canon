import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import PageShell, { SidebarLayout } from '../components/layout/PageShell'
import PageTitle from '../components/layout/PageTitle'
import InfoBanner from '../components/layout/InfoBanner'
import SectionHeading, { HeadingToggle } from '../components/layout/SectionHeading'
import FilterCard, { FilterSection } from '../components/filters/FilterCard'
import PollGrid, { POLL_YEARS } from '../components/filters/PollGrid'
import MetricToggle from '../components/filters/MetricToggle'
import FilmographyGrid, { COUNTRY_EXPANDED_ROWS } from '../components/films/FilmographyGrid'
import DirectorsTreemap from '../components/country/DirectorsTreemap'
import DecadeHeatmapRows from '../components/country/DecadeHeatmapRows'
import DecadeRankHeatmap from '../components/country/DecadeRankHeatmap'
import PollHistoryChart from '../components/country/PollHistoryChart'
import RankDepthFilter from '../components/RankDepthFilter'
import { buildRankIndex, resolveTarget, describeDepth, EMPTY_RANK_INDEX } from '../lib/rankDepth'
import { metricPair, pollLabel } from '../lib/metrics'

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

  // Filter state
  const [selectedPoll, setSelectedPoll] = useState('2022')
  // Film-count target for the rank-depth filter (null = all films), same units
  // and same control as the Countries page and /explore.
  const [topTarget, setTopTarget] = useState(null)
  // Which quantity every visualization is drawn in. Same control, same default and
  // same reach as the Countries page: it governs the whole page, not a section.
  const [metric, setMetric] = useState('votes')
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

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!countryFilms.length) return { films: 0, votes: 0 }

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
      votes: totalVotes
    }
  }, [countryFilms, selectedPoll])

  // Loading state
  if (loading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-black border-t-transparent mx-auto mb-4"></div>
            <p className="text-black font-medium">Loading country data...</p>
          </div>
        </div>
      </PageShell>
    )
  }

  // Error state
  if (error) {
    return (
      <PageShell>
        <div className="bg-white border-4 border-black p-8 text-center">
          <h1 className="text-3xl font-black text-black mb-4 uppercase">Error Loading Data</h1>
          <p className="text-black mb-6">{error}</p>
          <BackToCountries />
        </div>
      </PageShell>
    )
  }

  // Country not found
  if (!countryInfo) {
    return (
      <PageShell>
        <div className="bg-white border-4 border-black p-8 text-center">
          <h1 className="text-3xl font-black text-black mb-4 uppercase">Country Not Found</h1>
          <p className="text-black mb-6">
            "{decodedCountryName}" was not found in our database.
          </p>
          <BackToCountries />
        </div>
      </PageShell>
    )
  }

  const continentColor = continentColors[countryInfo.continent] || '#6b7280'
  const { primary, secondary } = metricPair(metric, metrics)
  const filterText = `${pollLabel(selectedPoll)} • ${describeDepth(topTarget, activeDepth.filmCount, activeDepth.minVotes)}`

  return (
    <PageShell>
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

            <FilterSection label="Metric">
              <MetricToggle value={metric} onChange={setMetric} order={['votes', 'films']} />
            </FilterSection>
          </FilterCard>
        }
      >
        <PageTitle crumb={{ to: '/countries', label: 'Countries' }}>
          {decodedCountryName}
        </PageTitle>

        <InfoBanner
          lead={primary}
          aside={secondary}
          items={[filterText]}
          chip={{ label: countryInfo.continent, color: continentColor }}
          accent={continentColor}
        />

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

        {/* Ignores the poll rail — these are about the arc across all eight polls,
            and narrowing to one would leave a single point. */}
        <section className="mb-10">
          <SectionHeading
            title="Canon presence"
            note="All eight polls, whatever the filter is set to"
          />
          <PollHistoryChart
            filmsData={filmsData}
            countryName={decodedCountryName}
            cutoffByPoll={cutoffByPoll}
            metric={metric}
            topTarget={topTarget}
            continentColor={continentColor}
          />
        </section>

        <section className="mb-10">
          <SectionHeading title="Decades by poll" note="All eight polls" />
          <DecadeHeatmapRows
            films={allCountryFilms}
            countryName={decodedCountryName}
            topTarget={topTarget}
            cutoffByPoll={cutoffByPoll}
            metric={metric}
            continentColor={continentColor}
          />
        </section>

        <section className="mb-10">
          <SectionHeading title="Decades by rank tier" />
          <DecadeRankHeatmap
            films={countryFilms}
            selectedPoll={selectedPoll}
            topTarget={topTarget}
            metric={metric}
            continentColor={continentColor}
          />
        </section>

        <section className="mb-10">
          <SectionHeading title="Directors" />
          <DirectorsTreemap
            films={countryFilms}
            selectedPoll={selectedPoll}
            metric={metric}
            continentColor={continentColor}
          />
        </section>

        <div className="text-center">
          <BackToCountries label="← Back to all countries" />
        </div>
      </SidebarLayout>
    </PageShell>
  )
}

function BackToCountries({ label = '← Back to Countries' }) {
  return (
    <Link
      to="/countries"
      className="inline-block px-6 py-3 bg-black text-white font-bold uppercase tracking-wide hover:bg-gray-800 transition-colors"
    >
      {label}
    </Link>
  )
}
