import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageShell, { SidebarLayout } from '../components/layout/PageShell'
import PageTitle from '../components/layout/PageTitle'
import InfoBanner from '../components/layout/InfoBanner'
import FilterCard, { FilterSection } from '../components/filters/FilterCard'
import PollGrid from '../components/filters/PollGrid'
import MetricToggle from '../components/filters/MetricToggle'
import RankDepthFilter from '../components/RankDepthFilter'
import DirectorsRankedBarChart from '../components/directors/DirectorsRankedBarChart'
import useDirectorAggregates from '../hooks/useDirectorAggregates'
import { buildTierCutoffs } from '../components/director/rankTiers'
import { buildRankIndex, resolveTarget, describeDepth, EMPTY_RANK_INDEX } from '../lib/rankDepth'
import { metricPair, pollLabel } from '../lib/metrics'

const VALID_POLLS = ['all', '1952', '1962', '1972', '1982', '1992', '2002', '2012', '2022']


export default function DirectorsMain() {
  // Poll and rank depth live in the URL under the same names and with the same
  // meanings as /explore and /countries, so links between the pages carry the
  // filters intact.
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

  const setSelectedPoll = useCallback(poll => setParam('poll', poll), [setParam])
  const setTopTarget = useCallback(target => setParam('top', target), [setParam])

  // Votes is the default, as on the Countries page — both hubs open at All films,
  // and votes is the metric that reads at full depth.
  //
  // Here it's the stronger default still, because films barely ranks directors at
  // all: two thirds of them place exactly one film in any given poll, and at tight
  // depths it's worse — every one of the eleven directors inside 2022's top ten
  // has exactly one film there. Across the whole 2022 poll there are 21 distinct
  // film counts against 106 distinct vote totals. Ranking by films would print
  // most of the chart as a wall of ties. directorStandings.js reached the same
  // conclusion for the standing chart on the director pages.
  const [metric, setMetric] = useState('votes')
  const [filmsData, setFilmsData] = useState(null)

  useEffect(() => {
    fetch('/data/films.json')
      .then(r => r.json())
      .then(setFilmsData)
      .catch(error => console.error('Error loading data:', error))
  }, [])

  const rankIndex = useMemo(
    () => (filmsData ? buildRankIndex(filmsData, selectedPoll) : EMPTY_RANK_INDEX),
    [filmsData, selectedPoll]
  )
  const { cutoffRank, filmCount: depthFilmCount, minVotes: depthMinVotes } = useMemo(
    () => resolveTarget(rankIndex, topTarget),
    [rankIndex, topTarget]
  )

  const aggregates = useDirectorAggregates(filmsData, selectedPoll, cutoffRank)

  // Rank-tier shading for the bar tiles. Cutoffs are percentiles of
  // each poll's WHOLE field, so they're built from every film once and are
  // independent of the rank-depth filter — a tile must shade a film by the
  // field it competed in, not by whatever slice is on screen.
  const tierCutoffs = useMemo(
    () => (filmsData ? buildTierCutoffs(filmsData) : null),
    [filmsData]
  )
  const cuts = tierCutoffs?.get(String(selectedPoll)) ?? null

  const filterText = `${pollLabel(selectedPoll)} • ${describeDepth(topTarget, depthFilmCount, depthMinVotes)}`

  const totals = aggregates?.totals ?? { directors: 0, films: 0, votes: 0 }
  const { primary, secondary } = metricPair(metric, totals)

  return (
    <PageShell>
      <SidebarLayout
        sidebar={
          <FilterCard>
            <FilterSection label="Poll Selection" first>
              <PollGrid value={selectedPoll} onChange={setSelectedPoll} />
            </FilterSection>

            <FilterSection>
              <RankDepthFilter index={rankIndex} target={topTarget} onChange={setTopTarget} />
            </FilterSection>

            <FilterSection label="Metric">
              <MetricToggle value={metric} onChange={setMetric} order={['votes', 'films']} />
            </FilterSection>
          </FilterCard>
        }
      >
        <PageTitle>Directors</PageTitle>

        <InfoBanner
          lead={`${totals.directors.toLocaleString()} directors • ${primary}`}
          aside={secondary}
          items={[filterText]}
        />

        {!aggregates && (
          <div className="bg-white border-4 border-black p-6 text-center text-black font-medium py-16">
            Loading director data…
          </div>
        )}

        {/* HERO — the ranking itself, on the Countries page's bar chart
            skeleton, with each bar built out of that director's own films.
            This replaced a poster podium of the top ten (retired 2026-08-07;
            recoverable at `git show 3268108:src/components/directors/
            DirectorPodium.jsx`). The podium showed the same ten names this
            chart's default view does, one screen higher, and said only how
            many votes each had — the chart says that and the shape of the
            filmography behind it. */}
        {aggregates && (
          <DirectorsRankedBarChart
            rows={aggregates.rows}
            metric={metric}
            selectedPoll={selectedPoll}
            topTarget={topTarget}
            cuts={cuts}
          />
        )}
      </SidebarLayout>
    </PageShell>
  )
}
