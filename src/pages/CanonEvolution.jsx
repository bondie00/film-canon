import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'

const POLL_YEARS = [1952, 1962, 1972, 1982, 1992, 2002, 2012, 2022]
// Transitions we can show movement for — every poll except the first (1952 has no predecessor).
const TRANSITION_POLLS = POLL_YEARS.slice(1)

// A film must sit in the top 100 in BOTH polls to count as a "mover" — movement
// within the canon, not arrivals/departures.
const MOVER_CEILING = 100
const MOVERS_SHOWN = 8

export default function CanonEvolution() {
  const [films, setFilms] = useState(null)
  const [loading, setLoading] = useState(true)

  const [searchParams] = useSearchParams()
  const [activePoll, setActivePoll] = useState(() => {
    const p = parseInt(searchParams.get('poll'), 10)
    return TRANSITION_POLLS.includes(p) ? p : 2022
  })

  useEffect(() => {
    fetch('/data/films.json')
      .then(r => r.json())
      .then(data => {
        setFilms(data)
        setLoading(false)
      })
  }, [])

  // Biggest climbers & fallers between the active poll and the one before it.
  const movers = useMemo(() => {
    const idx = POLL_YEARS.indexOf(activePoll)
    if (!films || idx <= 0) return null
    const prevPoll = POLL_YEARS[idx - 1]

    const rows = []
    films.forEach(f => {
      const cur = f.pollHistory.find(p => p.year === activePoll)
      const prev = f.pollHistory.find(p => p.year === prevPoll)
      if (!cur || !prev || cur.rank == null || prev.rank == null) return
      if (cur.rank > MOVER_CEILING || prev.rank > MOVER_CEILING) return
      const delta = prev.rank - cur.rank   // positive = moved up the list
      if (delta === 0) return
      rows.push({ film: f, prevRank: prev.rank, curRank: cur.rank, delta })
    })

    return {
      prevPoll,
      climbers: rows.filter(r => r.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, MOVERS_SHOWN),
      fallers: rows.filter(r => r.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, MOVERS_SHOWN),
    }
  }, [films, activePoll])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-black font-medium">Loading the canon…</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-6xl font-black text-black mb-2 uppercase tracking-tight">
          Canon Evolution
        </h1>
        <p className="text-gray-600 mb-6 max-w-2xl">
          How the top 100 shifts from one poll to the next — which films surge, which slip. Pick a poll to see the movement into it from the poll before.
        </p>

        <TransitionPicker activePoll={activePoll} onChange={setActivePoll} />

        {movers && (
          <section className="mt-8">
            <div className="mb-4 border-b-2 border-black pb-2">
              <div className="text-xs font-bold uppercase tracking-widest text-gray-500">
                {movers.prevPoll} → {activePoll} · movement within the top 100
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight">Biggest Movers</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <MoversColumn title="Climbers" caption="▲ moved up" dir="up" rows={movers.climbers} />
              <MoversColumn title="Fallers" caption="▼ moved down" dir="down" rows={movers.fallers} />
            </div>
          </section>
        )}
      </div>
      <Footer />
    </div>
  )
}

function TransitionPicker({ activePoll, onChange }) {
  return (
    <div className="border-2 border-black bg-white p-4">
      <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
        Movement into…
      </div>
      <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
        {TRANSITION_POLLS.map(year => {
          const active = year === activePoll
          return (
            <button
              key={year}
              onClick={() => onChange(year)}
              className={`py-4 font-black text-xl border-2 border-black transition-colors ${
                active ? 'bg-black text-white' : 'bg-white text-black hover:bg-black hover:text-white'
              }`}
            >
              {year}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function MoversColumn({ title, caption, dir, rows }) {
  return (
    <div className="border-2 border-black bg-white">
      <div className="flex items-center justify-between px-4 py-2 bg-black text-white">
        <span className="font-black uppercase tracking-wide text-sm">{title}</span>
        <span className="text-xs font-bold tracking-wide">{caption}</span>
      </div>
      {rows.length > 0 ? (
        rows.map(row => <MoverRow key={row.film.key} row={row} dir={dir} />)
      ) : (
        <div className="px-4 py-6 text-sm text-gray-500 text-center">No {title.toLowerCase()} this poll.</div>
      )}
    </div>
  )
}

function MoverRow({ row, dir }) {
  const up = dir === 'up'
  return (
    <div className="flex items-center gap-3 px-4 py-2 border-t border-gray-200 first:border-t-0">
      <div className={`w-12 flex-shrink-0 text-right font-black tabular-nums ${up ? 'text-green-600' : 'text-red-600'}`}>
        {up ? '▲' : '▼'}{Math.abs(row.delta)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm truncate">{row.film.FilmTitle}</div>
        <div className="text-xs text-gray-500 truncate">
          <span className="tabular-nums">#{row.prevRank} → #{row.curRank}</span> · {row.film.Year} · {row.film.directors[0]}
        </div>
      </div>
    </div>
  )
}
