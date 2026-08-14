import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageShell, { SidebarLayout } from '../components/layout/PageShell'
import DetailHeader, { Figure } from '../components/layout/DetailHeader'
import VizCard from '../components/layout/VizCard'
import FilterCard, { FilterSection } from '../components/filters/FilterCard'
import PollGrid from '../components/filters/PollGrid'
import MetricToggle from '../components/filters/MetricToggle'
import TopCountriesBarChart from '../components/TopCountriesBarChart'
import WorldMapChoropleth from '../components/WorldMapChoropleth'
import DecadeCountryHeatmap from '../components/country/DecadeCountryHeatmap'
import RankDepthFilter from '../components/RankDepthFilter'
import useCountryAggregates from '../hooks/useCountryAggregates'
import { buildRankIndex, resolveTarget, describeDepth, EMPTY_RANK_INDEX } from '../lib/rankDepth'
import { metricPair, pollLabel } from '../lib/metrics'

const VALID_POLLS = ['all', '1952', '1962', '1972', '1982', '1992', '2002', '2012', '2022']

export default function CountryOriginMain() {
  // Poll and rank depth both live in the URL, using the same param names as
  // /explore — that's what makes the handoff between the two pages exact.
  const [searchParams, setSearchParams] = useSearchParams()
  const rawPoll = searchParams.get('poll')
  const selectedPoll = VALID_POLLS.includes(rawPoll) ? rawPoll : '2022'
  const rawTop = searchParams.get('top')
  const topTarget = rawTop && /^\d+$/.test(rawTop) ? parseInt(rawTop, 10) : null

  const setParam = useCallback((key, value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (value == null) next.delete(key)
      else next.set(key, String(value))
      return next
    }, { replace: true })
  }, [setSearchParams])

  const setSelectedPoll = useCallback((poll) => setParam('poll', poll), [setParam])
  const setTopTarget = useCallback((target) => setParam('top', target), [setParam])

  // Which quantity drives sizing/color/sorting: 'votes' (canonical weight,
  // default) or 'films' (breadth, era-neutral). See CLAUDE.md metrics section.
  //
  // Votes leads because the DEPTH default leads: the page opens at All films,
  // and across the whole field breadth is the less interesting half of the
  // story — every country's bar is its long tail. Tighten the depth to a Top 100
  // and it inverts, because inside a small consensus set the counts are small
  // and legible and votes start re-concentrating on a handful of masterpieces.
  // The metric follows the depth, so the default follows the default depth —
  // which is also what Directors does, so the two hubs now open the same way.
  const [metric, setMetric] = useState('votes')
  const [countriesData, setCountriesData] = useState(null)
  const [filmsData, setFilmsData] = useState(null)

  // Load countries and films data
  useEffect(() => {
    // Load both data sources in parallel
    Promise.all([
      fetch('/data/countries.json').then(res => res.json()),
      fetch('/data/films.json').then(res => res.json())
    ])
      .then(([countries, films]) => {
        setCountriesData(countries)
        setFilmsData(films)
      })
      .catch(error => console.error('Error loading data:', error))
  }, [])

  // Rank histogram for the active poll — drives the depth control's stops and
  // resolves the film-count target into the rank cutoff everything else filters on.
  const rankIndex = useMemo(
    () => (filmsData ? buildRankIndex(filmsData, selectedPoll) : EMPTY_RANK_INDEX),
    [filmsData, selectedPoll]
  )
  const { cutoffRank, filmCount: depthFilmCount, minVotes: depthMinVotes } = useMemo(
    () => resolveTarget(rankIndex, topTarget),
    [rankIndex, topTarget]
  )

  // Per-country totals at this cutoff, in the shape the visualizations already read.
  const aggregates = useCountryAggregates(filmsData, countriesData, selectedPoll, cutoffRank)

  // Banner metrics. Poll-wide totals come from the aggregation (distinct films and
  // their votes, so co-productions aren't double counted); the country count is the
  // number of countries left with at least one film at this depth.
  const metrics = useMemo(() => {
    if (!aggregates) return { countries: 0, votes: 0, films: 0 }
    const countries = Object.entries(aggregates).filter(
      ([name, info]) => !name.startsWith('_') && (info.byPoll[selectedPoll]?.distinctFilms || 0) > 0
    ).length
    return { countries, votes: aggregates._totals.votes, films: aggregates._totals.films }
  }, [aggregates, selectedPoll])

  const { primary, secondary } = metricPair(metric, metrics)
  const filterText = `${pollLabel(selectedPoll)} • ${describeDepth(topTarget, depthFilmCount, depthMinVotes)}`

  return (
    <PageShell>
      {/* Above the split, not inside it — the title names the whole page,
          including the rail. Same header component as the detail pages, without
          a crumb (this IS the hub) or a chip. */}
      <DetailHeader
        title="Countries"
        facts={[
          <Figure key="countries" value={metrics.countries.toLocaleString()}>
            {metrics.countries === 1 ? 'country' : 'countries'}
          </Figure>,
          <Figure key="primary" value={primary} />,
          <span key="secondary" className="tabular-nums">{secondary}</span>,
          // What the rail is set to, de-emphasised — it names the figures above
          // rather than being one of them.
          <span key="filter" className="text-gray-400">{filterText}</span>,
        ]}
      />

      <SidebarLayout
        sidebar={
          <FilterCard>
            <FilterSection label="Poll Selection" first>
              <PollGrid value={selectedPoll} onChange={setSelectedPoll} />
            </FilterSection>

            {/* Shared with /explore and the country pages */}
            <FilterSection>
              <RankDepthFilter index={rankIndex} target={topTarget} onChange={setTopTarget} />
            </FilterSection>

            <FilterSection label="Metric">
              <MetricToggle value={metric} onChange={setMetric} order={['votes', 'films']} />
            </FilterSection>
          </FilterCard>
        }
      >
        <VizCard title="Global Distribution">
          <WorldMapChoropleth
            countriesData={aggregates}
            filmsData={filmsData}
            selectedPoll={selectedPoll}
            cutoffRank={cutoffRank}
            topTarget={topTarget}
            metric={metric}
          />
        </VizCard>

        <TopCountriesBarChart
          countriesData={aggregates}
          selectedPoll={selectedPoll}
          cutoffRank={cutoffRank}
          topTarget={topTarget}
          filmsData={filmsData}
          metric={metric}
        />

        <DecadeCountryHeatmap
          countriesData={aggregates}
          filmsData={filmsData}
          selectedPoll={selectedPoll}
          cutoffRank={cutoffRank}
          topTarget={topTarget}
          metric={metric}
        />
      </SidebarLayout>
    </PageShell>
  )
}
