import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import PageShell, { SidebarLayout } from '../components/layout/PageShell'
import DetailHeader, { Figure } from '../components/layout/DetailHeader'
import FilterCard, { FilterSection } from '../components/filters/FilterCard'
import PollGrid from '../components/filters/PollGrid'
import MetricToggle from '../components/filters/MetricToggle'
import RankDepthFilter from '../components/RankDepthFilter'
import DirectorsRankedBarChart from '../components/directors/DirectorsRankedBarChart'
import useDirectorAggregates from '../hooks/useDirectorAggregates'
import { buildTierCutoffs } from '../lib/rankTiers'
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
  const country = searchParams.get('country') || null

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
  // most of the chart as a wall of ties. lib/standings.js reached the same
  // conclusion for the standing chart on the detail pages.
  const [metric, setMetric] = useState('votes')
  const [filmsData, setFilmsData] = useState(null)

  useEffect(() => {
    fetch('/data/films.json')
      .then(r => r.json())
      .then(setFilmsData)
      .catch(error => console.error('Error loading data:', error))
  }, [])

  // BOTH of these read the WHOLE corpus, never the country subset below. Rank
  // depth means "the top 100 films of this poll", not "the top 100 French films",
  // and tier shading is percentiles of each poll's entire field — a film has to
  // be shaded by the field it competed in. Filtering filmsData up here instead
  // would make both silently country-relative and every number would drift.
  const rankIndex = useMemo(
    () => (filmsData ? buildRankIndex(filmsData, selectedPoll) : EMPTY_RANK_INDEX),
    [filmsData, selectedPoll]
  )
  const { cutoffRank, filmCount: depthFilmCount, minVotes: depthMinVotes } = useMemo(
    () => resolveTarget(rankIndex, topTarget),
    [rankIndex, topTarget]
  )

  // Rank-tier shading for the bar tiles. Cutoffs are percentiles of
  // each poll's WHOLE field, so they're built from every film once and are
  // independent of the rank-depth filter — a tile must shade a film by the
  // field it competed in, not by whatever slice is on screen.
  const tierCutoffs = useMemo(
    () => (filmsData ? buildTierCutoffs(filmsData) : null),
    [filmsData]
  )
  const cuts = tierCutoffs?.get(String(selectedPoll)) ?? null

  // Optional country scope, arriving from a country page's "all directors" link.
  //
  // The films are narrowed HERE, one level above the aggregation, which is why
  // this needed no changes to the hook, the ranking, the bar chart or the
  // selection controls — they simply receive fewer films and re-rank within them.
  //
  // Note what this is and isn't: it selects films CREDITED TO a country, and
  // totals only those. It does not give a director a nationality — see the note
  // in useDirectorAggregates about why that would be a fiction. Hitchcock scoped
  // to the United States is his 17 US films, not his 28.
  const scopedFilms = useMemo(() => {
    if (!filmsData) return null
    if (!country) return filmsData
    return filmsData.filter(f => (f.countries || []).includes(country))
  }, [filmsData, country])

  const aggregates = useDirectorAggregates(scopedFilms, selectedPoll, cutoffRank)

  // A country in the URL that no film is credited to — a typo, or a country that
  // only ever appears as a co-production partner (Luxembourg, Estonia).
  const unknownCountry = Boolean(country) && scopedFilms?.length === 0

  const filterText = `${pollLabel(selectedPoll)} • ${describeDepth(topTarget, depthFilmCount, depthMinVotes)}`

  const totals = aggregates?.totals ?? { directors: 0, films: 0, votes: 0 }
  const { primary, secondary } = metricPair(metric, totals)

  // Dropping the country keeps poll and depth, so clearing the scope widens the
  // field without also resetting where you were reading.
  const clearCountryHref = useMemo(() => {
    const next = new URLSearchParams(searchParams)
    next.delete('country')
    const qs = next.toString()
    return qs ? `/directors?${qs}` : '/directors'
  }, [searchParams])

  return (
    <PageShell>
      {/* Above the split, not inside it — the title names the whole page,
          including the rail. Same header component as the detail pages, without
          a crumb (this IS the hub) or a chip. */}
      <DetailHeader
        title="Directors"
        facts={[
          // The country scope leads the line and is removable, because it's the
          // only fact here that isn't set by a control in the rail — arriving by
          // link, it needs a visible way back out.
          country && (
            <span key="country" className="flex items-center gap-1.5">
              <Link
                to={`/countries/${encodeURIComponent(country)}`}
                className="font-bold text-black underline decoration-gray-300 hover:decoration-black"
              >
                {country}
              </Link>
              <Link
                to={clearCountryHref}
                aria-label={`Show directors from every country, not just ${country}`}
                title="Clear country filter"
                className="text-gray-400 hover:text-black text-base leading-none border border-gray-300 hover:border-black px-1"
              >
                ×
              </Link>
            </span>
          ),
          <Figure key="directors" value={totals.directors.toLocaleString()}>
            {totals.directors === 1 ? 'director' : 'directors'}
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

            <FilterSection>
              <RankDepthFilter index={rankIndex} target={topTarget} onChange={setTopTarget} />
            </FilterSection>

            <FilterSection label="Metric">
              <MetricToggle value={metric} onChange={setMetric} order={['votes', 'films']} />
            </FilterSection>
          </FilterCard>
        }
      >
        {!aggregates && !unknownCountry && (
          <div className="bg-white border-4 border-black p-6 text-center text-black font-medium py-16">
            Loading director data…
          </div>
        )}

        {unknownCountry && (
          <div className="bg-white border-4 border-black p-8 text-center">
            <p className="text-black font-medium mb-4">
              No film in the canon is credited to “{country}”.
            </p>
            <Link
              to={clearCountryHref}
              className="inline-block px-6 py-3 bg-black text-white font-bold uppercase tracking-wide text-sm hover:bg-gray-800"
            >
              Show all directors
            </Link>
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
