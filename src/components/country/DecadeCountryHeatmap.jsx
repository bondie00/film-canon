import { useMemo, useState, useRef } from 'react'
import useCountrySelection from '../../hooks/useCountrySelection'
import CountrySelectionControls from './CountrySelectionControls'
import { continentColors, shadeToward } from '../../utils/continents'

// Decades shown as columns (filtered to those with data).
const DECADES = ['1890', '1900', '1910', '1920', '1930', '1940', '1950', '1960', '1970', '1980', '1990', '2000', '2010', '2020']

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

export default function DecadeCountryHeatmap({ countriesData, filmsData, selectedPoll, cutoffRank = null, metric = 'films' }) {
  const [hoveredCell, setHoveredCell] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const containerRef = useRef(null)

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
  const rows = sel.selectedData

  // Which films count toward the heatmap (mirrors the bar chart / panel rank-depth filter).
  const qualifies = (film) => {
    const entry = pollEntryOf(film, selectedPoll)
    if (!entry || !(entry.votes > 0)) return false
    if (cutoffRank == null) return true
    return entry.rank != null && entry.rank <= cutoffRank
  }

  // country -> decade -> value (film count, or vote sum in votes mode), row-normalized for shading.
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
          if (names.has(cn)) m[cn][d] = (m[cn][d] || 0) + value
        })
      })
    }
    const rMax = {}
    rows.forEach(r => { rMax[r.name] = Math.max(0, ...Object.values(m[r.name])) })
    const cols = DECADES.filter(d => rows.some(r => (m[r.name][d] || 0) > 0))
    return { matrix: m, decades: cols, rowMax: rMax }
  }, [rows, filmsData, selectedPoll, metric, cutoffRank])

  const unit = metric === 'votes' ? 'votes' : 'films'
  const valueLabel = (v) => `${v.toLocaleString()} ${v === 1 && metric !== 'votes' ? 'film' : unit}`

  const handleCellHover = (e, country, decade, value, max) => {
    setMousePos({ x: e.clientX, y: e.clientY })
    setHoveredCell({ country, decade, value, isPeak: value > 0 && value === max })
  }

  return (
    <div className="bg-white border-4 border-black p-6 mb-8">
      <div className="mb-6 border-b-2 border-gray-300 pb-4">
        <h2 className="text-3xl font-black text-black mb-2 uppercase tracking-wide">
          When Their Films Were Made
        </h2>
        <p className="text-black font-medium">
          Each country's canon by decade of production, shaded to its own peak. Darker = more of that
          country's {unit} come from that decade.
        </p>
      </div>

      {/* Selection controls (Top N / continents / search) */}
      <div className="mb-6">
        <CountrySelectionControls sel={sel} />
      </div>

      {rows.length === 0 || decades.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 h-64 flex items-center justify-center text-center">
          <div className="text-gray-500">
            <div className="text-4xl mb-3">📅</div>
            <div className="font-bold">No decade data for the current selection</div>
          </div>
        </div>
      ) : (
        <div ref={containerRef} className="overflow-x-auto" onMouseLeave={() => setHoveredCell(null)}>
          <div className="flex min-w-max">
            {/* Y-axis: country names */}
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
                            className={`flex-1 flex items-center justify-center cursor-default transition-all hover:ring-2 hover:ring-black hover:ring-inset border-t border-b border-gray-400 ${!isLast ? 'border-r border-r-gray-300' : 'border-r border-r-gray-400'} ${idx === 0 ? 'border-l border-l-gray-400' : ''}`}
                            style={{ backgroundColor: bg, minWidth: 44 }}
                            onMouseEnter={(e) => handleCellHover(e, r.name, decade, value, max)}
                            onMouseMove={(e) => handleCellHover(e, r.name, decade, value, max)}
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
          {hoveredCell && hoveredCell.value > 0 && (() => {
            const rect = containerRef.current?.getBoundingClientRect()
            if (!rect) return null
            const w = 190
            const h = 92
            const offset = 12
            const isRight = mousePos.x > window.innerWidth / 2
            const x = isRight ? mousePos.x - w - offset : mousePos.x + offset
            const midY = rect.top + rect.height / 2
            const y = mousePos.y > midY ? mousePos.y - h - offset : mousePos.y + offset
            return (
              <div
                className="fixed pointer-events-none bg-white p-3 border-2 border-black shadow-lg z-50"
                style={{ left: x, top: y, width: w, transition: 'left 0.08s ease-out, top 0.08s ease-out' }}
              >
                <p className="font-bold text-sm text-black uppercase tracking-wide">{hoveredCell.country}</p>
                <p className="text-xs text-gray-600">{hoveredCell.decade}s</p>
                <p className="text-xl font-black text-black mt-1">{valueLabel(hoveredCell.value)}</p>
                {hoveredCell.isPeak && (
                  <p className="text-xs font-bold mt-0.5" style={{ color: continentColors[rows.find(r => r.name === hoveredCell.country)?.continent] }}>
                    Peak decade
                  </p>
                )}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
