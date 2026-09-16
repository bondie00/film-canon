import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import VizCard from '../layout/VizCard'
import GenrePanel, { panelFilms, decadeOfYear } from './GenrePanel'
import GenreFamilyToggle from './GenreFamilyToggle'
import { orderRows } from '../directors/rankedField'
import { shadeToward } from '../../utils/continents'
import { ALL_DECADES, decadeColumns } from '../../utils/decades'
import { TIER_COLORS } from '../../lib/rankTiers'
import { TOOLTIP_BOX, TOOLTIP_TITLE, TOOLTIP_SUBTITLE, TOOLTIP_VALUE, TOOLTIP_DETAIL, TOOLTIP_WIDTH } from '../../utils/tooltip'

const CELL_HEIGHT = 34
const ROW_GAP = 4
const LABEL_WIDTH = 150
const ROW_COLOR = TIER_COLORS[2]

/**
 * Genres × decades, the Countries page's "Films by Decade" heatmap with genre
 * rows. Same chrome and the same row-normalized shading, so each row shows
 * WHEN that genre's canon was made: Westerns peak in the 1950s, LGBTQ+ after
 * 1990, Avant-Garde in the 1960s and 2010s at once.
 *
 * Rows are every genre in the family, ordered by the active metric to match
 * the ranked chart above. The cell value is films or votes, following the
 * metric. Click a cell for that genre's films from that decade.
 *
 * Genres carry this matrix comfortably where directors could not (see the
 * decade-views note): the thinnest content genre spans five decades.
 */
export default function GenreDecadeHeatmap({ aggregates, metric = 'votes', selectedPoll, topTarget = null }) {
  const [family, setFamily] = useState('content')
  const [hoveredCell, setHoveredCell] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [selectedCell, setSelectedCell] = useState(null) // { genre, decade }
  const containerRef = useRef(null)
  const panelRef = useRef(null)

  const valueKey = metric === 'votes' ? 'votes' : 'films'

  const rows = useMemo(() => {
    const source = family === 'formats' ? aggregates?.formats : aggregates?.content
    return orderRows(source || [], valueKey).filter(r => r[valueKey] > 0)
  }, [aggregates, family, valueKey])

  // row -> decade -> value, plus each row's max for shading.
  const { matrix, decades, rowMax } = useMemo(() => {
    const m = {}
    const rMax = {}
    rows.forEach(r => {
      const cells = {}
      r.filmList.forEach(({ film, votes }) => {
        const d = decadeOfYear(film.Year)
        if (!d) return
        cells[d] = (cells[d] || 0) + (metric === 'votes' ? votes : 1)
      })
      m[r.name] = cells
      rMax[r.name] = Math.max(0, ...Object.values(cells))
    })
    const cols = decadeColumns(ALL_DECADES.filter(d => rows.some(r => (m[r.name][d] || 0) > 0)))
    return { matrix: m, decades: cols, rowMax: rMax }
  }, [rows, metric])

  const valueLabel = v => `${v.toLocaleString()} ${metric === 'votes' ? 'votes' : v === 1 ? 'film' : 'films'}`

  const handleCellHover = (e, genre, decade, value, max) => {
    setMousePos({ x: e.clientX, y: e.clientY })
    setHoveredCell({ genre, decade, value, isPeak: value > 0 && value === max })
  }

  const openPanel = useCallback((row, decade) => {
    if (selectedCell) return
    setHoveredCell(null)
    setSelectedCell({ genre: row.name, decade })
  }, [selectedCell])

  const selectedRow = useMemo(
    () => (selectedCell ? rows.find(r => r.name === selectedCell.genre) || null : null),
    [selectedCell, rows]
  )
  const selectedFilms = useMemo(
    () => (selectedRow ? panelFilms(selectedRow, selectedPoll, selectedCell.decade) : []),
    [selectedRow, selectedPoll, selectedCell]
  )

  useEffect(() => {
    if (selectedRow && panelRef.current) panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [selectedRow])

  // Filter changes leave the panel open; close only if the genre left the grid.
  useEffect(() => {
    if (selectedCell && !rows.some(r => r.name === selectedCell.genre)) setSelectedCell(null)
  }, [rows, selectedCell])

  const gridMinHeight = selectedRow
    ? `${Math.max(280, Math.min(230 + selectedFilms.length * 42, 448))}px`
    : undefined

  return (
    <VizCard
      title={family === 'formats' ? 'Formats by Decade' : 'Genres by Decade'}
      controls={<GenreFamilyToggle value={family} onChange={f => { setSelectedCell(null); setFamily(f) }} />}
    >
      {rows.length === 0 || decades.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 h-64 flex items-center justify-center text-center">
          <div className="text-gray-500 font-bold">No decade data for the current selection</div>
        </div>
      ) : (
        <div className="relative" style={gridMinHeight ? { minHeight: gridMinHeight } : undefined}>
          <div ref={containerRef} className="overflow-x-auto" onMouseLeave={() => setHoveredCell(null)}>
            <div className="flex min-w-max">
              {/* Y-axis: genre names */}
              <div className="shrink-0 flex flex-col border-r-2 border-black" style={{ width: LABEL_WIDTH }}>
                <div className="border-b border-gray-300" style={{ height: 24 }} />
                {rows.map(r => (
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
                  {rows.map(r => {
                    const max = rowMax[r.name]
                    return (
                      <div
                        key={r.name}
                        className="flex items-stretch border-b border-gray-200"
                        style={{ height: CELL_HEIGHT, marginBottom: ROW_GAP }}
                      >
                        {decades.map((decade, idx) => {
                          const value = matrix[r.name]?.[decade] || 0
                          const bg = value === 0 || max === 0 ? '#f3f4f6' : shadeToward(ROW_COLOR, value / max)
                          const isLast = idx === decades.length - 1
                          return (
                            <div
                              key={`${r.name}-${decade}`}
                              className={`flex-1 flex items-center justify-center ${value > 0 ? 'cursor-pointer' : 'cursor-default'} transition-all hover:ring-2 hover:ring-black hover:ring-inset border-t border-b border-gray-400 ${!isLast ? 'border-r border-r-gray-300' : 'border-r border-r-gray-400'} ${idx === 0 ? 'border-l border-l-gray-400' : ''}`}
                              style={{ backgroundColor: bg, minWidth: 44 }}
                              onMouseEnter={e => handleCellHover(e, r.name, decade, value, max)}
                              onMouseMove={e => handleCellHover(e, r.name, decade, value, max)}
                              onClick={() => value > 0 && openPanel(r, decade)}
                            >
                              {value > 0 && (
                                <span className={`text-xs font-bold ${value / max > 0.6 ? 'text-white' : 'text-black'}`}>
                                  {value.toLocaleString()}
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>

                {/* X-axis: decades */}
                <div className="border-t-2 border-black flex" style={{ height: 32 }}>
                  {decades.map(decade => (
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
            {!selectedRow && hoveredCell && hoveredCell.value > 0 && (() => {
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
                  <p className={TOOLTIP_TITLE}>{hoveredCell.genre}</p>
                  <p className={TOOLTIP_SUBTITLE}>{hoveredCell.decade}s</p>
                  <p className={TOOLTIP_VALUE}>{valueLabel(hoveredCell.value)}</p>
                  {hoveredCell.isPeak && (
                    <p className={`${TOOLTIP_DETAIL} font-bold`} style={{ color: ROW_COLOR }}>Peak decade</p>
                  )}
                </div>
              )
            })()}
          </div>

          {selectedRow && (
            <GenrePanel
              row={selectedRow}
              films={selectedFilms}
              metric={metric}
              selectedPoll={selectedPoll}
              topTarget={topTarget}
              subtitle={`${selectedCell.decade}s`}
              yearRange={{ start: Number(selectedCell.decade), end: Number(selectedCell.decade) + 9 }}
              onClose={() => setSelectedCell(null)}
              panelRef={panelRef}
            />
          )}
        </div>
      )}
    </VizCard>
  )
}
