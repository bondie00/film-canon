import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import FilmCardsGrid from '../components/country/FilmCardsGrid'
import DirectorsTreemap from '../components/country/DirectorsTreemap'
import DecadeHeatmapRows from '../components/country/DecadeHeatmapRows'
import DecadeRankHeatmap from '../components/country/DecadeRankHeatmap'
import PollHistoryChart from '../components/country/PollHistoryChart'

const POLL_YEARS = [1952, 1962, 1972, 1982, 1992, 2002, 2012, 2022]

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

  // All films for this country (rank-filtered but not poll-filtered — used by static hero visualizations)
  const allCountryFilms = useMemo(() => {
    if (!filmsData || !decodedCountryName) return []
    return filmsData.filter(film => {
      if (!film.countries.includes(decodedCountryName)) return false
      const allPollData = film.pollHistory.find(p => p.year === 'all')
      if (!allPollData || allPollData.votes === 0) return false
      if (rankRange === 'consensus') {
        return allPollData.rank && allPollData.rank <= 100
      }
      return true
    })
  }, [filmsData, decodedCountryName, rankRange])

  // How many of this country's films the poll would show under the current
  // filters — drives the poll selector's grey-out. Mirrors the countryFilms
  // logic per poll, so switching to Consensus disables any poll where the
  // country has no films inside that poll's consensus cutoff.
  const pollCounts = useMemo(() => {
    const counts = { all: 0 }
    POLL_YEARS.forEach(y => { counts[y] = 0 })
    if (!filmsData || !decodedCountryName) return counts
    filmsData.forEach(film => {
      if (!film.countries.includes(decodedCountryName)) return

      const allPollData = film.pollHistory.find(p => p.year === 'all')
      if (allPollData && allPollData.votes > 0) {
        if (rankRange !== 'consensus' || (allPollData.rank && allPollData.rank <= 100)) {
          counts.all += 1
        }
      }

      POLL_YEARS.forEach(y => {
        const pd = film.pollHistory.find(p => p.year === y)
        if (!pd || pd.votes === 0) return
        if (rankRange === 'consensus') {
          const cutoffRank = countriesData?._pollMetadata?.[y]?.consensus?.cutoffRank
          if (pd.rank && cutoffRank && pd.rank <= cutoffRank) counts[y] += 1
        } else {
          counts[y] += 1
        }
      })
    })
    return counts
  }, [filmsData, countriesData, decodedCountryName, rankRange])

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

        // Apply rank filter for combined polls (top 100 by total votes)
        if (rankRange === 'consensus') {
          return allPollData.rank && allPollData.rank <= 100
        }
        return true
      } else {
        const pollData = film.pollHistory.find(p => p.year.toString() === selectedPoll)
        if (!pollData || pollData.votes === 0) return false

        // Apply consensus rank filter using per-poll cutoff
        if (rankRange === 'consensus') {
          const cutoffRank = countriesData?._pollMetadata?.[selectedPoll]?.consensus?.cutoffRank
          return pollData.rank && cutoffRank && pollData.rank <= cutoffRank
        }
        return true
      }
    })
  }, [filmsData, countriesData, decodedCountryName, selectedPoll, rankRange])

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
      : 'Consensus'

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
              to="/countries"
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
              to="/countries"
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

              {/* POLL SELECTION FILTER */}
              <div className="mb-6 pb-6 border-b-2 border-gray-300">
                <label className="block text-sm font-semibold text-black mb-3 uppercase tracking-wide">
                  Poll Selection
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {['all', ...POLL_YEARS].map(opt => {
                    const value = String(opt)
                    const active = value === String(selectedPoll)
                    const count = pollCounts[opt] ?? 0
                    const empty = count === 0
                    return (
                      <button
                        key={value}
                        type="button"
                        disabled={empty}
                        onClick={() => setSelectedPoll(value)}
                        title={empty
                          ? `${decodedCountryName} has no films in the ${value} poll`
                          : `${count} ${count === 1 ? 'film' : 'films'}`}
                        className={`py-2 text-sm font-black border-2 transition-colors ${
                          empty
                            ? 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed'
                            : active
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
            </div>
          </div>

          {/* MAIN CONTENT AREA */}
          <div className="col-span-12 lg:col-span-9">

            {/* BREADCRUMB */}
            <div className="text-sm text-black mb-2 uppercase tracking-wide">
              <Link to="/countries" className="hover:underline font-bold">Countries</Link>
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
                  {metrics.films.toLocaleString()} films
                </span>
                <span className="text-gray-500 font-medium normal-case ml-2">
                  ({metrics.votes.toLocaleString()} votes)
                </span>
                <span className="mx-2 text-black">|</span>
                <span className="font-medium">{getFilterText()}</span>
              </div>
            </div>

            {/* HERO SECTION: Overview charts - static, not affected by poll filter */}
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
                countriesData={countriesData}
              />
            </div>

            <div className="bg-white border-4 border-black p-6 mb-8">
              <div className="mb-6 border-b-2 border-gray-300 pb-4">
                <h2 className="text-3xl font-black text-black mb-2 uppercase tracking-wide">
                  Decade Distribution Heatmap
                </h2>
                <p className="text-black font-medium">
                  Each poll's row is colored on its own scale, showing which decades that poll valued most for {decodedCountryName}.
                </p>
              </div>
              <DecadeHeatmapRows
                films={allCountryFilms}
                selectedPoll={selectedPoll}
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
                {/* VISUALIZATION 1: DECADE × RANK TIER HEATMAP */}
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

                {/* VISUALIZATION 2: DIRECTORS TREEMAP */}
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
                to="/countries"
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
