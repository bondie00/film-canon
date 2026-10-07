import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { backdropUrl } from '../../utils/filmImages'
import { filmUrl } from '../../lib/routes'

// A random film from the whole record — every film with a vote is equally
// likely, so most draws come from the long tail. That's deliberate: beside the
// top-ten shelves it shows what the site has that the published lists don't.
//
// The pool is limited to films with a wide still (~98% of them), since the
// still is the card's whole top half and a poster fallback looks broken there.

const POLL_YEARS = [1952, 1962, 1972, 1982, 1992, 2002, 2012, 2022]

export default function RandomFilmCard({ films }) {
  const pool = useMemo(() => films?.filter(f => backdropUrl(f)) ?? [], [films])
  const [film, setFilm] = useState(null)

  const draw = useCallback(() => {
    if (pool.length) setFilm(pool[Math.floor(Math.random() * pool.length)])
  }, [pool])
  useEffect(() => { draw() }, [draw])

  if (!film) return null

  // No header or footer: the label and the draw button sit on the still, the
  // way Explore's tiles carry their rank badge.
  return (
    <div className="border-2 border-black bg-white">
      <Still film={film}>
        <span className="pointer-events-none absolute top-0 left-0 bg-black text-white text-[11px] font-black uppercase tracking-widest px-2 py-1">
          Random entry
        </span>
        <button
          onClick={draw}
          aria-label="Draw another film"
          title="Draw another"
          className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-white border-2 border-black text-black font-black hover:bg-black hover:text-white transition-colors"
        >
          ↻
        </button>
      </Still>
      <PollTable film={film} className="border-t-2 border-black" />
    </div>
  )
}

// children are overlays (label, button) — siblings of the link, not inside it.
function Still({ film, children }) {
  return (
    <div className="relative">
      <Link to={filmUrl(film.key)} className="group block relative aspect-[16/9] bg-black overflow-hidden">
        <img src={backdropUrl(film, { mubiWidth: 640 })} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-4 pt-10 text-white">
          <div className="text-lg font-black leading-tight group-hover:underline">{film.FilmTitle}</div>
          <div className="text-sm text-gray-200">{film.Year} · {film.directors?.join(', ')}</div>
        </div>
      </Link>
      {children}
    </div>
  )
}

// All eight polls as columns: year, rank, votes. Polls it missed stay visible, dotted.
function PollTable({ film, className = '' }) {
  return (
    <div className={`grid grid-cols-8 divide-x divide-gray-200 text-center tabular-nums ${className}`}>
      {POLL_YEARS.map(year => {
        const p = film.pollHistory.find(x => x.year === year)
        const appeared = p && p.votes > 0
        return (
          <div key={year} className={`py-1.5 ${appeared ? 'bg-white' : 'bg-gray-50'}`}>
            <div className={`text-[10px] font-bold ${appeared ? 'text-gray-500' : 'text-gray-300'}`}>
              '{String(year).slice(2)}
            </div>
            <div className={`text-sm font-black leading-tight ${appeared ? 'text-black' : 'text-gray-300'}`}>
              {appeared ? `#${p.rank}` : '·'}
            </div>
            <div className="text-[10px] text-gray-500 h-3.5">{appeared ? `${p.votes}v` : ''}</div>
          </div>
        )
      })}
    </div>
  )
}
