import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { buildRankIndex, resolveTarget, EMPTY_RANK_INDEX } from '../lib/rankDepth'
import { buildContinentIndex, filterFilmsByCountrySelection } from '../lib/geo'
import { POLL_YEARS, VALID_POLLS } from './useFilterParams'

// Single source of truth for the unified films surface (/explore).
//
// All query state lives in the URL. The surface is a single paginated poster
// gallery; the rank-depth slider (top) narrows from the full record down to the
// core canon. The old Database "list" view has been retired.
//
// URL params:
//   poll       'all' | '1952'..'2022'            (default '2022')
//   top        film-count target (e.g. 100 = "the top ~100 films") or absent = all
//              films. Resolved per poll to a rank cutoff; see lib/rankDepth.js.
//   sort       'votes' | 'title-az' | 'year-newest' | 'year-oldest'  (default 'votes')
//   page       1-based page number               (default 1)
//   title      repeated — selected film titles
//   director   repeated — selected directors
//   country    repeated — selected countries
//   continent  repeated — selected continents (a continent is its own token,
//              NOT expanded into its countries; see lib/geo.js)
//   yearStart  production-year lower bound
//   yearEnd    production-year upper bound
//
// Multi-selects use REPEATED params (?country=Japan&country=France) rather than
// a delimiter, because film titles contain commas ("Jeanne Dielman, 23, …").

// The poll vocabulary is shared with useFilterParams, which the hubs and detail
// pages use — ?poll= has to mean the same thing on every page for the links
// between them to carry it. Re-exported because callers already import it here.
export { POLL_YEARS, VALID_POLLS }
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
  const rawSort = searchParams.get('sort')
  const sortBy = VALID_SORTS.includes(rawSort) ? rawSort : 'votes'
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const rawTop = searchParams.get('top')
  const topRank = rawTop && /^\d+$/.test(rawTop) ? parseInt(rawTop, 10) : null
  const selectedTitles = searchParams.getAll('title')
  const selectedDirectors = searchParams.getAll('director')
  const selectedCountries = searchParams.getAll('country')
  // Continents are their own dimension, not shorthand for their countries — see
  // lib/geo.js for why one chip beats forty.
  const selectedContinents = searchParams.getAll('continent')
  const yearStart = searchParams.get('yearStart') || ''
  const yearEnd = searchParams.get('yearEnd') || ''

  // Shape the FilterPanel already expects.
  const filters = { selectedTitles, selectedDirectors, selectedCountries, selectedContinents, yearStart, yearEnd, sortBy }

  const hasActiveFilters =
    selectedTitles.length > 0 ||
    selectedDirectors.length > 0 ||
    selectedCountries.length > 0 ||
    selectedContinents.length > 0 ||
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

  // Rank histogram for the active poll, shared with the depth control so the
  // slider's stops and the filtering below can never disagree.
  const rankIndex = useMemo(
    () => (films ? buildRankIndex(films, poll) : EMPTY_RANK_INDEX),
    [films, poll]
  )

  // topRank is a film-COUNT target, not a rank — "top 100" means the ~100
  // highest-ranked films of this poll, resolved to whatever rank that takes here.
  const { cutoffRank, filmCount: depthFilmCount } = useMemo(
    () => resolveTarget(rankIndex, topRank),
    [rankIndex, topRank]
  )

  // Step 1 — poll membership + the rank-depth cutoff. topRank is null by default
  // (every film that received a vote in the active poll); when set, keeps only
  // films inside the resolved cutoff. 'all' uses the aggregate rank entry.
  const pollFiltered = useMemo(() => {
    if (!films) return []
    return films.filter(f => {
      const p = f.pollHistory.find(x => x.year === pollKey)
      if (!p || !(p.votes > 0)) return false
      if (cutoffRank != null && (p.rank == null || p.rank > cutoffRank)) return false
      return true
    })
  }, [films, pollKey, cutoffRank])

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

  // Step 3 — apply the country filter, which is countries OR continents.
  // Resolved to one flat Set so the two dimensions cost the same as one.
  const continentIndex = useMemo(() => buildContinentIndex(countriesData), [countriesData])
  const filtered = useMemo(
    () => filterFilmsByCountrySelection(
      beforeCountry,
      { countries: selectedCountries, continents: selectedContinents },
      continentIndex
    ),
    [beforeCountry, selectedCountries, selectedContinents, continentIndex]
  )

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
  // may not have the page you were on). Callers that want to keep the current page
  // — a poll change, which swaps the dataset without changing the question — pass
  // `page` explicitly in the updates.
  //
  // `replace` swaps the current history entry instead of pushing a new one; used for
  // corrections the user didn't ask for (e.g. clamping a page past the end), which
  // shouldn't cost them a Back press.
  const setParam = useCallback((updates, { replace = false } = {}) => {
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
    }, { replace })
  }, [setSearchParams])

  // Map the FilterPanel's filter-object shape to URL params.
  const onFilterChange = useCallback((changes) => {
    const map = {
      selectedTitles: 'title',
      selectedDirectors: 'director',
      selectedCountries: 'country',
      selectedContinents: 'continent',
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
    setParam({ title: [], director: [], country: [], continent: [], yearStart: '', yearEnd: '', sort: '', top: '' })
  }, [setParam])

  return {
    loading,
    error,
    films,
    countriesData,
    // parsed state
    poll,
    topRank,
    rankIndex,
    cutoffRank,
    depthFilmCount,
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
