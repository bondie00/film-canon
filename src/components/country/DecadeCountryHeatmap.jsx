import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import useCountrySelection from '../../hooks/useCountrySelection'
import { CountryQuickFilters, CountrySearchDropdown } from './CountrySelectionControls'
import CountryPanel from './CountryPanel'
import { continentColors, shadeToward } from '../../utils/continents'
import { ALL_DECADES, decadeColumns } from '../../utils/decades'
import { filmsForCountry } from '../../lib/countryFilms'
import { TOOLTIP_BOX, TOOLTIP_TITLE, TOOLTIP_SUBTITLE, TOOLTIP_VALUE, TOOLTIP_DETAIL, TOOLTIP_WIDTH } from '../../utils/tooltip'

const decadeOfYear = (y) => {
  const n = parseInt(String(y ?? '').split(/[-–]/)[0], 10)
  return isNaN(n) ? null : String(Math.floor(n / 10) * 10)
}

const pollEntryOf = (film, selectedPoll) =>
  selectedPoll === 'all'
    ? film.pollHistory?.find(p => p.year === 'all')
    : film.pollHistory?.find(p => p.year === parseInt(selectedPoll, 10))

const CELL_HEIGHT = 34
const ROW_GAP = 4
const LABEL_WIDTH = 140

export default function DecadeCountryHeatmap({ countriesData, filmsData, selectedPoll, cutoffRank = null, topTarget = null, metric = 'films' }) {
  const [hoveredCell, setHoveredCell] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const containerRef = useRef(null)
  const expandedPanelRef = useRef(null)

  // Whether rows are countries (default) or one row per continent, mirroring the
  // bar chart's Continents view.
  const [viewMode, setViewMode] = useState('countries') // 'countries' | 'continents'
  // { country, decade } for the expanded panel. decade === null means the whole
  // country (opened from the row label); a decade scopes the panel to that column.
  const [selectedCell, setSelectedCell] = useState(null)
  const selectedCountry = selectedCell?.country ?? null

  const defaultCount = 10

  // Per-country totals for the active poll/metric (drives selection: Top N, continent groups).
  const transformedData = useMemo(() => {
    if (!countriesData) return []
    const rows = []
    Object.entries(countriesData).forEach(([name, info]) => {
      if (name.startsWith('_')) return
      const pd = info.byPoll?.[selectedPoll]
      const films = pd?.distinctFilms || 0
      const votes = pd?.total || 0
      rows.push({ name, filmCount: metric === 'votes' ? votes : films, films, votes, continent: info.continent })
    })
    return rows.sort((a, b) => b.filmCount - a.filmCount)
  }, [countriesData, selectedPoll, metric])

  const sel = useCountrySelection(transformedData, defaultCount)

  // Country -> continent, for folding the matrix up in the Continents view.
  const continentOf = useMemo(() => {
    const map = {}
    transformedData.forEach(r => { map[r.name] = r.continent })
    return map
  }, [transformedData])

  // One row per continent, summing its countries' values. Summed rather than
  // deduplicated so a continent row matches the bar chart's continent bar exactly
  // (a co-production counts once per country in both).
  const continentRows = useMemo(() => {
    const agg = {}
    transformedData.forEach(c => {
      if (c.filmCount <= 0) return
      if (!agg[c.continent]) {
        agg[c.continent] = { name: c.continent, continent: c.continent, filmCount: 0, films: 0, votes: 0, countryCount: 0, isContinent: true }
      }
      agg[c.continent].filmCount += c.filmCount
      agg[c.continent].films += c.films
      agg[c.continent].votes += c.votes
      agg[c.continent].countryCount += 1
    })
    return Object.values(agg).sort((a, b) => b.filmCount - a.filmCount)
  }, [transformedData])

  const rows = viewMode === 'continents' ? continentRows : sel.selectedData

  // Which films count toward the heatmap (mirrors the bar chart / panel rank-depth filter).
  const qualifies = useCallback((film) => {
    const entry = pollEntryOf(film, selectedPoll)
    if (!entry || !(entry.votes > 0)) return false
    if (cutoffRank == null) return true
    return entry.rank != null && entry.rank <= cutoffRank
  }, [selectedPoll, cutoffRank])

  // row -> decade -> value (film count, or vote sum in votes mode), row-normalized for shading.
  const { matrix, decades, rowMax } = useMemo(() => {
    const names = new Set(rows.map(r => r.name))
    const m = {}
    rows.forEach(r => { m[r.name] = {} })
    if (filmsData) {
      filmsData.forEach(film => {
        if (!qualifies(film)) return
        const d = decadeOfYear(film.Year)
        if (!d) return
        const value = metric === 'votes' ? (pollEntryOf(film, selectedPoll).votes || 0) : 1
        film.countries?.forEach(cn => {
          const key = viewMode === 'continents' ? continentOf[cn] : cn
          if (key && names.has(key)) m[key][d] = (m[key][d] || 0) + value
        })
      })
    }
    const rMax = {}
    rows.forEach(r => { rMax[r.name] = Math.max(0, ...Object.values(m[r.name])) })
    const cols = decadeColumns(ALL_DECADES.filter(d => rows.some(r => (m[r.name][d] || 0) > 0)))
    return { matrix: m, decades: cols, rowMax: rMax }
  }, [rows, filmsData, selectedPoll, metric, qualifies, viewMode, continentOf])

  const unit = metric === 'votes' ? 'votes' : 'films'
  const valueLabel = (v) => `${v.toLocaleString()} ${v === 1 && metric !== 'votes' ? 'film' : unit}`

  const handleCellHover = (e, country, decade, value, max) => {
    setMousePos({ x: e.clientX, y: e.clientY })
    setHoveredCell({ country, decade, value, isPeak: value > 0 && value === max })
  }

  // Clicking a country row opens its expanded panel. Continent rows are inert —
  // the quick-filter buttons above are how you get from a continent to its
  // countries, so rows don't double as navigation.
  // Only cells open the panel, and always scoped to their decade. The row labels
  // are deliberately inert — the panel's own title links through to the country
  // page, which is a clearer route than making the axis a second kind of target.
  const cellsAreClickable = viewMode === 'countries'
  const openPanel = useCallback((row, decade) => {
    if (viewMode !== 'countries' || selectedCountry) return
    setHoveredCell(null)
    setSelectedCell({ country: row.name, decade })
  }, [viewMode, selectedCountry])

  // The quick filters stay visible in the Continents view; using one returns to the
  // Countries view, and none of them read as pressed while continents are shown.
  const quickFilterSel = useMemo(() => ({
    ...sel,
    activeButton: viewMode === 'continents' ? null : sel.activeButton,
    resetToTopN: () => { setSelectedCell(null); setViewMode('countries'); sel.resetToTopN() },
    selectContinent: (name) => { setSelectedCell(null); setViewMode('countries'); sel.selectContinent(name) },
  }), [sel, viewMode])

  const handleCloseExpanded = useCallback(() => setSelectedCell(null), [])

  const selectedCountryData = useMemo(() => {
    if (!selectedCell) return null
    const info = transformedData.find(c => c.name === selectedCell.country)
    if (!info) return null
    const { decade } = selectedCell
    const filmList = filmsForCountry(filmsData, selectedCell.country, selectedPoll, cutoffRank)
      .filter(f => decadeOfYear(f.Year) === decade)
    return { ...info, decade, filmList }
  }, [selectedCell, transformedData, filmsData, selectedPoll, cutoffRank])

  // Filter changes leave the panel open so it re-reads the new data, matching the
  // bar chart and world map. Only close if the country dropped out of the data.
  useEffect(() => {
    if (!selectedCountry) return
    const row = transformedData.find(c => c.name === selectedCountry)
    if (!row || row.filmCount <= 0) setSelectedCell(null)
  }, [transformedData, selectedCountry])

  // The grid must stay tall enough to hold the panel when few rows are shown.
  const gridMinHeight = useMemo(() => {
    if (!selectedCountryData) return undefined
    return `${Math.max(280, Math.min(230 + selectedCountryData.filmList.length * 42, 448))}px`
  }, [selectedCountryData])

  return (
    <div className="bg-white border-4 border-black p-6 mb-8">
      <div className="mb-4 border-b-2 border-gray-300 pb-3">
        <h2 className="text-3xl font-black text-black mb-4 uppercase tracking-wide">Films by Decade</h2>

        {/* Quick filters */}
        <div className="mt-4">
          <CountryQuickFilters sel={quickFilterSel} />
        </div>

        {/* Continents view toggle - its own row, matching the bar chart */}
        <div className="flex mt-2">
          <div className="bg-white border-2 border-black p-1 flex-shrink-0">
            <button
              onClick={() => {
                setSelectedCell(null)
                setViewMode(v => (v === 'continents' ? 'countries' : 'continents'))
              }}
              className={`py-2 px-3 text-sm font-bold uppercase tracking-wide transition-all border-2 border-black ${
                viewMode === 'continents'
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-black hover:text-white'
              }`}
            >
              Continents
            </button>
          </div>
        </div>
      </div>

      {rows.length === 0 || decades.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 h-64 flex items-center justify-center text-center">
          <div className="text-gray-500">
            <div className="text-4xl mb-3">📅</div>
            <div className="font-bold">No decade data for the current selection</div>
          </div>
        </div>
      ) : (
        <div className="relative" style={gridMinHeight ? { minHeight: gridMinHeight } : undefined}>
          <div ref={containerRef} className="overflow-x-auto" onMouseLeave={() => setHoveredCell(null)}>
            <div className="flex min-w-max">
              {/* Y-axis: row names */}
              <div className="shrink-0 flex flex-col border-r-2 border-black" style={{ width: LABEL_WIDTH }}>
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500 border-b border-gray-300" style={{ height: 24 }} />
                {rows.map((r) => (
                  <div
                    key={r.name}
                    className="flex items-center justify-end pr-3 font-bold text-sm text-black border-b border-gray-200 truncate"
                    style={{ height: CELL_HEIGHT + ROW_GAP }}
                    title={r.name}
                  >
                    {r.name}
                  </div>
                ))}
                <div style={{ height: 32 }} />
              </div>

              {/* Main grid */}
              <div className="flex-1 flex flex-col">
                <div style={{ height: 24 }} />
                <div>
                  {rows.map((r) => {
                    const color = continentColors[r.continent] || '#000000'
                    const max = rowMax[r.name]
                    return (
                      <div
                        key={r.name}
                        className="flex items-stretch border-b border-gray-200"
                        style={{ height: CELL_HEIGHT, marginBottom: ROW_GAP }}
                      >
                        {decades.map((decade, idx) => {
                          const value = matrix[r.name]?.[decade] || 0
                          const bg = value === 0 || max === 0 ? '#f3f4f6' : shadeToward(color, value / max)
                          const isLast = idx === decades.length - 1
                          return (
                            <div
                              key={`${r.name}-${decade}`}
                              className={`flex-1 flex items-center justify-center ${cellsAreClickable && value > 0 ? 'cursor-pointer' : 'cursor-default'} transition-all hover:ring-2 hover:ring-black hover:ring-inset border-t border-b border-gray-400 ${!isLast ? 'border-r border-r-gray-300' : 'border-r border-r-gray-400'} ${idx === 0 ? 'border-l border-l-gray-400' : ''}`}
                              style={{ backgroundColor: bg, minWidth: 44 }}
                              onMouseEnter={(e) => handleCellHover(e, r.name, decade, value, max)}
                              onMouseMove={(e) => handleCellHover(e, r.name, decade, value, max)}
                              onClick={() => value > 0 && openPanel(r, decade)}
                            >
                              {value > 0 && <span className="text-xs font-bold text-black">{value.toLocaleString()}</span>}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>

                {/* X-axis: decades */}
                <div className="border-t-2 border-black flex" style={{ height: 32 }}>
                  {decades.map((decade) => (
                    <div
                      key={decade}
                      className="flex-1 flex items-center justify-center text-xs font-bold tracking-wide text-black"
                      style={{ minWidth: 44 }}
                    >
                      {decade}s
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tooltip */}
            {!selectedCountryData && hoveredCell && hoveredCell.value > 0 && (() => {
              const rect = containerRef.current?.getBoundingClientRect()
              if (!rect) return null
              const w = TOOLTIP_WIDTH
              const h = 96
              const offset = 12
              const isRight = mousePos.x > window.innerWidth / 2
              const x = isRight ? mousePos.x - w - offset : mousePos.x + offset
              const midY = rect.top + rect.height / 2
              const y = mousePos.y > midY ? mousePos.y - h - offset : mousePos.y + offset
              return (
                <div
                  className={`fixed pointer-events-none z-50 ${TOOLTIP_BOX}`}
                  style={{ left: x, top: y, width: w, transition: 'left 0.08s ease-out, top 0.08s ease-out' }}
                >
                  <p className={TOOLTIP_TITLE}>{hoveredCell.country}</p>
                  <p className={TOOLTIP_SUBTITLE}>{hoveredCell.decade}s</p>
                  <p className={TOOLTIP_VALUE}>{valueLabel(hoveredCell.value)}</p>
                  {hoveredCell.isPeak && (
                    <p className={`${TOOLTIP_DETAIL} font-bold`} style={{ color: continentColors[rows.find(r => r.name === hoveredCell.country)?.continent] }}>
                      Peak decade
                    </p>
                  )}
                </div>
              )
            })()}
          </div>

          {/* Expanded Country Panel - overlays the grid */}
          {selectedCountryData && (
            <CountryPanel
              name={selectedCountryData.name}
              films={selectedCountryData.filmList}
              metric={metric}
              selectedPoll={selectedPoll}
              topTarget={topTarget}
              subtitle={`${selectedCountryData.decade}s`}
              yearRange={{
                start: Number(selectedCountryData.decade),
                end: Number(selectedCountryData.decade) + 9,
              }}
              onClose={handleCloseExpanded}
              panelRef={expandedPanelRef}
            />
          )}
        </div>
      )}

      {/* Search-and-add sits BELOW the grid, as on the bar chart. Hidden in the
          continents view, where there's no per-country selection to customize. */}
      {viewMode === 'countries' && <CountrySearchDropdown sel={sel} />}

    </div>
  )
}
