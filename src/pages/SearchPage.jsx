import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import FilmCard from '../components/search/FilmCard'
import FilterPanel from '../components/search/FilterPanel'
import Pagination from '../components/search/Pagination'

const FILMS_PER_PAGE = 20

const DEFAULT_FILTERS = {
  selectedTitles: [],
  selectedDirectors: [],
  selectedCountries: [],
  yearStart: '',
  yearEnd: '',
  sortBy: 'votes',
}

export default function SearchPage() {
  // Data loading
  const [filmsData, setFilmsData] = useState(null)
  const [countriesData, setCountriesData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Poll selector (auto-apply) — honor a ?poll= deep link (e.g. from /explore's handoff)
  const [searchParams] = useSearchParams()
  const [activePoll, setActivePoll] = useState(() => {
    const p = searchParams.get('poll')
    const valid = ['1952', '1962', '1972', '1982', '1992', '2002', '2012', '2022']
    return p && valid.includes(p) ? p : 'all'
  })

  // Single filter state — all auto-apply
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS })

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)

  // Mobile filter panel
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  // Ref for scroll-to-top
  const resultsRef = useRef(null)

  // Load data
  useEffect(() => {
    setLoading(true)
    setError(null)

    Promise.all([
      fetch('/data/films.json').then(res => res.json()),
      fetch('/data/countries.json').then(res => res.json()),
    ])
      .then(([films, countries]) => {
        setFilmsData(films)
        setCountriesData(countries)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading data:', err)
        setError('Failed to load data')
        setLoading(false)
      })
  }, [])

  // Build unique title options from all films
  const titleOptions = useMemo(() => {
    if (!filmsData) return []
    const titles = new Set()
    filmsData.forEach(film => {
      if (film.FilmTitle) titles.add(film.FilmTitle)
      if (film.AlternateTitle) titles.add(film.AlternateTitle)
    })
    return Array.from(titles).sort()
  }, [filmsData])

  // Build unique director options from all films
  const directorOptions = useMemo(() => {
    if (!filmsData) return []
    const directors = new Set()
    filmsData.forEach(film => {
      film.directors?.forEach(d => directors.add(d))
    })
    return Array.from(directors).sort()
  }, [filmsData])

  // Calculate film counts per poll for the PollSelector
  const filmCounts = useMemo(() => {
    if (!filmsData) return {}
    const counts = { all: filmsData.length }
    const pollYears = [1952, 1962, 1972, 1982, 1992, 2002, 2012, 2022]
    pollYears.forEach(year => {
      counts[year.toString()] = filmsData.filter(film => {
        const pollData = film.pollHistory.find(p => p.year === year)
        return pollData && pollData.votes > 0
      }).length
    })
    return counts
  }, [filmsData])

  // Step 1: Filter by active poll
  const pollFilteredFilms = useMemo(() => {
    if (!filmsData) return []
    if (activePoll === 'all') return filmsData

    const pollYear = parseInt(activePoll)
    return filmsData.filter(film => {
      const pollData = film.pollHistory.find(p => p.year === pollYear)
      return pollData && pollData.votes > 0
    })
  }, [filmsData, activePoll])

  // Step 2a: Apply all filters EXCEPT country (used for country counts in sidebar)
  const filmsBeforeCountryFilter = useMemo(() => {
    let result = pollFilteredFilms

    // Title filter
    if (filters.selectedTitles.length > 0) {
      result = result.filter(film =>
        filters.selectedTitles.some(title =>
          film.FilmTitle === title || film.AlternateTitle === title
        )
      )
    }

    // Director filter
    if (filters.selectedDirectors.length > 0) {
      result = result.filter(film =>
        film.directors.some(d => filters.selectedDirectors.includes(d))
      )
    }

    // Year range
    if (filters.yearStart) {
      const startYear = parseInt(filters.yearStart)
      result = result.filter(film => {
        const year = parseInt(film.Year)
        return !isNaN(year) && year >= startYear
      })
    }
    if (filters.yearEnd) {
      const endYear = parseInt(filters.yearEnd)
      result = result.filter(film => {
        const year = parseInt(film.Year)
        return !isNaN(year) && year <= endYear
      })
    }

    return result
  }, [pollFilteredFilms, filters.selectedTitles, filters.selectedDirectors, filters.yearStart, filters.yearEnd])

  // Step 2b: Apply country filter
  const filteredFilms = useMemo(() => {
    if (filters.selectedCountries.length === 0) return filmsBeforeCountryFilter

    return filmsBeforeCountryFilter.filter(film =>
      film.countries.some(c => filters.selectedCountries.includes(c))
    )
  }, [filmsBeforeCountryFilter, filters.selectedCountries])

  // Step 3: Sort
  const sortedFilms = useMemo(() => {
    const sorted = [...filteredFilms]
    const pollYear = activePoll === 'all' ? 'all' : parseInt(activePoll)

    const getPollData = (film) => {
      return film.pollHistory.find(p => p.year === pollYear) || { rank: null, votes: 0 }
    }

    switch (filters.sortBy) {
      case 'votes':
        sorted.sort((a, b) => {
          const aData = getPollData(a)
          const bData = getPollData(b)
          if (aData.rank && bData.rank) return aData.rank - bData.rank
          if (aData.rank && !bData.rank) return -1
          if (!aData.rank && bData.rank) return 1
          return bData.votes - aData.votes
        })
        break
      case 'title-az':
        sorted.sort((a, b) => (a.FilmTitle || '').localeCompare(b.FilmTitle || ''))
        break
      case 'year-newest':
        sorted.sort((a, b) => {
          const yearA = parseInt(a.Year) || 0
          const yearB = parseInt(b.Year) || 0
          return yearB - yearA
        })
        break
      case 'year-oldest':
        sorted.sort((a, b) => {
          const yearA = parseInt(a.Year) || 0
          const yearB = parseInt(b.Year) || 0
          return yearA - yearB
        })
        break
    }
    return sorted
  }, [filteredFilms, filters.sortBy, activePoll])

  // Step 4: Paginate
  const totalPages = Math.ceil(sortedFilms.length / FILMS_PER_PAGE)
  const paginatedFilms = useMemo(() => {
    const start = (currentPage - 1) * FILMS_PER_PAGE
    return sortedFilms.slice(start, start + FILMS_PER_PAGE)
  }, [sortedFilms, currentPage])

  // Handlers
  const handlePollChange = useCallback((poll) => {
    setActivePoll(poll)
    setCurrentPage(1)
  }, [])

  const handleFilterChange = useCallback((changes) => {
    setFilters(prev => ({ ...prev, ...changes }))
    setCurrentPage(1)
  }, [])

  const handleClear = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS })
    setCurrentPage(1)
    setShowMobileFilters(false)
  }, [])

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page)
  }, [])

  // Results range text
  const startResult = (currentPage - 1) * FILMS_PER_PAGE + 1
  const endResult = Math.min(currentPage * FILMS_PER_PAGE, sortedFilms.length)

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-black font-medium">Loading film database...</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-20">
            <p className="text-red-600 font-bold">{error}</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  const filterPanelProps = {
    filters,
    onFilterChange: handleFilterChange,
    onClear: handleClear,
    countriesData,
    activePoll,
    onPollChange: handlePollChange,
    filmCounts,
    titleOptions,
    directorOptions,
    filmsForCountryCounts: filmsBeforeCountryFilter,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-12 gap-8">

          {/* LEFT SIDEBAR - FILTERS (desktop) */}
          <div className="hidden lg:block col-span-3">
            <FilterPanel {...filterPanelProps} />
          </div>

          {/* MAIN CONTENT */}
          <div className="col-span-12 lg:col-span-9" ref={resultsRef}>

            {/* PAGE TITLE */}
            <h1 className="text-6xl font-black text-black mb-6 uppercase tracking-tight border-b-4 border-black pb-4">
              Film Database
            </h1>

            {/* MOBILE FILTER TOGGLE */}
            <div className="lg:hidden mb-4">
              <button
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="w-full py-3 bg-white text-black font-bold uppercase tracking-wide border-2 border-black hover:bg-black hover:text-white transition-colors flex items-center justify-center gap-2"
              >
                <span>{showMobileFilters ? 'Hide Filters' : 'Show Filters'}</span>
                <span className="text-xs">
                  {showMobileFilters ? '▲' : '▼'}
                </span>
              </button>
            </div>

            {/* MOBILE FILTER PANEL */}
            {showMobileFilters && (
              <div className="lg:hidden mb-6">
                <FilterPanel {...filterPanelProps} />
              </div>
            )}

            {/* RESULTS HEADER + TOP PAGINATION */}
            <div className="bg-white border-2 border-black px-4 py-3 mb-4">
              <div className="flex items-center justify-between text-sm text-black">
                <span className="font-bold">
                  {sortedFilms.length > 0
                    ? `Showing ${startResult.toLocaleString()}–${endResult.toLocaleString()} of ${sortedFilms.length.toLocaleString()} films`
                    : 'No films found'
                  }
                </span>
                <span className="text-gray-500 font-medium">
                  {activePoll === 'all' ? 'All Polls' : `${activePoll} Poll`}
                </span>
              </div>
              {totalPages > 1 && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </div>

            {/* FILM CARDS */}
            {paginatedFilms.length > 0 ? (
              <div className="space-y-2">
                {paginatedFilms.map(film => (
                  <FilmCard
                    key={film.key}
                    film={film}
                    activePoll={activePoll}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white border-2 border-black p-12 text-center">
                <p className="text-lg font-bold text-black mb-2">No films match your filters</p>
                <p className="text-sm text-gray-500">Try adjusting your search criteria or clearing filters</p>
                <button
                  onClick={handleClear}
                  className="mt-4 px-6 py-2 bg-black text-white font-bold uppercase tracking-wide text-sm hover:bg-gray-800 transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            )}

            {/* BOTTOM PAGINATION */}
            <div className="mt-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
