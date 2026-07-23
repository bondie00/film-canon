import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import TopCountriesBarChart from '../components/TopCountriesBarChart'
import WorldMapChoropleth from '../components/WorldMapChoropleth'
import ContinentBreakdown from '../components/ContinentBreakdown'
import ContinentShareChart from '../components/ContinentShareChart'

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

            {/* VISUALIZATION 3: CONTINENTAL BREAKDOWN */}
            <div className="bg-white border-4 border-black p-6 mb-8">
              <div className="mb-6 border-b-2 border-gray-300 pb-4">
                <h2 className="text-3xl font-black text-black mb-2 uppercase tracking-wide">
                  Continental & Country Breakdown
                </h2>
                <p className="text-black font-medium">
                  Click any continent to expand and see individual country statistics.
                </p>
              </div>

              {/* Expandable Continent Cards */}
              <ContinentBreakdown
                selectedPoll={selectedPoll}
                rankRange={rankRange}
                metric={metric}
              />

              {/* Continent Color Legend */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm border-t-2 border-gray-300 pt-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-500 border-2 border-black"></div>
                  <span className="text-black font-bold">Europe</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-500 border-2 border-black"></div>
                  <span className="text-black font-bold">Asia</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-purple-500 border-2 border-black"></div>
                  <span className="text-black font-bold">North America</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-orange-500 border-2 border-black"></div>
                  <span className="text-black font-bold">South America</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-red-500 border-2 border-black"></div>
                  <span className="text-black font-bold">Africa</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-pink-500 border-2 border-black"></div>
                  <span className="text-black font-bold">Oceania</span>
                </div>
              </div>
            </div>

            {/* VISUALIZATION 5: CONTINENTAL SHARE OVER TIME */}
            <div className="bg-white border-4 border-black p-6 mb-8">
              <div className="mb-6 border-b-2 border-gray-300 pb-4">
                <h2 className="text-3xl font-black text-black mb-2 uppercase tracking-wide">
                  Growing Diversity
                </h2>
                <p className="text-black font-medium">
                  More countries are being represented even as the Big 5 continue to dominate
                </p>
              </div>
              <ContinentShareChart
                countriesData={countriesData}
                selectedPoll={selectedPoll}
                rankRange={rankRange}
                metric={metric}
              />
            </div>

            {/* NAVIGATION: EXPLORE SPECIFIC COUNTRIES */}
            <div className="bg-white border-4 border-black p-8">
              <h2 className="text-3xl font-black text-black mb-4 text-center uppercase tracking-wide border-b-2 border-gray-300 pb-4">
                Explore Individual Countries
              </h2>
              <p className="text-black text-center mb-6 font-medium">
                Dive deep into any country's cinematic contribution with detailed analysis,
                rank progressions, and notable films
              </p>

              {/* Search Bar */}
              <div className="max-w-xl mx-auto mb-8">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search for a country (e.g., France, Japan, Brazil)..."
                    className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-black font-medium"
                  />
                  <button className="absolute right-2 top-2 px-4 py-1.5 bg-black text-white border-2 border-black text-sm hover:bg-gray-900 transition-colors font-bold uppercase tracking-wider">
                    Go
                  </button>
                </div>
              </div>

              {/* Popular Countries Quick Links */}
              <div className="text-center">
                <div className="text-sm font-bold text-black mb-3 uppercase tracking-wider">Popular Countries:</div>
                <div className="flex flex-wrap justify-center gap-3">
                  <Link to="/countries/United%20States" className="px-4 py-2 bg-white text-black border-2 border-black hover:bg-black hover:text-white font-bold text-sm transition-colors uppercase tracking-wide">
                    United States
                  </Link>
                  <Link to="/countries/France" className="px-4 py-2 bg-white text-black border-2 border-black hover:bg-black hover:text-white font-bold text-sm transition-colors uppercase tracking-wide">
                    France
                  </Link>
                  <Link to="/countries/Japan" className="px-4 py-2 bg-white text-black border-2 border-black hover:bg-black hover:text-white font-bold text-sm transition-colors uppercase tracking-wide">
                    Japan
                  </Link>
                  <Link to="/countries/Italy" className="px-4 py-2 bg-white text-black border-2 border-black hover:bg-black hover:text-white font-bold text-sm transition-colors uppercase tracking-wide">
                    Italy
                  </Link>
                  <Link to="/countries/United%20Kingdom" className="px-4 py-2 bg-white text-black border-2 border-black hover:bg-black hover:text-white font-bold text-sm transition-colors uppercase tracking-wide">
                    United Kingdom
                  </Link>
                  <Link to="/countries/Germany" className="px-4 py-2 bg-white text-black border-2 border-black hover:bg-black hover:text-white font-bold text-sm transition-colors uppercase tracking-wide">
                    Germany
                  </Link>
                  <Link to="/countries/India" className="px-4 py-2 bg-white text-black border-2 border-black hover:bg-black hover:text-white font-bold text-sm transition-colors uppercase tracking-wide">
                    India
                  </Link>
                  <Link to="/countries/South%20Korea" className="px-4 py-2 bg-white text-black border-2 border-black hover:bg-black hover:text-white font-bold text-sm transition-colors uppercase tracking-wide">
                    South Korea
                  </Link>
                  <Link to="/countries/Brazil" className="px-4 py-2 bg-white text-black border-2 border-black hover:bg-black hover:text-white font-bold text-sm transition-colors uppercase tracking-wide">
                    Brazil
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
