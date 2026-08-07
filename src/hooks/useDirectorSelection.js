import { useState, useEffect, useMemo } from 'react'

const MAX_SELECTION = 40
export const TOP_N_OPTIONS = [10, 25, 50]

/**
 * Shared director-selection state for the director visualizations (ranking bar
 * chart / decade heatmap) — the director-side twin of useCountrySelection.
 *
 * One difference from the country hook, and it's structural: there are no
 * continent quick-filters, because a director has no continent. A filmography
 * spans countries and useDirectorAggregates deliberately refuses to collapse one
 * to a single country (98 directors in the 2022 poll have films on more than one
 * continent; 48 more have an outright tie for their commonest country). So the
 * quick filters here are depth — Top 10 / 25 / 50 — and the dropdown is a flat
 * searchable list rather than a continent accordion.
 *
 * `ordered` must already be sorted by the active metric, descending; it's the
 * caller's `orderRows(rows, valueKey)`. `selectedData` comes back in that same
 * order, ready to render.
 */
export default function useDirectorSelection(ordered, rankKey = 'votesRank', initialTopN = 10) {
  const [selectedNames, setSelectedNames] = useState([])
  const [topN, setTopN] = useState(initialTopN)
  const [isTopNMode, setIsTopNMode] = useState(true)

  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [pendingSelection, setPendingSelection] = useState([])
  const [searchQuery, setSearchQuery] = useState('')

  /**
   * Top N is a RANK cutoff, not the first N rows — so a tie straddling the
   * boundary shows every director in it rather than an arbitrary subset.
   *
   * `slice(0, topN)` looks equivalent and isn't. Competition ranks mean tied
   * directors share a rank, and slicing cuts the block wherever the sort
   * happened to land: 2022's top ten by votes drops a director tied at 194,
   * 1952's top fifty drops ten tied on 2 votes, and under the films metric
   * whole blocks vanish — seven directors share 15 films at 2022's tenth place.
   * The result is a chart that omits rows without saying so, and the omission
   * moves when the sort is stable-but-arbitrary.
   *
   * This is the rule the retired poster podium used and documented; the chart
   * replaced it with a slice and lost it. Selecting on rank can return MORE than
   * topN rows, which is correct and why callers surface the real count.
   */
  useEffect(() => {
    if (!isTopNMode || !ordered.length) return
    setSelectedNames(ordered.filter(r => r[rankKey] <= topN).map(r => r.name))
  }, [ordered, topN, isTopNMode, rankKey])

  const selectedData = useMemo(() => {
    const picked = new Set(selectedNames)
    return ordered.filter(r => picked.has(r.name) && r.films > 0)
  }, [ordered, selectedNames])

  const results = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const pool = q ? ordered.filter(r => r.name.toLowerCase().includes(q)) : ordered
    return pool.slice(0, 200)
  }, [ordered, searchQuery])

  const selectTopN = n => {
    setIsTopNMode(true)
    setTopN(n)
  }

  const openDropdown = () => {
    setPendingSelection([...selectedNames])
    setIsDropdownOpen(true)
  }

  const closeDropdown = () => {
    setIsDropdownOpen(false)
    setPendingSelection([])
    setSearchQuery('')
  }

  const applySelection = () => {
    if (!pendingSelection.length || pendingSelection.length > MAX_SELECTION) return
    setIsTopNMode(false)
    setSelectedNames(pendingSelection)
    closeDropdown()
  }

  const clearPending = () => setPendingSelection([])

  const togglePending = name =>
    setPendingSelection(prev =>
      prev.includes(name)
        ? prev.filter(n => n !== name)
        : prev.length < MAX_SELECTION ? [...prev, name] : prev
    )

  return {
    selectedNames, selectedData, results,
    topN, isTopNMode, activeTopN: isTopNMode ? topN : null,
    isDropdownOpen, pendingSelection, searchQuery, setSearchQuery,
    total: ordered.length, maxSelection: MAX_SELECTION,
    selectTopN, openDropdown, closeDropdown, applySelection, clearPending, togglePending,
  }
}
