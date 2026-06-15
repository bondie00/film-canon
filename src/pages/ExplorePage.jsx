import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { landscapeImage } from '../utils/filmImages'

const POLL_YEARS = [1952, 1962, 1972, 1982, 1992, 2002, 2012, 2022]
const GRID_RANK_MAX = 100   // films ranked 1–100 get square cards; the rest fall to the long tail
const LONG_TAIL_PAGE = 100

export default function ExplorePage() {
  const [films, setFilms] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activePoll, setActivePoll] = useState(2022)
  const [longTailVisible, setLongTailVisible] = useState(LONG_TAIL_PAGE)

  useEffect(() => {
    fetch('/data/films.json')
      .then(r => r.json())
      .then(data => {
        setFilms(data)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    setLongTailVisible(LONG_TAIL_PAGE)
  }, [activePoll])

  const rankedFilms = useMemo(() => {
    if (!films) return []
    return films
      .map(f => {
        const poll = f.pollHistory.find(p => p.year === activePoll)
        if (!poll || !poll.votes) return null
        return { ...f, currentRank: poll.rank, currentVotes: poll.votes }
      })
      .filter(Boolean)
      .sort((a, b) => {
        // Null ranks (voted but unranked) sort to the very bottom.
        const ra = a.currentRank ?? Infinity
        const rb = b.currentRank ?? Infinity
        if (ra !== rb) return ra - rb
        return b.currentVotes - a.currentVotes
      })
  }, [films, activePoll])

  // Split by rank VALUE, not list position — so tied films never straddle the
  // boundary. Small early polls (e.g. 1962, max rank 77) get no long tail at all.
  const inGrid = (f) => f.currentRank != null && f.currentRank <= GRID_RANK_MAX
  const gridFilms = rankedFilms.filter(inGrid)
  const tailFilms = rankedFilms.filter(f => !inGrid(f))
  const longTailFilms = tailFilms.slice(0, longTailVisible)
  const longTailTotal = tailFilms.length
  const longTailRemaining = Math.max(0, longTailTotal - longTailVisible)

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
          Explore the Polls
        </h1>
        <p className="text-gray-600 mb-6 max-w-2xl">
          Seventy years of Sight &amp; Sound's greatest. Pick a poll year to see the canon as it stood — every film, every vote, watched moving between the polls.
        </p>

        <PollTimeline
          activePoll={activePoll}
          onChange={setActivePoll}
          totalCount={rankedFilms.length}
        />

        <LayoutGroup>
          {gridFilms.length > 0 && (
            <section className="mt-10">
              <SectionHeading
                eyebrow={`Ranks 1–${GRID_RANK_MAX} · ${gridFilms.length} films`}
                title="The Canon"
              />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <AnimatePresence mode="popLayout">
                  {gridFilms.map(film => (
                    <GridTile key={film.key} film={film} activePoll={activePoll} />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}
        </LayoutGroup>

        {longTailFilms.length > 0 && (
          <section className="mt-12">
            <SectionHeading
              eyebrow={`Beyond rank ${GRID_RANK_MAX} · showing ${longTailFilms.length.toLocaleString()} of ${longTailTotal.toLocaleString()}`}
              title="The Long Tail"
            />
            <div className="divide-y divide-gray-200 border-2 border-black bg-white">
              {longTailFilms.map(film => (
                <LongTailRow key={film.key} film={film} />
              ))}
            </div>
            {longTailRemaining > 0 && (
              <button
                onClick={() => setLongTailVisible(v => v + LONG_TAIL_PAGE)}
                className="mt-4 w-full py-3 bg-white border-2 border-black font-bold uppercase tracking-wide text-sm hover:bg-black hover:text-white transition-colors"
              >
                Show {Math.min(LONG_TAIL_PAGE, longTailRemaining)} more · {longTailRemaining.toLocaleString()} remaining
              </button>
            )}
          </section>
        )}
      </div>
      <Footer />
    </div>
  )
}

function PollTimeline({ activePoll, onChange, totalCount }) {
  return (
    <div className="border-2 border-black bg-white p-4">
      <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
        Choose a poll
      </div>
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
        {POLL_YEARS.map(year => {
          const active = year === activePoll
          return (
            <button
              key={year}
              onClick={() => onChange(year)}
              className={`py-4 font-black text-xl border-2 border-black transition-colors ${
                active
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-black hover:text-white'
              }`}
            >
              {year}
            </button>
          )
        })}
      </div>
      <div className="mt-3 text-sm text-gray-500">
        <span className="font-bold text-black">{totalCount.toLocaleString()}</span> films received at least one vote in the <span className="font-bold text-black">{activePoll}</span> poll.
      </div>
    </div>
  )
}

function SectionHeading({ eyebrow, title }) {
  return (
    <div className="mb-4 border-b-2 border-black pb-2">
      <div className="text-xs font-bold uppercase tracking-widest text-gray-500">{eyebrow}</div>
      <h2 className="text-2xl font-black uppercase tracking-tight">{title}</h2>
    </div>
  )
}

const SPRING = { type: 'spring', stiffness: 90, damping: 22 }

function PollRankStrip({ film, activePoll }) {
  return (
    <div className="flex border-b-2 border-black divide-x divide-gray-200 flex-shrink-0">
      {POLL_YEARS.map(year => {
        const poll = film.pollHistory.find(p => p.year === year)
        const appeared = poll && poll.votes > 0
        const isActive = year === activePoll
        const tip = appeared
          ? `${year}: rank #${poll.rank} · ${poll.votes} ${poll.votes === 1 ? 'vote' : 'votes'}`
          : `${year}: no votes`
        return (
          <div
            key={year}
            title={tip}
            className={`flex-1 py-1 text-center text-[9px] leading-none font-bold tabular-nums tracking-tighter ${
              isActive
                ? 'bg-black text-white'
                : appeared
                  ? 'bg-white text-black'
                  : 'bg-gray-50 text-gray-300'
            }`}
          >
            {appeared ? poll.rank : '·'}
          </div>
        )
      })}
    </div>
  )
}

function GridTile({ film, activePoll }) {
  const img = landscapeImage(film, { backdropSize: 'w780', posterSize: 'w342' })

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={SPRING}
      className="bg-white border-2 border-black flex flex-col aspect-square overflow-hidden"
    >
      {/* 16:9 image band — uncropped backdrop (poster fallback is blurred-cover so it fills without distortion) */}
      <div className="relative w-full aspect-video bg-black flex-shrink-0 overflow-hidden">
        {img.url ? (
          img.kind === 'backdrop' ? (
            <img
              src={img.url}
              alt={film.FilmTitle}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            // Poster in a wide slot: blurred fill behind a contained poster, so nothing is cropped or stretched.
            <>
              <img src={img.url} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover scale-110 blur-lg opacity-60" />
              <img src={img.url} alt={film.FilmTitle} loading="lazy" className="absolute inset-0 w-full h-full object-contain" />
            </>
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center px-2 text-center text-white/70 text-xs font-bold uppercase tracking-wide">
            {film.FilmTitle}
          </div>
        )}
        {/* Rank badge */}
        <span className="absolute top-0 left-0 bg-black text-white text-sm font-black px-2 py-1">
          #{film.currentRank}
        </span>
      </div>

      {/* Rank across all eight polls (1952 → 2022); active poll highlighted */}
      <PollRankStrip film={film} activePoll={activePoll} />

      {/* Metadata fills the remainder so the tile reads as a square */}
      <div className="flex flex-col flex-1 min-h-0 p-3">
        <div className="font-bold text-sm leading-tight line-clamp-2">{film.FilmTitle}</div>
        <div className="text-xs text-gray-600 truncate mt-1">
          {film.Year} · {film.directors[0]}
        </div>
        <div className="mt-auto pt-1 text-xs font-bold text-gray-500">
          {film.currentVotes} {film.currentVotes === 1 ? 'vote' : 'votes'}
        </div>
      </div>
    </motion.div>
  )
}

function LongTailRow({ film }) {
  return (
    <div className="flex items-center gap-4 px-4 py-2 hover:bg-gray-50 text-sm">
      <div className="w-14 font-bold text-gray-500 flex-shrink-0">{film.currentRank != null ? `#${film.currentRank}` : 'NR'}</div>
      <div className="flex-1 min-w-0 truncate">
        <span className="font-bold">{film.FilmTitle}</span>
        <span className="text-gray-500"> ({film.Year}) · {film.directors[0]}</span>
      </div>
      <div className="text-gray-500 font-medium flex-shrink-0">{film.currentVotes} {film.currentVotes === 1 ? 'vote' : 'votes'}</div>
    </div>
  )
}
