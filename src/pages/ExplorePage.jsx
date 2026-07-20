import { useState, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import Header from '../components/Header'
import Footer from '../components/Footer'
import FilterPanel from '../components/search/FilterPanel'
import FilmCard from '../components/search/FilmCard'
import Pagination from '../components/search/Pagination'
import { useFilmQuery, POLL_YEARS } from '../hooks/useFilmQuery'
import { landscapeImage } from '../utils/filmImages'

const GRID_RANK_MAX = 100   // canon mode shows ranks 1–100; the rest hands off to List view
const MOVE_RANK_MAX = 50    // only the top 50 slide to their new slot on a poll change; ranks 51–100 crossfade
const GALLERY_PER_PAGE = 60 // poster tiles per page when Gallery is in query (filtered/all-polls) mode
const LIST_PER_PAGE = 20    // rows per page in List view

// Voter counts per poll aren't in films.json — historical facts from the
// Sight & Sound record (see CLAUDE.md). Used for the "voters" vital stat.
const POLL_VOTERS = {
  1952: 47, 1962: 45, 1972: 81, 1982: 122,
  1992: 130, 2002: 145, 2012: 846, 2022: 1635,
}

// Attach the active poll's rank/votes to a film for tile rendering.
// For 'all', we show a votes badge (an aggregate rank like #2373 is meaningless on a poster).
function withCurrent(film, poll) {
  const key = poll === 'all' ? 'all' : parseInt(poll, 10)
  const p = film.pollHistory.find(x => x.year === key) || { rank: null, votes: 0 }
  return { ...film, currentRank: poll === 'all' ? null : (p.rank ?? null), currentVotes: p.votes }
}

export default function ExplorePage() {
  const q = useFilmQuery()
  const {
    loading, error, poll, view, filters, hasActiveFilters, sortBy, page,
    countriesData, filmCounts, titleOptions, directorOptions,
    beforeCountry, sorted, setParam, onFilterChange, clearFilters,
  } = q

  // Animate the reflow only when the user lands on a poll and pauses; snap when
  // they're clicking through quickly (avoids overlapping animations).
  const [animateReflow, setAnimateReflow] = useState(true)
  const lastPollChangeRef = useRef(0)
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const resultsRef = useRef(null)

  const handlePollChange = (value) => {
    if (value === poll) return
    const now = performance.now()
    setAnimateReflow(now - lastPollChangeRef.current >= RAPID_MS)
    lastPollChangeRef.current = now
    setParam({ poll: value })
  }

  const handlePageChange = (p) => {
    setParam({ page: String(p) })
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Canon mode: the signature animated top-100 experience. Only makes sense for a
  // single poll, ordered by rank, with no filters carving holes in the ranking.
  const isCanon = view === 'gallery' && poll !== 'all' && !hasActiveFilters && sortBy === 'votes'

  // Canon mode data — all films with votes this poll, rank order, top 100 to the grid.
  const canon = useMemo(() => {
    if (!isCanon) return null
    const ranked = sorted.map(f => withCurrent(f, poll))
    const grid = ranked.filter(f => f.currentRank != null && f.currentRank <= GRID_RANK_MAX)
    return { ranked, grid, beyondCount: ranked.length - grid.length }
  }, [isCanon, sorted, poll])

  // Query mode data — the same result set, paginated, drawn as tiles or rows.
  const perPage = view === 'gallery' ? GALLERY_PER_PAGE : LIST_PER_PAGE
  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage))
  const clampedPage = Math.min(page, totalPages)
  const pageFilms = useMemo(
    () => sorted.slice((clampedPage - 1) * perPage, clampedPage * perPage),
    [sorted, clampedPage, perPage]
  )

  // Headline numbers for canon mode.
  const vitalStats = useMemo(() => {
    if (!canon) return null
    const ranked = canon.ranked
    if (!ranked.length) return null
    const countrySet = new Set()
    ranked.forEach(f => f.countries?.forEach(c => {
      const name = c && c.trim()
      if (name) countrySet.add(name)
    }))
    const years = ranked.map(f => parseInt(f.Year, 10)).filter(y => !Number.isNaN(y)).sort((a, b) => a - b)
    let medianYear = null
    if (years.length) {
      const mid = Math.floor(years.length / 2)
      medianYear = years.length % 2 ? years[mid] : Math.round((years[mid - 1] + years[mid]) / 2)
    }
    const activeYear = parseInt(poll, 10)
    return {
      voters: POLL_VOTERS[activeYear] ?? null,
      filmsWithVotes: ranked.length,
      countries: countrySet.size,
      medianYear,
      medianAge: medianYear != null ? activeYear - medianYear : null,
    }
  }, [canon, poll])

  const hasPriorPoll = poll !== 'all' && POLL_YEARS.indexOf(parseInt(poll, 10)) > 0

  const filterPanelProps = {
    filters,
    onFilterChange,
    onClear: clearFilters,
    countriesData,
    activePoll: poll,
    onPollChange: handlePollChange,
    filmCounts,
    titleOptions,
    directorOptions,
    filmsForCountryCounts: beforeCountry,
    showPoll: false,
  }

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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-20">
            <p className="text-red-600 font-bold">{error}</p>
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
          Seventy years of Sight &amp; Sound's greatest. Pick a poll to see the canon as it
          stood — browse the top films as a gallery, or filter the full record as a list.
        </p>

        <PollTimeline activePoll={poll} onChange={handlePollChange} counts={filmCounts} />

        <div className="mt-6 grid grid-cols-12 gap-8">
          {/* FILTER SIDEBAR (desktop) */}
          <aside className="hidden lg:block col-span-3">
            <FilterPanel {...filterPanelProps} />
          </aside>

          {/* MAIN */}
          <div className="col-span-12 lg:col-span-9" ref={resultsRef}>
            {/* Toolbar: mobile filter toggle + result summary + view toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <button
                onClick={() => setShowMobileFilters(v => !v)}
                className="lg:hidden py-2.5 px-4 bg-white text-black font-bold uppercase tracking-wide text-sm border-2 border-black hover:bg-black hover:text-white transition-colors"
              >
                {showMobileFilters ? 'Hide Filters ▲' : 'Show Filters ▼'}
              </button>
              <QueryMeta
                isCanon={isCanon}
                total={isCanon ? canon.grid.length : sorted.length}
                poll={poll}
                filters={filters}
              />
              <ViewToggle view={view} onChange={(v) => setParam({ view: v })} />
            </div>

            {/* MOBILE FILTER PANEL */}
            {showMobileFilters && (
              <div className="lg:hidden mb-6">
                <FilterPanel {...filterPanelProps} />
              </div>
            )}

            {/* ---- CANON GALLERY (animated top 100) ---- */}
            {isCanon && (
              <>
                <LayoutGroup>
                  {canon.grid.length > 0 && (
                    <section>
                      <SectionHeading
                        eyebrow={`Ranks 1–${GRID_RANK_MAX} · ${canon.grid.length} films`}
                        title="The Canon"
                      />
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <AnimatePresence mode="popLayout">
                          {canon.grid.map(film => {
                            const isMover = film.currentRank <= MOVE_RANK_MAX
                            return (
                              <GridTile
                                key={isMover ? film.key : `${film.key}@${film.currentRank}`}
                                film={film}
                                activePoll={poll}
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

                {vitalStats && <VitalStatsStrip stats={vitalStats} activePoll={poll} />}

                {hasPriorPoll && (
                  <Link
                    to={`/visualizations/evolution?poll=${poll}`}
                    className="mt-8 flex items-center justify-between gap-4 border-2 border-black bg-white px-5 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm font-bold text-black">
                      How the canon shifted into {poll} — biggest climbers &amp; fallers
                    </span>
                    <span className="text-sm font-bold uppercase tracking-wide whitespace-nowrap">See Canon Evolution →</span>
                  </Link>
                )}

                {canon.beyondCount > 0 && (
                  <section className="mt-12">
                    <div className="border-2 border-black bg-white p-6 md:flex md:items-center md:justify-between gap-6">
                      <div className="mb-4 md:mb-0">
                        <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">
                          Beyond the top {GRID_RANK_MAX}
                        </div>
                        <p className="text-lg font-bold text-black leading-tight">
                          {canon.beyondCount.toLocaleString()} more films received votes in {poll}.
                        </p>
                        <p className="text-sm text-gray-600 mt-1 max-w-xl">
                          Switch to the list to see the full record — every film, filterable by country, director, and year.
                        </p>
                      </div>
                      <button
                        onClick={() => setParam({ view: 'list' })}
                        className="inline-block flex-shrink-0 px-6 py-3 bg-black text-white font-bold uppercase tracking-wide text-sm hover:bg-gray-800 transition-colors whitespace-nowrap"
                      >
                        See the full record →
                      </button>
                    </div>
                  </section>
                )}
              </>
            )}

            {/* ---- QUERY GALLERY (filtered / all-polls poster grid) ---- */}
            {!isCanon && view === 'gallery' && (
              pageFilms.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {pageFilms.map(f => {
                      const film = withCurrent(f, poll)
                      return <GridTile key={film.key} film={film} activePoll={poll} animateMove={false} transition={SNAP} />
                    })}
                  </div>
                  <div className="mt-6">
                    <Pagination currentPage={clampedPage} totalPages={totalPages} onPageChange={handlePageChange} />
                  </div>
                </>
              ) : (
                <EmptyState onClear={clearFilters} />
              )
            )}

            {/* ---- LIST VIEW ---- */}
            {view === 'list' && (
              pageFilms.length > 0 ? (
                <>
                  {totalPages > 1 && (
                    <div className="mb-4">
                      <Pagination currentPage={clampedPage} totalPages={totalPages} onPageChange={handlePageChange} />
                    </div>
                  )}
                  <div className="space-y-2">
                    {pageFilms.map(film => (
                      <FilmCard key={film.key} film={film} activePoll={poll} />
                    ))}
                  </div>
                  <div className="mt-6">
                    <Pagination currentPage={clampedPage} totalPages={totalPages} onPageChange={handlePageChange} />
                  </div>
                </>
              ) : (
                <EmptyState onClear={clearFilters} />
              )
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

/* ------------------------------ sub-components ------------------------------ */

function ViewToggle({ view, onChange }) {
  const opts = [
    { value: 'gallery', label: 'Gallery' },
    { value: 'list', label: 'List' },
  ]
  return (
    <div className="inline-flex border-2 border-black flex-shrink-0 self-start" role="group" aria-label="View mode">
      {opts.map(o => {
        const active = view === o.value
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-wide transition-colors ${
              active ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function QueryMeta({ isCanon, total, poll, filters }) {
  const pollLabel = poll === 'all' ? 'All polls' : `${poll} poll`
  const bits = []
  if (filters.selectedCountries.length) bits.push(filters.selectedCountries.join(', '))
  if (filters.selectedDirectors.length) bits.push(filters.selectedDirectors.join(', '))
  if (filters.yearStart || filters.yearEnd) bits.push(`${filters.yearStart || '…'}–${filters.yearEnd || '…'}`)
  return (
    <div className="text-sm text-gray-600 flex-1 min-w-0">
      <span className="font-bold text-black">{total.toLocaleString()}</span>{' '}
      {isCanon ? 'films in the canon' : (total === 1 ? 'film' : 'films')}
      <span className="text-gray-300 mx-1.5">·</span>
      {pollLabel}
      {bits.length > 0 && (
        <>
          <span className="text-gray-300 mx-1.5">·</span>
          <span className="truncate">{bits.join(' · ')}</span>
        </>
      )}
    </div>
  )
}

function EmptyState({ onClear }) {
  return (
    <div className="bg-white border-2 border-black p-12 text-center">
      <p className="text-lg font-bold text-black mb-2">No films match your filters</p>
      <p className="text-sm text-gray-500">Try adjusting your search criteria or clearing filters</p>
      <button
        onClick={onClear}
        className="mt-4 px-6 py-2 bg-black text-white font-bold uppercase tracking-wide text-sm hover:bg-gray-800 transition-colors"
      >
        Clear All Filters
      </button>
    </div>
  )
}

function PollTimeline({ activePoll, onChange, counts }) {
  const options = ['all', ...POLL_YEARS]
  const total = activePoll === 'all'
    ? counts?.all ?? 0
    : counts?.[String(activePoll)] ?? 0
  return (
    <div className="border-2 border-black bg-white p-4">
      <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
        Choose a poll
      </div>
      <div className="grid grid-cols-3 md:grid-cols-9 gap-2">
        {options.map(opt => {
          const value = String(opt)
          const active = value === String(activePoll)
          return (
            <button
              key={value}
              onClick={() => onChange(value)}
              className={`py-4 font-black border-2 border-black transition-colors ${
                opt === 'all' ? 'text-sm uppercase tracking-wide' : 'text-xl'
              } ${active ? 'bg-black text-white' : 'bg-white text-black hover:bg-black hover:text-white'}`}
            >
              {opt === 'all' ? 'All' : opt}
            </button>
          )
        })}
      </div>
      <div className="mt-3 text-sm text-gray-500">
        <span className="font-bold text-black">{total.toLocaleString()}</span>{' '}
        {activePoll === 'all'
          ? 'films received at least one vote across all polls.'
          : <>films received at least one vote in the <span className="font-bold text-black">{activePoll}</span> poll.</>}
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

// Position-only tween — cheaper than a spring FLIP when ~100 tiles reflow at once.
const MOVE = { type: 'tween', duration: 0.7, ease: 'easeInOut' }
// Instant transition when stepping through polls rapidly, so animations don't pile up.
const SNAP = { duration: 0 }
// Poll changes closer together than this are "rapid" → snap instead of animate.
const RAPID_MS = 800

function PollRankStrip({ film, activePoll }) {
  return (
    <div className="flex border-b-2 border-black divide-x divide-gray-200 flex-shrink-0">
      {POLL_YEARS.map(year => {
        const poll = film.pollHistory.find(p => p.year === year)
        const appeared = poll && poll.votes > 0
        const isActive = String(year) === String(activePoll)
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

  const moverProps = animateMove
    ? {
        layout: 'position',
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
          {/* Rank badge (or votes when there's no meaningful rank — unranked films, or the all-polls aggregate) */}
          <span className="absolute top-0 left-0 bg-black text-white text-sm font-black px-2 py-1">
            {film.currentRank != null
              ? `#${film.currentRank}`
              : `${film.currentVotes} ${film.currentVotes === 1 ? 'vote' : 'votes'}`}
          </span>
        </div>

        {/* Rank across all eight polls (1952 → 2022); active poll highlighted */}
        <PollRankStrip film={film} activePoll={activePoll} />

        {/* Metadata fills the remainder of the tile, stacked tightly from the top */}
        <div className="flex flex-col flex-1 min-h-0 p-2.5">
          <div className="font-bold text-sm leading-tight line-clamp-2">{film.FilmTitle}</div>
          <div className="text-xs text-gray-600 truncate mt-0.5">
            {film.Year} · {film.directors[0]}
          </div>
          {(film.countries?.[0] || film.Country) && (
            <div className="text-xs text-gray-600 truncate">
              {film.countries?.[0] || film.Country}
            </div>
          )}
          <div className="mt-1 text-xs font-bold text-gray-500">
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
    { label: 'Films with votes', value: filmsWithVotes.toLocaleString() },
    { label: 'Voters', value: voters != null ? voters.toLocaleString() : '—' },
    {
      label: 'Countries represented',
      value: countries.toLocaleString(),
      href: `/visualizations/country?poll=${activePoll}`,
      cue: 'See the map →',
    },
    {
      label: 'Median film year',
      value: medianYear != null ? medianYear : '—',
      note: medianAge != null ? `${medianAge} yrs old in ${activePoll}` : null,
      href: `/visualizations/decades?poll=${activePoll}`,
      cue: 'See decades →',
    },
  ]

  return (
    <div className="mt-8 border-2 border-black bg-white">
      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-gray-200">
        {cells.map(cell => {
          const inner = (
            <>
              <div className="text-3xl font-black tabular-nums leading-none">{cell.value}</div>
              <div className="mt-1 text-xs font-bold uppercase tracking-widest text-gray-500">{cell.label}</div>
              {cell.note && (
                <div className="text-[11px] font-medium text-gray-500 tabular-nums">{cell.note}</div>
              )}
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
