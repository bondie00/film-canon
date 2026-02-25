import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import FilmCardsGrid from '../components/country/FilmCardsGrid'
import FilmRankScatter from '../components/country/FilmRankScatter'
import DirectorsTreemap from '../components/country/DirectorsTreemap'
import DecadeHeatmapRows from '../components/country/DecadeHeatmapRows'
import DecadeRankHeatmap from '../components/country/DecadeRankHeatmap'
import PollHistoryChart from '../components/country/PollHistoryChart'
import VoteStepChart from '../components/country/VoteStepChart'

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
  const [rankRange, setRankRange] = useState('all')
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

  // Filter films for this country
  const countryFilms = useMemo(() => {
    if (!filmsData || !decodedCountryName) return []

    return filmsData.filter(film => {
      // Film must have this country
      if (!film.countries.includes(decodedCountryName)) return false

      // Apply poll filter
      if (selectedPoll === 'all') {
        const allPollData = film.pollHistory.find(p => p.year === 'all')
        if (!allPollData || allPollData.votes === 0) return false

        // Apply rank filter for combined polls
        if (rankRange === 'top100') {
          return allPollData.rank && allPollData.rank <= 100
        }
        return true
      } else {
        const pollData = film.pollHistory.find(p => p.year.toString() === selectedPoll)
        if (!pollData || pollData.votes === 0) return false

        // Apply rank filter
        if (rankRange === 'top100') {
          return pollData.rank && pollData.rank <= 100
        }
        return true
      }
    })
  }, [filmsData, decodedCountryName, selectedPoll, rankRange])

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

  // Helper function for filter text
  const getFilterText = () => {
    const pollText = selectedPoll === 'all'
      ? 'All Polls Combined'
      : `${selectedPoll} Poll`

    const rankText = rankRange === 'all'
      ? 'All Films'
      : 'Top 100'

    return `${pollText} • ${rankText}`
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-black border-t-transparent mx-auto mb-4"></div>
              <p className="text-black font-medium">Loading country data...</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white border-4 border-black p-8 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-3xl font-black text-black mb-4 uppercase">Error Loading Data</h1>
            <p className="text-black mb-6">{error}</p>
            <Link
              to="/visualizations/country"
              className="inline-block px-6 py-3 bg-black text-white font-bold uppercase tracking-wide hover:bg-gray-800 transition-colors"
            >
              ← Back to Countries
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // Country not found
  if (!countryInfo) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white border-4 border-black p-8 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h1 className="text-3xl font-black text-black mb-4 uppercase">Country Not Found</h1>
            <p className="text-black mb-6">
              "{decodedCountryName}" was not found in our database.
            </p>
            <Link
              to="/visualizations/country"
              className="inline-block px-6 py-3 bg-black text-white font-bold uppercase tracking-wide hover:bg-gray-800 transition-colors"
            >
              ← Back to Countries
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  const continentColor = continentColors[countryInfo.continent] || '#6b7280'

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-12 gap-8">

          {/* LEFT SIDEBAR - STICKY FILTERS */}
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-white border-4 border-black p-6 lg:sticky lg:top-8">
              <h2 className="text-3xl font-bold text-black mb-6 uppercase tracking-wider">Filters</h2>

              {/* RANK RANGE FILTER - Now first since it's truly global */}
              <div className="mb-6 pb-6 border-b-2 border-gray-300">
                <label className="block text-sm font-semibold text-black mb-3 uppercase tracking-wide">
                  Film Rank Range
                </label>
                <div className="grid grid-cols-2 gap-2 bg-white border-2 border-black p-1">
                  <button
                    onClick={() => setRankRange('all')}
                    className={`py-2 px-3 text-sm font-bold uppercase tracking-wide transition-all ${
                      rankRange === 'all'
                        ? 'bg-black text-white border-2 border-black'
                        : 'bg-white text-black border-2 border-gray-300 hover:border-black'
                    }`}
                  >
                    All Films
                  </button>
                  <button
                    onClick={() => setRankRange('top100')}
                    className={`py-2 px-3 text-sm font-bold uppercase tracking-wide transition-all ${
                      rankRange === 'top100'
                        ? 'bg-black text-white border-2 border-black'
                        : 'bg-white text-black border-2 border-gray-300 hover:border-black'
                    }`}
                  >
                    Top 100
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Applies to all visualizations</p>
              </div>

              {/* FOCUS POLL FILTER */}
              <div>
                <label className="block text-sm font-semibold text-black mb-3 uppercase tracking-wide">
                  Focus Poll
                </label>
                <select
                  value={selectedPoll}
                  onChange={(e) => setSelectedPoll(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="all">All Polls Combined</option>
                  <option value="2022">2022 (Latest)</option>
                  <option value="2012">2012</option>
                  <option value="2002">2002</option>
                  <option value="1992">1992</option>
                  <option value="1982">1982</option>
                  <option value="1972">1972</option>
                  <option value="1962">1962</option>
                  <option value="1952">1952</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">Highlights hero chart, filters exploration below</p>
              </div>
            </div>
          </div>

          {/* MAIN CONTENT AREA */}
          <div className="col-span-12 lg:col-span-9">

            {/* BREADCRUMB */}
            <div className="text-sm text-black mb-2 uppercase tracking-wide">
              <Link to="/visualizations" className="hover:underline font-bold">Visualizations</Link>
              <span> / </span>
              <Link to="/visualizations/country" className="hover:underline font-bold">Films by Country</Link>
              <span> / </span>
              <span className="font-bold">{decodedCountryName}</span>
            </div>

            {/* PAGE TITLE */}
            <h1 className="text-6xl font-black text-black mb-6 uppercase tracking-tight border-b-4 border-black pb-4">
              {decodedCountryName}
            </h1>

            {/* INFO BANNER */}
            <div
              className="bg-white border-2 border-black px-4 py-3 mb-8"
              style={{ borderLeftWidth: '4px', borderLeftColor: continentColor }}
            >
              <div className="text-sm text-black">
                <span
                  className="inline-block px-2 py-1 text-white text-xs font-bold uppercase tracking-wide mr-3"
                  style={{ backgroundColor: continentColor }}
                >
                  {countryInfo.continent}
                </span>
                <span className="font-bold uppercase tracking-wide">
                  {metrics.films.toLocaleString()} films • {metrics.votes.toLocaleString()} votes
                </span>
                <span className="mx-2 text-black">|</span>
                <span className="font-medium">{getFilterText()}</span>
              </div>
            </div>

            {/* HERO SECTION: Poll History Chart - Always visible, shows all polls */}
            <div className="bg-white border-4 border-black p-6 mb-8">
              <div className="mb-6 border-b-2 border-gray-300 pb-4">
                <h2 className="text-3xl font-black text-black mb-2 uppercase tracking-wide">
                  Canon Presence Over Time
                </h2>
                <p className="text-black font-medium">
                  How has {decodedCountryName}'s representation in the Sight & Sound poll evolved across all eight polls?
                </p>
              </div>
              <PollHistoryChart
                films={countryFilms}
                filmsData={filmsData}
                countryName={decodedCountryName}
                selectedPoll={selectedPoll}
                rankRange={rankRange}
                continentColor={continentColor}
              />
            </div>

            {/* EXPLORE SECTION DIVIDER */}
            <div className="mb-8 border-t-4 border-black pt-6">
              <h2 className="text-2xl font-black text-black uppercase tracking-wide mb-2">
                Explore {selectedPoll === 'all' ? 'All Polls' : `${selectedPoll} Poll`}
              </h2>
              <p className="text-gray-600 text-sm">
                {selectedPoll === 'all'
                  ? 'Detailed breakdowns across all poll years combined'
                  : `Deep dive into ${decodedCountryName}'s films from the ${selectedPoll} poll`
                }
              </p>
            </div>

            {/* Check if we have enough data */}
            {countryFilms.length === 0 ? (
              <div className="bg-white border-4 border-black p-8 text-center">
                <div className="text-6xl mb-4">📭</div>
                <h2 className="text-2xl font-black text-black mb-4 uppercase">No Films Found</h2>
                <p className="text-black">
                  No films from {decodedCountryName} match the current filter settings.
                  Try selecting "All Polls Combined" or "All Films" to see more results.
                </p>
              </div>
            ) : (
              <>
                {/* VISUALIZATION 1: ROW-NORMALIZED HEATMAP / BAR CHART */}
                <div className="bg-white border-4 border-black p-6 mb-8">
                  <div className="mb-6 border-b-2 border-gray-300 pb-4">
                    <h2 className="text-3xl font-black text-black mb-2 uppercase tracking-wide">
                      {selectedPoll === 'all'
                        ? 'Decade Distribution Heatmap'
                        : `Decade Distribution (${selectedPoll})`
                      }
                    </h2>
                    <p className="text-black font-medium">
                      {selectedPoll === 'all'
                        ? `Each poll's row is colored on its own scale, showing which decades that poll valued most for ${decodedCountryName}.`
                        : `How many films from ${decodedCountryName} came from each decade in the ${selectedPoll} poll?`
                      }
                    </p>
                  </div>
                  <DecadeHeatmapRows
                    films={countryFilms}
                    selectedPoll={selectedPoll}
                    continentColor={continentColor}
                  />
                </div>

                {/* VISUALIZATION 2: DECADE × RANK TIER HEATMAP */}
                <div className="bg-white border-4 border-black p-6 mb-8">
                  <div className="mb-6 border-b-2 border-gray-300 pb-4">
                    <h2 className="text-3xl font-black text-black mb-2 uppercase tracking-wide">
                      Decades by Rank Tier
                    </h2>
                    <p className="text-black font-medium">
                      Where do {decodedCountryName}'s films rank? See which decades produced elite films vs. the long tail.
                    </p>
                  </div>
                  <DecadeRankHeatmap
                    films={countryFilms}
                    selectedPoll={selectedPoll}
                    rankRange={rankRange}
                    continentColor={continentColor}
                  />
                </div>

                {/* VISUALIZATION 3: SCATTER PLOT - ALL FILMS BY YEAR AND RANK */}
                <div className="bg-white border-4 border-black p-6 mb-8">
                  <div className="mb-6 border-b-2 border-gray-300 pb-4">
                    <h2 className="text-3xl font-black text-black mb-2 uppercase tracking-wide">
                      Films by Year and Rank
                    </h2>
                    <p className="text-black font-medium">
                      Every film from {decodedCountryName} plotted by release year and rank. Films with only 1 vote shown in the density band below.
                    </p>
                  </div>
                  <FilmRankScatter
                    films={countryFilms}
                    selectedPoll={selectedPoll}
                    continentColor={continentColor}
                  />
                </div>

                {/* VISUALIZATION 2: VOTE STEP CHART - TOP FILMS BY VOTES */}
                <div className="bg-white border-4 border-black p-6 mb-8">
                  <div className="mb-6 border-b-2 border-gray-300 pb-4">
                    <h2 className="text-3xl font-black text-black mb-2 uppercase tracking-wide">
                      Top Films by Votes
                    </h2>
                    <p className="text-black font-medium">
                      How do the top films from {decodedCountryName} compare in votes? See the gaps between frontrunners.
                    </p>
                  </div>
                  <VoteStepChart
                    films={countryFilms}
                    selectedPoll={selectedPoll}
                    continentColor={continentColor}
                  />
                </div>

                {/* VISUALIZATION 3: DIRECTORS TREEMAP */}
                <div className="bg-white border-4 border-black p-6 mb-8">
                  <div className="mb-6 border-b-2 border-gray-300 pb-4">
                    <h2 className="text-3xl font-black text-black mb-2 uppercase tracking-wide">
                      Directors by Film Count
                    </h2>
                    <p className="text-black font-medium">
                      Which directors from {decodedCountryName} are most represented in the canon?
                    </p>
                  </div>
                  <DirectorsTreemap
                    films={countryFilms}
                    continentColor={continentColor}
                  />
                </div>

                {/* ALL FILMS GRID */}
                <div className="bg-white border-4 border-black p-6 mb-8">
                  <div className="mb-6 border-b-2 border-gray-300 pb-4">
                    <h2 className="text-3xl font-black text-black mb-2 uppercase tracking-wide">
                      All Films from {decodedCountryName}
                    </h2>
                    <p className="text-black font-medium">
                      Browse all {metrics.films.toLocaleString()} films matching the current filters.
                    </p>
                  </div>
                  <FilmCardsGrid
                    films={countryFilms}
                    selectedPoll={selectedPoll}
                    continentColor={continentColor}
                  />
                </div>
              </>
            )}

            {/* BACK NAVIGATION */}
            <div className="text-center">
              <Link
                to="/visualizations/country"
                className="inline-block px-6 py-3 bg-black text-white font-bold uppercase tracking-wide hover:bg-gray-800 transition-colors"
              >
                ← Back to All Countries
              </Link>
            </div>

          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
