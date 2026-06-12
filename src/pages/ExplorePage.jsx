import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import Header from '../components/Header'
import Footer from '../components/Footer'

const POLL_YEARS = [1952, 1962, 1972, 1982, 1992, 2002, 2012, 2022]
const HERO_COUNT = 25
const GRID_COUNT = 75
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
        if (a.currentRank !== b.currentRank) return a.currentRank - b.currentRank
        return b.currentVotes - a.currentVotes
      })
  }, [films, activePoll])

  const heroFilms = rankedFilms.slice(0, HERO_COUNT)
  const gridFilms = rankedFilms.slice(HERO_COUNT, HERO_COUNT + GRID_COUNT)
  const tailStart = HERO_COUNT + GRID_COUNT
  const longTailFilms = rankedFilms.slice(tailStart, tailStart + longTailVisible)
  const longTailTotal = Math.max(0, rankedFilms.length - tailStart)
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
          <section className="mt-10">
            <SectionHeading
              eyebrow={`Ranks 1–${Math.min(HERO_COUNT, heroFilms.length)}`}
              title="The Top of the Canon"
            />
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {heroFilms.map(film => (
                  <HeroCard key={film.key} film={film} />
                ))}
              </AnimatePresence>
            </div>
          </section>

          {gridFilms.length > 0 && (
            <section className="mt-12">
              <SectionHeading
                eyebrow={`Ranks ${HERO_COUNT + 1}–${Math.min(HERO_COUNT + GRID_COUNT, rankedFilms.length)}`}
                title="The Canon's Body"
              />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <AnimatePresence mode="popLayout">
                  {gridFilms.map(film => (
                    <GridTile key={film.key} film={film} />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}
        </LayoutGroup>

        {longTailFilms.length > 0 && (
          <section className="mt-12">
            <SectionHeading
              eyebrow={`Ranks ${tailStart + 1}–${tailStart + longTailFilms.length} of ${rankedFilms.length}`}
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

const SPRING = { type: 'spring', stiffness: 220, damping: 28 }

function HeroCard({ film }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={SPRING}
      className="bg-white border-2 border-black p-4 flex items-center gap-4"
    >
      <div className="flex-shrink-0 w-14 text-center">
        <div className="text-4xl font-black leading-none">{film.currentRank}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xl font-bold truncate">{film.FilmTitle}</div>
        <div className="text-sm text-gray-600 truncate">
          {film.directors.join(', ')} · {film.Year}
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        <div className="text-2xl font-black leading-none">{film.currentVotes}</div>
        <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">votes</div>
      </div>
    </motion.div>
  )
}

function GridTile({ film }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={SPRING}
      className="bg-white border-2 border-black p-3"
    >
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-sm font-black">#{film.currentRank}</span>
        <span className="text-xs font-bold text-gray-500">{film.currentVotes} {film.currentVotes === 1 ? 'vote' : 'votes'}</span>
      </div>
      <div className="font-bold text-sm leading-tight line-clamp-2 mb-1 min-h-[2.5rem]">{film.FilmTitle}</div>
      <div className="text-xs text-gray-600 truncate">
        {film.Year} · {film.directors[0]}
      </div>
    </motion.div>
  )
}

function LongTailRow({ film }) {
  return (
    <div className="flex items-center gap-4 px-4 py-2 hover:bg-gray-50 text-sm">
      <div className="w-14 font-bold text-gray-500 flex-shrink-0">#{film.currentRank}</div>
      <div className="flex-1 min-w-0 truncate">
        <span className="font-bold">{film.FilmTitle}</span>
        <span className="text-gray-500"> ({film.Year}) · {film.directors[0]}</span>
      </div>
      <div className="text-gray-500 font-medium flex-shrink-0">{film.currentVotes} {film.currentVotes === 1 ? 'vote' : 'votes'}</div>
    </div>
  )
}
