import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import FilmCardsGrid from '../components/country/FilmCardsGrid'
import DirectorsTreemap from '../components/country/DirectorsTreemap'
import DecadeHeatmapRows from '../components/country/DecadeHeatmapRows'
import DecadeRankHeatmap from '../components/country/DecadeRankHeatmap'
import PollHistoryChart from '../components/country/PollHistoryChart'
import RankDepthFilter from '../components/RankDepthFilter'
import { buildRankIndex, resolveTarget, describeDepth, EMPTY_RANK_INDEX } from '../lib/rankDepth'

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
  // Film-count target for the rank-depth filter (null = all films), same units
  // and same control as the Countries page and /explore.
  const [topTarget, setTopTarget] = useState(null)
  // Which quantity every visualization is drawn in. Same control, same default and
  // same reach as the Countries page: it governs the whole page, not a section.
  const [metric, setMetric] = useState('films')
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

  // Helper function for filter text
  const getFilterText = () => {
    const pollText = selectedPoll === 'all'
      ? 'All Polls Combined'
      : `${selectedPoll} Poll`

    return `${pollText} • ${describeDepth(topTarget, activeDepth.filmCount, activeDepth.minVotes)}`
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

              {/* RANK DEPTH - the only control that governs the whole page. The poll
                  selector lives down with the section it actually scopes. */}
              <RankDepthFilter
                index={activeIndex}
                target={topTarget}
                onChange={setTopTarget}
              />

              {/* METRIC */}
              <div className="mt-6 pt-6 border-t-2 border-gray-300">
                <label className="block text-sm font-semibold text-black mb-3 uppercase tracking-wide">
                  Metric
                </label>
                <div className="grid grid-cols-2 gap-2 bg-white border-2 border-black p-1">
                  {['films', 'votes'].map(m => (
                    <button
                      key={m}
                      onClick={() => setMetric(m)}
                      className={`py-3 px-3 text-xs font-bold uppercase tracking-wide transition-all ${
                        metric === m
                          ? 'bg-black text-white border-2 border-black'
                          : 'bg-white text-black border-2 border-gray-300 hover:border-black'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
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
                  {metric === 'votes'
                    ? `${metrics.votes.toLocaleString()} votes`
                    : `${metrics.films.toLocaleString()} films`}
                </span>
                <span className="text-gray-500 font-medium normal-case ml-2">
                  ({metric === 'votes'
                    ? `${metrics.films.toLocaleString()} films`
                    : `${metrics.votes.toLocaleString()} votes`})
                </span>
                <span className="mx-2 text-black">|</span>
                <span className="font-medium">{getFilterText()}</span>
              </div>
            </div>

            {/* ZONE 1 - the whole run. The poll selector deliberately doesn't reach
                these; they're about the arc across all eight polls. */}
            <div className="mb-6 border-t-4 border-black pt-6">
              <h2 className="text-2xl font-black text-black uppercase tracking-wide">Over Time</h2>
            </div>

            <div className="bg-white border-4 border-black p-6 mb-8">
              <div className="mb-4 border-b-2 border-gray-300 pb-3">
                <h3 className="text-3xl font-black text-black uppercase tracking-wide">Canon Presence</h3>
              </div>
              <PollHistoryChart
                filmsData={filmsData}
                countryName={decodedCountryName}
                cutoffByPoll={cutoffByPoll}
                metric={metric}
                topTarget={topTarget}
                continentColor={continentColor}
              />
            </div>

            <div className="bg-white border-4 border-black p-6 mb-8">
              <div className="mb-4 border-b-2 border-gray-300 pb-3">
                <h3 className="text-3xl font-black text-black uppercase tracking-wide">Decades by Poll</h3>
              </div>
              <DecadeHeatmapRows
                films={allCountryFilms}
                countryName={decodedCountryName}
                topTarget={topTarget}
                cutoffByPoll={cutoffByPoll}
                metric={metric}
                continentColor={continentColor}
              />
            </div>

            {/* ZONE 2 - one poll at a time. The selector sits at the head of the zone
                rather than in the sidebar, so its scope is self-evident. */}
            <div className="mb-8 border-t-4 border-black pt-6">
              <h2 className="text-2xl font-black text-black uppercase tracking-wide mb-3">
                {selectedPoll === 'all' ? 'All Polls Combined' : `In the ${selectedPoll} Poll`}
              </h2>
              <div className="grid grid-cols-5 sm:grid-cols-9 gap-1.5 max-w-2xl">
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
                  <div className="mb-4 border-b-2 border-gray-300 pb-3">
                    <h3 className="text-3xl font-black text-black uppercase tracking-wide">Decades by Rank Tier</h3>
                  </div>
                  <DecadeRankHeatmap
                    films={countryFilms}
                    selectedPoll={selectedPoll}
                    topTarget={topTarget}
                    metric={metric}
                    continentColor={continentColor}
                  />
                </div>

                {/* VISUALIZATION 2: DIRECTORS TREEMAP */}
                <div className="bg-white border-4 border-black p-6 mb-8">
                  <div className="mb-4 border-b-2 border-gray-300 pb-3">
                    <h3 className="text-3xl font-black text-black uppercase tracking-wide">Directors</h3>
                  </div>
                  <DirectorsTreemap
                    films={countryFilms}
                    selectedPoll={selectedPoll}
                    metric={metric}
                    continentColor={continentColor}
                  />
                </div>

                {/* ALL FILMS GRID */}
                <div className="bg-white border-4 border-black p-6 mb-8">
                  <div className="mb-4 border-b-2 border-gray-300 pb-3">
                    <h3 className="text-3xl font-black text-black uppercase tracking-wide">All Films</h3>
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
