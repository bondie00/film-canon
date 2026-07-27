import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import TopCountriesBarChart from '../components/TopCountriesBarChart'
import WorldMapChoropleth from '../components/WorldMapChoropleth'
import DecadeCountryHeatmap from '../components/country/DecadeCountryHeatmap'
import RankDepthFilter from '../components/RankDepthFilter'
import useCountryAggregates from '../hooks/useCountryAggregates'
import { buildRankIndex, resolveTarget, describeDepth, EMPTY_RANK_INDEX } from '../lib/rankDepth'

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

  // Which quantity drives sizing/color/sorting: 'films' (breadth, era-neutral,
  // default) or 'votes' (canonical weight). See CLAUDE.md metrics section.
  const [metric, setMetric] = useState('films')
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
  const { cutoffRank, filmCount: depthFilmCount } = useMemo(
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

  // Helper function to generate filter description text
  const getFilterText = () => {
    const pollText = selectedPoll === 'all'
      ? 'All Polls Combined'
      : `${selectedPoll} Poll`

    return `${pollText} • ${describeDepth(topTarget, depthFilmCount)}`
  }


  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-12 gap-8">

          {/* LEFT SIDEBAR - STICKY FILTERS */}
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-white border-4 border-black p-6 lg:sticky lg:top-8">
              <h2 className="text-3xl font-bold text-black mb-6 uppercase tracking-wider">Filters</h2>

              {/* POLL SELECTION FILTER */}
              <div className="mb-6 pb-6 border-b-2 border-gray-300">
                <label className="block text-sm font-semibold text-black mb-3 uppercase tracking-wide">
                  Poll Selection
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {['all', 1952, 1962, 1972, 1982, 1992, 2002, 2012, 2022].map(opt => {
                    const value = String(opt)
                    const active = value === String(selectedPoll)
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setSelectedPoll(value)}
                        className={`py-2 text-sm font-black border-2 transition-colors ${
                          active
                            ? 'border-black bg-black text-white'
                            : 'border-black bg-white text-black hover:bg-black hover:text-white'
                        }`}
                      >
                        {opt === 'all' ? 'All' : opt}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* RANK DEPTH FILTER — shared with /explore and the country pages */}
              <div>
                <RankDepthFilter
                  index={rankIndex}
                  target={topTarget}
                  onChange={setTopTarget}
                />
              </div>

              {/* METRIC FILTER */}
              <div className="mt-6 pt-6 border-t-2 border-gray-300">
                <label className="block text-sm font-semibold text-black mb-3 uppercase tracking-wide">
                  Metric
                </label>
                <div className="grid grid-cols-2 gap-2 bg-white border-2 border-black p-1">
                  <button
                    onClick={() => setMetric('films')}
                    className={`py-3 px-3 text-xs font-bold uppercase tracking-wide transition-all ${
                      metric === 'films'
                        ? 'bg-black text-white border-2 border-black'
                        : 'bg-white text-black border-2 border-gray-300 hover:border-black'
                    }`}
                  >
                    Films
                  </button>
                  <button
                    onClick={() => setMetric('votes')}
                    className={`py-3 px-3 text-xs font-bold uppercase tracking-wide transition-all ${
                      metric === 'votes'
                        ? 'bg-black text-white border-2 border-black'
                        : 'bg-white text-black border-2 border-gray-300 hover:border-black'
                    }`}
                  >
                    Votes
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* MAIN CONTENT AREA - VISUALIZATIONS */}
          <div className="col-span-12 lg:col-span-9">

            {/* PAGE TITLE */}
            <h1 className="text-6xl font-black text-black mb-6 uppercase tracking-tight border-b-4 border-black pb-4">Countries</h1>

            {/* INFO BANNER */}
            <div className="bg-white border-2 border-black px-4 py-3 mb-8">
              <div className="text-sm text-black">
                <span className="font-bold uppercase tracking-wide">
                  {metrics.countries} countries • {metric === 'votes'
                    ? `${metrics.votes.toLocaleString()} votes`
                    : `${metrics.films.toLocaleString()} films`}
                </span>
                <span className="text-gray-500 font-medium ml-2">
                  ({metric === 'votes'
                    ? `${metrics.films.toLocaleString()} films`
                    : `${metrics.votes.toLocaleString()} votes`})
                </span>
                <span className="mx-2 text-black">|</span>
                <span className="font-medium">{getFilterText()}</span>
              </div>
            </div>

            {/* VISUALIZATION 1: WORLD MAP */}
            <div className="bg-white border-4 border-black p-6 mb-8">
              <div className="mb-6 border-b-2 border-gray-300 pb-4">
                <h2 className="text-3xl font-black text-black mb-2 uppercase tracking-wide">
                  Global Distribution
                </h2>
                <p className="text-black font-medium">
                  Darker colors indicate more {metric === 'votes' ? 'votes' : 'films'}. Click any country to see detailed analysis.
                </p>
              </div>

              {/* World Map Choropleth */}
              <WorldMapChoropleth
                countriesData={aggregates}
                filmsData={filmsData}
                selectedPoll={selectedPoll}
                cutoffRank={cutoffRank}
                topTarget={topTarget}
                metric={metric}
              />
            </div>

            {/* VISUALIZATION 2: BAR CHART - TOP COUNTRIES */}
            <TopCountriesBarChart
              countriesData={aggregates}
              selectedPoll={selectedPoll}
              cutoffRank={cutoffRank}
              topTarget={topTarget}
              filmsData={filmsData}
              metric={metric}
            />

            {/* VISUALIZATION 3: DECADE HEATMAP - COUNTRIES x DECADES */}
            <DecadeCountryHeatmap
              countriesData={aggregates}
              filmsData={filmsData}
              selectedPoll={selectedPoll}
              cutoffRank={cutoffRank}
              metric={metric}
            />

          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
