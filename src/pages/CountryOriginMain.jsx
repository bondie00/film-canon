import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import TopCountriesBarChart from '../components/TopCountriesBarChart'
import WorldMapChoropleth from '../components/WorldMapChoropleth'
import DecadeCountryHeatmap from '../components/country/DecadeCountryHeatmap'

export default function CountryOriginMain() {
  // Honor a ?poll= deep link (e.g. from /explore's stat cells); default to latest poll.
  const [searchParams] = useSearchParams()
  const [selectedPoll, setSelectedPoll] = useState(() => {
    const p = searchParams.get('poll')
    const valid = ['all', '1952', '1962', '1972', '1982', '1992', '2002', '2012', '2022']
    return p && valid.includes(p) ? p : '2022'
  })
  const [rankRange, setRankRange] = useState('all')
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

  // Calculate dynamic metrics based on current filters
  const metrics = useMemo(() => {
    if (!countriesData) return { countries: 0, votes: 0, films: 0 }

    // Get true poll totals from metadata (without co-production inflation)
    const pollKey = selectedPoll === 'all' ? 'all' : selectedPoll
    const rangeKey = rankRange === 'all' ? 'all' : 'consensus'

    const pollMetadata = countriesData._pollMetadata?.[pollKey]?.[rangeKey]
    const trueTotalVotes = pollMetadata?.votes || 0
    const trueDistinctFilms = pollMetadata?.films || 0

    // Count countries with votes (still need to iterate for this)
    let countriesWithVotes = 0
    Object.entries(countriesData).forEach(([countryName, countryInfo]) => {
      // Skip metadata key
      if (countryName.startsWith('_')) return

      let votes = 0
      if (selectedPoll === 'all') {
        if (rankRange === 'all') {
          votes = Object.values(countryInfo.byPoll).reduce((sum, pollData) =>
            sum + (pollData.total || 0), 0)
        } else {
          votes = Object.values(countryInfo.byPoll).reduce((sum, pollData) =>
            sum + (pollData.consensus || 0), 0)
        }
      } else {
        const pollData = countryInfo.byPoll[selectedPoll]
        if (pollData) {
          votes = rankRange === 'all' ? pollData.total : pollData.consensus
        }
      }

      if (votes > 0) {
        countriesWithVotes++
      }
    })

    return {
      countries: countriesWithVotes,
      votes: trueTotalVotes,
      films: trueDistinctFilms
    }
  }, [countriesData, selectedPoll, rankRange])

  // Helper function to generate filter description text
  const getFilterText = () => {
    const pollText = selectedPoll === 'all'
      ? 'All Polls Combined'
      : `${selectedPoll} Poll`

    const rankText = rankRange === 'all'
      ? 'All Films'
      : 'Consensus'

    return `${pollText} • ${rankText}`
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

              {/* RANK RANGE FILTER */}
              <div>
                <label className="block text-sm font-semibold text-black mb-3 uppercase tracking-wide">
                  Film Rank Range
                </label>
                <div className="grid grid-cols-2 gap-2 bg-white border-2 border-black p-1">
                  <button
                    onClick={() => setRankRange('all')}
                    className={`py-3 px-3 text-xs font-bold uppercase tracking-wide transition-all ${
                      rankRange === 'all'
                        ? 'bg-black text-white border-2 border-black'
                        : 'bg-white text-black border-2 border-gray-300 hover:border-black'
                    }`}
                  >
                    All Films
                  </button>
                  <button
                    onClick={() => setRankRange('consensus')}
                    className={`py-3 px-3 text-xs font-bold uppercase tracking-wide transition-all ${
                      rankRange === 'consensus'
                        ? 'bg-black text-white border-2 border-black'
                        : 'bg-white text-black border-2 border-gray-300 hover:border-black'
                    }`}
                  >
                    Consensus
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {rankRange === 'consensus' ? 'Films voted for by 2+ critics' : ''}
                </p>
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
                countriesData={countriesData}
                filmsData={filmsData}
                selectedPoll={selectedPoll}
                rankRange={rankRange}
                metric={metric}
              />
            </div>

            {/* VISUALIZATION 2: BAR CHART - TOP COUNTRIES */}
            <TopCountriesBarChart
              selectedPoll={selectedPoll}
              rankRange={rankRange}
              filmsData={filmsData}
              metric={metric}
            />

            {/* VISUALIZATION 3: DECADE HEATMAP - COUNTRIES x DECADES */}
            <DecadeCountryHeatmap
              countriesData={countriesData}
              filmsData={filmsData}
              selectedPoll={selectedPoll}
              rankRange={rankRange}
              metric={metric}
            />

          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
