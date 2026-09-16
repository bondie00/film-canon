import { useState, useEffect, useMemo } from 'react'
import PageShell, { SidebarLayout } from '../components/layout/PageShell'
import DetailHeader, { Figure } from '../components/layout/DetailHeader'
import FilterCard, { FilterSection } from '../components/filters/FilterCard'
import PollGrid from '../components/filters/PollGrid'
import MetricToggle from '../components/filters/MetricToggle'
import RankDepthFilter from '../components/RankDepthFilter'
import GenresRankedBarChart from '../components/genres/GenresRankedBarChart'
import GenreLeaders from '../components/genres/GenreLeaders'
import GenreDecadeHeatmap from '../components/genres/GenreDecadeHeatmap'
import useGenreAggregates from '../hooks/useGenreAggregates'
import { buildRankIndex, resolveTarget, describeDepth, EMPTY_RANK_INDEX } from '../lib/rankDepth'
import { metricPair, pollLabel } from '../lib/metrics'
import useFilterParams from '../hooks/useFilterParams'

/**
 * The Genres hub — the third entity hub beside Countries and Directors, on the
 * same skeleton: poll and rank depth in the rail (shared URL params), a Metric
 * toggle governing every chart, a ranked bar as the hero.
 *
 * Three sections, and why these three:
 *   Genres Ranked      size, split into "its one big film" vs "the rest"
 *   Top Film by Genre  that split as a list you can read film by film
 *   Genres by Decade   when each genre's canon was made
 *
 * No treemap, no share-of-whole anywhere: a film carries ~2 tags, so genre
 * totals overlap and never sum to the poll. See useGenreAggregates.
 */
export default function GenresMain() {
  const {
    poll: selectedPoll,
    setPoll: setSelectedPoll,
    top: topTarget,
    setTop: setTopTarget,
  } = useFilterParams()

  // Votes leads for the same reason it does on Countries: the page opens at All
  // films, where every genre's film count is mostly its long tail.
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

  const aggregates = useGenreAggregates(filmsData, selectedPoll, cutoffRank)

  // Header totals count each film ONCE — not the sum over genres, which would
  // double-count every multi-tag film.
  const totals = aggregates?.totals ?? { genres: 0, films: 0, votes: 0 }
  const { primary, secondary } = metricPair(metric, totals)
  const filterText = `${pollLabel(selectedPoll)} • ${describeDepth(topTarget, depthFilmCount, depthMinVotes)}`

  return (
    <PageShell>
      <DetailHeader
        title="Genres"
        facts={[
          <Figure key="genres" value={totals.genres.toLocaleString()}>
            {totals.genres === 1 ? 'genre' : 'genres'}
          </Figure>,
          <Figure key="primary" value={primary} />,
          <span key="secondary" className="tabular-nums">{secondary}</span>,
          <span key="filter" className="text-gray-400">{filterText}</span>,
        ]}
      />

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
        {!aggregates && (
          <div className="bg-white border-4 border-black p-6 text-center text-black font-medium py-16">
            Loading genre data…
          </div>
        )}

        {aggregates && (
          <>
            <GenresRankedBarChart
              aggregates={aggregates}
              metric={metric}
              selectedPoll={selectedPoll}
              topTarget={topTarget}
            />
            <GenreLeaders
              aggregates={aggregates}
              metric={metric}
              selectedPoll={selectedPoll}
            />
            <GenreDecadeHeatmap
              aggregates={aggregates}
              metric={metric}
              selectedPoll={selectedPoll}
              topTarget={topTarget}
            />
          </>
        )}
      </SidebarLayout>
    </PageShell>
  )
}
