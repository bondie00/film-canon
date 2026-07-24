import { useState, useEffect, useMemo } from 'react'
import { CONTINENT_KEYS } from '../utils/continents'

const MAX_SELECTION = 40

// Shared country-selection state for the country visualizations (bar chart / decade heatmap):
// Top-N mode, continent quick-filters, and the search-and-add dropdown.
//
// `transformedData` is an array of { name, filmCount, continent } for the active poll/metric,
// where `filmCount` is the active metric's value; it should be sorted by filmCount descending.
// `selectedData` (returned) is the currently-selected subset, sorted by filmCount, ready to render.
export default function useCountrySelection(transformedData, defaultCount) {
  const [selectedCountries, setSelectedCountries] = useState([])
  const [isTopNMode, setIsTopNMode] = useState(true)
  const [hasInitialized, setHasInitialized] = useState(false)

  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [pendingSelection, setPendingSelection] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedContinents, setExpandedContinents] = useState({})

  const topNNames = (data, n) => data.filter(c => c.filmCount > 0).slice(0, n).map(c => c.name)

  // Seed Top N on first data load.
  useEffect(() => {
    if (transformedData.length > 0 && !hasInitialized) {
      setSelectedCountries(topNNames(transformedData, defaultCount))
      setHasInitialized(true)
    }
  }, [transformedData, hasInitialized, defaultCount])

  // Re-apply Top N when data / count change while in Top N mode.
  useEffect(() => {
    if (hasInitialized && transformedData.length > 0 && isTopNMode) {
      setSelectedCountries(topNNames(transformedData, defaultCount))
    }
  }, [defaultCount, transformedData, isTopNMode, hasInitialized])

  const countriesByContinent = useMemo(() => {
    if (!transformedData.length) return []
    const grouped = {}
    transformedData.filter(c => c.filmCount > 0).forEach(c => {
      (grouped[c.continent] = grouped[c.continent] || []).push(c)
    })
    return Object.entries(grouped)
      .map(([continent, countries]) => ({
        continent,
        countries: countries.sort((a, b) => b.filmCount - a.filmCount),
        totalFilms: countries.reduce((s, c) => s + c.filmCount, 0),
      }))
      .sort((a, b) => b.totalFilms - a.totalFilms)
  }, [transformedData])

  const selectedData = useMemo(() =>
    transformedData
      .filter(c => selectedCountries.includes(c.name) && c.filmCount > 0)
      .sort((a, b) => b.filmCount - a.filmCount),
  [transformedData, selectedCountries])

  const filteredContinents = useMemo(() => {
    if (!searchQuery.trim()) return countriesByContinent
    const q = searchQuery.toLowerCase()
    return countriesByContinent
      .map(cont => cont.continent.toLowerCase().includes(q)
        ? cont
        : { ...cont, countries: cont.countries.filter(c => c.name.toLowerCase().includes(q)) })
      .filter(cont => cont.countries.length > 0)
  }, [countriesByContinent, searchQuery])

  const activeContinents = useMemo(() => {
    const set = new Set()
    transformedData.forEach(c => { if (c.filmCount > 0) set.add(c.continent) })
    return set
  }, [transformedData])

  // Which quick-filter button (if any) the current selection exactly matches.
  const activeButton = useMemo(() => {
    if (!selectedData.length) return null
    const visible = selectedData.map(c => c.name)
    const topN = topNNames(transformedData, defaultCount)
    if (topN.length === visible.length && topN.every(n => visible.includes(n))) return 'topN'
    for (const continent of CONTINENT_KEYS) {
      const names = transformedData.filter(c => c.continent === continent && c.filmCount > 0).map(c => c.name)
      if (names.length && names.length === visible.length && names.every(n => visible.includes(n))) return continent
    }
    return null
  }, [selectedData, transformedData, defaultCount])

  // ---- actions ----
  const resetToTopN = () => {
    setIsTopNMode(true)
    setSelectedCountries(topNNames(transformedData, defaultCount))
  }
  const selectContinent = (continentName) => {
    setIsTopNMode(false)
    const names = transformedData.filter(c => c.continent === continentName && c.filmCount > 0).map(c => c.name)
    if (names.length) setSelectedCountries(names)
  }
  const openDropdown = () => {
    setPendingSelection([...selectedCountries])
    setIsDropdownOpen(true)
    setExpandedContinents({})
  }
  const closeDropdown = () => {
    setIsDropdownOpen(false)
    setPendingSelection([])
    setSearchQuery('')
    setExpandedContinents({})
  }
  const toggleContinentExpanded = (name) =>
    setExpandedContinents(prev => ({ ...prev, [name]: !prev[name] }))
  const applySelection = () => {
    if (pendingSelection.length > 0 && pendingSelection.length <= MAX_SELECTION) {
      setIsTopNMode(false)
      setSelectedCountries(pendingSelection)
      closeDropdown()
    }
  }
  const clearPending = () => setPendingSelection([])
  const togglePendingCountry = (name) =>
    setPendingSelection(prev =>
      prev.includes(name)
        ? prev.filter(n => n !== name)
        : (prev.length < MAX_SELECTION ? [...prev, name] : prev))
  const togglePendingContinent = (cont) => {
    const names = cont.countries.map(c => c.name)
    const anySelected = names.some(n => pendingSelection.includes(n))
    if (anySelected) {
      setPendingSelection(prev => prev.filter(n => !names.includes(n)))
    } else {
      setPendingSelection(prev => {
        const next = [...prev]
        names.forEach(n => { if (!next.includes(n) && next.length < MAX_SELECTION) next.push(n) })
        return next
      })
    }
  }

  return {
    selectedCountries, setSelectedCountries, setIsTopNMode,
    selectedData, countriesByContinent, filteredContinents, activeContinents, activeButton,
    isDropdownOpen, pendingSelection, searchQuery, setSearchQuery, expandedContinents,
    defaultCount, maxSelection: MAX_SELECTION,
    resetToTopN, selectContinent, openDropdown, closeDropdown, toggleContinentExpanded,
    applySelection, clearPending, togglePendingCountry, togglePendingContinent,
  }
}
