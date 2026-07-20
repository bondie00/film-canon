import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

// Single source of truth for the unified films surface (/explore).
//
// All query state lives in the URL so Gallery and List are two views of the
// SAME filtered/sorted result set — switching view flips ?view= and keeps every
// other param. The old Database page (/search) is now just ?view=list.
//
// URL params:
//   poll       'all' | '1952'..'2022'            (default '2022')
//   view       'gallery' | 'list'                (default 'gallery')
//   sort       'votes' | 'title-az' | 'year-newest' | 'year-oldest'  (default 'votes')
//   page       1-based page number               (default 1)
//   title      repeated — selected film titles
//   director   repeated — selected directors
//   country    repeated — selected countries
//   yearStart  production-year lower bound
//   yearEnd    production-year upper bound
//
// Multi-selects use REPEATED params (?country=Japan&country=France) rather than
// a delimiter, because film titles contain commas ("Jeanne Dielman, 23, …").

export const POLL_YEARS = [1952, 1962, 1972, 1982, 1992, 2002, 2012, 2022]
const VALID_POLLS = ['all', ...POLL_YEARS.map(String)]
const VALID_VIEWS = ['gallery', 'list']
const VALID_SORTS = ['votes', 'title-az', 'year-newest', 'year-oldest']

export function useFilmQuery() {
  const [searchParams, setSearchParams] = useSearchParams()

  // ---- Data loading (once) ----
  const [films, setFilms] = useState(null)
  const [countriesData, setCountriesData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/data/films.json').then(r => r.json()),
      fetch('/data/countries.json').then(r => r.json()),
    ])
      .then(([f, c]) => {
        if (cancelled) return
        setFilms(f)
        setCountriesData(c)
        setLoading(false)
      })
      .catch(err => {
        if (cancelled) return
        console.error('Error loading data:', err)
        setError('Failed to load data')
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  // ---- Parse + validate URL state ----
  const rawPoll = searchParams.get('poll')
  const poll = VALID_POLLS.includes(rawPoll) ? rawPoll : '2022'
  const rawView = searchParams.get('view')
  const view = VALID_VIEWS.includes(rawView) ? rawView : 'gallery'
  const rawSort = searchParams.get('sort')
  const sortBy = VALID_SORTS.includes(rawSort) ? rawSort : 'votes'
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const selectedTitles = searchParams.getAll('title')
  const selectedDirectors = searchParams.getAll('director')
  const selectedCountries = searchParams.getAll('country')
  const yearStart = searchParams.get('yearStart') || ''
  const yearEnd = searchParams.get('yearEnd') || ''

  // Shape the FilterPanel already expects.
  const filters = { selectedTitles, selectedDirectors, selectedCountries, yearStart, yearEnd, sortBy }

  const hasActiveFilters =
    selectedTitles.length > 0 ||
    selectedDirectors.length > 0 ||
    selectedCountries.length > 0 ||
    !!yearStart ||
    !!yearEnd

  // ---- Options + per-poll counts (for the filter UI) ----
  const titleOptions = useMemo(() => {
    if (!films) return []
    const titles = new Set()
    films.forEach(f => {
      if (f.FilmTitle) titles.add(f.FilmTitle)
      if (f.AlternateTitle) titles.add(f.AlternateTitle)
    })
    return Array.from(titles).sort()
  }, [films])

  const directorOptions = useMemo(() => {
    if (!films) return []
    const directors = new Set()
    films.forEach(f => f.directors?.forEach(d => directors.add(d)))
    return Array.from(directors).sort()
  }, [films])

  const filmCounts = useMemo(() => {
    if (!films) return {}
    const counts = { all: films.length }
    POLL_YEARS.forEach(year => {
      counts[year.toString()] = films.filter(f => {
        const p = f.pollHistory.find(x => x.year === year)
        return p && p.votes > 0
      }).length
    })
    return counts
  }, [films])

  // ---- Filtering pipeline ----
  // Poll's rank/votes entry for a film ('all' is a real aggregate entry in the data).
  const pollKey = poll === 'all' ? 'all' : parseInt(poll, 10)
  const getPollData = useCallback(
    (film) => film.pollHistory.find(p => p.year === pollKey) || { rank: null, votes: 0 },
    [pollKey]
  )

  // Step 1 — films that received votes in the active poll.
  const pollFiltered = useMemo(() => {
    if (!films) return []
    if (poll === 'all') return films
    return films.filter(f => {
      const p = f.pollHistory.find(x => x.year === pollKey)
      return p && p.votes > 0
    })
  }, [films, poll, pollKey])

  // Step 2 — everything EXCEPT the country filter (drives the sidebar's country counts).
  const beforeCountry = useMemo(() => {
    let result = pollFiltered
    if (selectedTitles.length > 0) {
      result = result.filter(f =>
        selectedTitles.some(t => f.FilmTitle === t || f.AlternateTitle === t)
      )
    }
    if (selectedDirectors.length > 0) {
      result = result.filter(f => f.directors.some(d => selectedDirectors.includes(d)))
    }
    if (yearStart) {
      const start = parseInt(yearStart, 10)
      result = result.filter(f => {
        const y = parseInt(f.Year, 10)
        return !isNaN(y) && y >= start
      })
    }
    if (yearEnd) {
      const end = parseInt(yearEnd, 10)
      result = result.filter(f => {
        const y = parseInt(f.Year, 10)
        return !isNaN(y) && y <= end
      })
    }
    return result
  }, [pollFiltered, selectedTitles, selectedDirectors, yearStart, yearEnd])

  // Step 3 — apply country filter.
  const filtered = useMemo(() => {
    if (selectedCountries.length === 0) return beforeCountry
    return beforeCountry.filter(f => f.countries.some(c => selectedCountries.includes(c)))
  }, [beforeCountry, selectedCountries])

  // Step 4 — sort (relative to the active poll).
  const sorted = useMemo(() => {
    const arr = [...filtered]
    switch (sortBy) {
      case 'votes':
        arr.sort((a, b) => {
          const ad = getPollData(a)
          const bd = getPollData(b)
          if (ad.rank && bd.rank) return ad.rank - bd.rank
          if (ad.rank && !bd.rank) return -1
          if (!ad.rank && bd.rank) return 1
          return bd.votes - ad.votes
        })
        break
      case 'title-az':
        arr.sort((a, b) => (a.FilmTitle || '').localeCompare(b.FilmTitle || ''))
        break
      case 'year-newest':
        arr.sort((a, b) => (parseInt(b.Year, 10) || 0) - (parseInt(a.Year, 10) || 0))
        break
      case 'year-oldest':
        arr.sort((a, b) => (parseInt(a.Year, 10) || 0) - (parseInt(b.Year, 10) || 0))
        break
    }
    return arr
  }, [filtered, sortBy, getPollData])

  // ---- URL setters ----
  // Any change other than paging itself resets to page 1 (a filtered result set
  // may not have the page you were on).
  const setParam = useCallback((updates) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      for (const [key, value] of Object.entries(updates)) {
        if (Array.isArray(value)) {
          next.delete(key)
          value.forEach(v => next.append(key, v))
        } else if (value === '' || value == null) {
          next.delete(key)
        } else {
          next.set(key, value)
        }
      }
      if (!('page' in updates)) next.delete('page')
      return next
    })
  }, [setSearchParams])

  // Map the FilterPanel's filter-object shape to URL params.
  const onFilterChange = useCallback((changes) => {
    const map = {
      selectedTitles: 'title',
      selectedDirectors: 'director',
      selectedCountries: 'country',
      yearStart: 'yearStart',
      yearEnd: 'yearEnd',
      sortBy: 'sort',
    }
    const updates = {}
    for (const [k, v] of Object.entries(changes)) {
      if (k in map) updates[map[k]] = v
    }
    setParam(updates)
  }, [setParam])

  const clearFilters = useCallback(() => {
    setParam({ title: [], director: [], country: [], yearStart: '', yearEnd: '', sort: '' })
  }, [setParam])

  return {
    loading,
    error,
    films,
    countriesData,
    // parsed state
    poll,
    view,
    sortBy,
    page,
    filters,
    hasActiveFilters,
    // options
    titleOptions,
    directorOptions,
    filmCounts,
    // pipeline
    pollFiltered,
    beforeCountry,
    filtered,
    sorted,
    getPollData,
    // setters
    setParam,
    onFilterChange,
    clearFilters,
  }
}
