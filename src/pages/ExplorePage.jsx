import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { landscapeImage } from '../utils/filmImages'

const POLL_YEARS = [1952, 1962, 1972, 1982, 1992, 2002, 2012, 2022]
const GRID_RANK_MAX = 100   // films ranked 1–100 get square cards; everything below hands off to the database
const MOVE_RANK_MAX = 50    // only the top 50 slide to their new slot on a poll change; ranks 51–100 crossfade instead (keeps the layout reflow cheap)

// Voter counts per poll aren't in films.json — they're historical facts from the
// Sight & Sound record (see CLAUDE.md). Used for the "votes per voter" ballot-length stat.
const POLL_VOTERS = {
  1952: 47,
  1962: 45,
  1972: 81,
  1982: 122,
  1992: 130,
  2002: 145,
  2012: 846,
  2022: 1635,
}

export default function ExplorePage() {
  const [films, setFilms] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activePoll, setActivePoll] = useState(2022)
  // Animate the reflow only when the user lands on a poll and pauses; snap when
  // they're clicking through quickly (avoids overlapping animations).
  const [animateReflow, setAnimateReflow] = useState(true)
  const lastPollChangeRef = useRef(0)

  const handlePollChange = (year) => {
    if (year === activePoll) return
    const now = performance.now()
    setAnimateReflow(now - lastPollChangeRef.current >= RAPID_MS)
    lastPollChangeRef.current = now
    setActivePoll(year)
  }

  useEffect(() => {
    fetch('/data/films.json')
      .then(r => r.json())
      .then(data => {
        setFilms(data)
        setLoading(false)
      })
  }, [])

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

  // Split by rank VALUE, not list position — so tied films never straddle the boundary.
  const inGrid = (f) => f.currentRank != null && f.currentRank <= GRID_RANK_MAX
  const gridFilms = rankedFilms.filter(inGrid)
  const beyondCount = rankedFilms.length - gridFilms.length

  // Headline numbers for the active poll — recomputed as the poll changes.
  const vitalStats = useMemo(() => {
    if (!rankedFilms.length) return null
    const voters = POLL_VOTERS[activePoll] ?? null

    // Distinct countries among films that received votes this poll
    const countrySet = new Set()
    rankedFilms.forEach(f => {
      f.countries?.forEach(c => {
        const name = c && c.trim()
        if (name) countrySet.add(name)
      })
    })

    // Median production year (Year may be a range like "1960-1964" → parseInt takes the start)
    const years = rankedFilms
      .map(f => parseInt(f.Year, 10))
      .filter(y => !Number.isNaN(y))
      .sort((a, b) => a - b)
    let medianYear = null
    if (years.length) {
      const mid = Math.floor(years.length / 2)
      medianYear = years.length % 2
        ? years[mid]
        : Math.round((years[mid - 1] + years[mid]) / 2)
    }

    return {
      voters,
      filmsWithVotes: rankedFilms.length,
      countries: countrySet.size,
      medianYear,
      medianAge: medianYear != null ? activePoll - medianYear : null,
    }
  }, [rankedFilms, activePoll])

  // Is there a prior poll to compare against? (1952 is the first, so no.)
  const hasPriorPoll = POLL_YEARS.indexOf(activePoll) > 0

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
          onChange={handlePollChange}
          totalCount={rankedFilms.length}
        />

        {vitalStats && <VitalStatsStrip stats={vitalStats} activePoll={activePoll} />}

        <LayoutGroup>
          {gridFilms.length > 0 && (
            <section className="mt-10">
              <SectionHeading
                eyebrow={`Ranks 1–${GRID_RANK_MAX} · ${gridFilms.length} films`}
                title="The Canon"
              />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <AnimatePresence mode="popLayout">
                  {gridFilms.map(film => {
                    const isMover = film.currentRank <= MOVE_RANK_MAX
                    // Movers keep a stable key so Framer slides them. Non-movers
                    // key on their rank too, so a position change remounts them
                    // → AnimatePresence crossfades (fade out, fade in at new spot).
                    return (
                      <GridTile
                        key={isMover ? film.key : `${film.key}@${film.currentRank}`}
                        film={film}
                        activePoll={activePoll}
                        animateMove={isMover}
                        transition={animateReflow ? MOVE : SNAP}
                      />
                    )
                  })}
                </AnimatePresence>
              </div>
            </section>
          )}
        </LayoutGroup>

        {hasPriorPoll && (
          <Link
            to={`/visualizations/evolution?poll=${activePoll}`}
            className="mt-8 flex items-center justify-between gap-4 border-2 border-black bg-white px-5 py-4 hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-bold text-black">
              How the canon shifted into {activePoll} — biggest climbers &amp; fallers
            </span>
            <span className="text-sm font-bold uppercase tracking-wide whitespace-nowrap">See Canon Evolution →</span>
          </Link>
        )}

        {beyondCount > 0 && (
          <section className="mt-12">
            <div className="border-2 border-black bg-white p-6 md:flex md:items-center md:justify-between gap-6">
              <div className="mb-4 md:mb-0">
                <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">
                  Beyond the top {GRID_RANK_MAX}
                </div>
                <p className="text-lg font-bold text-black leading-tight">
                  {beyondCount.toLocaleString()} more films received votes in {activePoll}.
                </p>
                <p className="text-sm text-gray-600 mt-1 max-w-xl">
                  The full record — every film, filterable by country, director, and year — lives in the database.
                </p>
              </div>
              <Link
                to={`/search?poll=${activePoll}`}
                className="inline-block flex-shrink-0 px-6 py-3 bg-black text-white font-bold uppercase tracking-wide text-sm hover:bg-gray-800 transition-colors whitespace-nowrap"
              >
                Explore the full record →
              </Link>
            </div>
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

// Position-only tween — cheaper than a spring FLIP when ~100 tiles reflow at
// once on a poll change. Duration is set long enough to comfortably watch the
// tiles travel to their new ranks.
const MOVE = { type: 'tween', duration: 0.7, ease: 'easeInOut' }
// Instant transition used when the user is rapidly stepping through polls, so
// animations don't pile up on top of each other and choke the main thread.
const SNAP = { duration: 0 }
// Poll changes closer together than this are treated as "rapid" → snap instead
// of animate. Slightly longer than MOVE so a change only animates once the
// previous slide has finished.
const RAPID_MS = 800

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

function GridTile({ film, activePoll, animateMove, transition }) {
  // Tiles display at ~300px wide, so request the small MUBI still (w320) and a
  // small TMDB backdrop — far cheaper to composite while all tiles reflow at once.
  const img = landscapeImage(film, { mubiWidth: 320, tmdbBackdropSize: 'w300', posterSize: 'w342' })

  // Movers slide (layout FLIP) and get promoted to their own compositor layer.
  // Non-movers skip layout entirely — they just crossfade via opacity — so the
  // per-frame reflow cost is paid on the top 50 tiles only.
  const moverProps = animateMove
    ? {
        layout: 'position',
        // Only re-measure on poll change, not on every render (e.g. hover).
        layoutDependency: activePoll,
        style: { willChange: 'transform', backfaceVisibility: 'hidden' },
      }
    : {}

  return (
    <motion.div
      {...moverProps}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={transition}
      className="bg-white border-2 border-black flex flex-col aspect-square overflow-hidden hover:shadow-lg transition-shadow"
    >
      <Link to={`/film/${film.key}`} className="flex flex-col h-full min-h-0">
      {/* 16:9 image band — uncropped backdrop (poster fallback is blurred-cover so it fills without distortion) */}
      <div className="relative w-full aspect-video bg-black flex-shrink-0 overflow-hidden">
        {img.url ? (
          img.kind === 'backdrop' ? (
            <img
              src={img.url}
              alt={film.FilmTitle}
              loading="lazy"
              decoding="async"
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
      </Link>
    </motion.div>
  )
}

function VitalStatsStrip({ stats, activePoll }) {
  const { filmsWithVotes, voters, countries, medianYear, medianAge } = stats
  const cells = [
    { label: 'Voters', value: voters != null ? voters.toLocaleString() : '—' },
    { label: 'Films with votes', value: filmsWithVotes.toLocaleString() },
    {
      label: 'Countries represented',
      value: countries.toLocaleString(),
      href: `/visualizations/country?poll=${activePoll}`,
      cue: 'See the map →',
    },
    {
      label: 'Median film year',
      value: medianYear != null ? medianYear : '—',
      sub: medianAge != null ? `${medianAge} yrs old in ${activePoll}` : null,
      href: `/visualizations/decades?poll=${activePoll}`,
      cue: 'See decades →',
    },
  ]

  return (
    <div className="mt-4 border-2 border-black bg-white">
      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-gray-200">
        {cells.map(cell => {
          const inner = (
            <>
              <div className="text-3xl font-black tabular-nums leading-none">{cell.value}</div>
              {cell.sub && (
                <div className="mt-1 text-[11px] font-medium text-gray-500 tabular-nums">{cell.sub}</div>
              )}
              <div className="mt-1 text-xs font-bold uppercase tracking-widest text-gray-500">{cell.label}</div>
              {cell.cue && (
                <div className="mt-2 text-[11px] font-bold uppercase tracking-wide text-black">{cell.cue}</div>
              )}
            </>
          )
          return cell.href ? (
            <Link key={cell.label} to={cell.href} className="block p-4 group hover:bg-gray-50 transition-colors">
              {inner}
            </Link>
          ) : (
            <div key={cell.label} className="p-4">{inner}</div>
          )
        })}
      </div>
    </div>
  )
}
