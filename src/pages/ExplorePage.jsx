import { useState, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, LayoutGroup } from 'framer-motion'
import Header from '../components/Header'
import Footer from '../components/Footer'
import FilterPanel from '../components/search/FilterPanel'
import Pagination from '../components/search/Pagination'
import GridTile, { withCurrent } from '../components/search/GridTile'
import { useFilmQuery, POLL_YEARS } from '../hooks/useFilmQuery'
import { POLL_VOTERS } from '../utils/polls'

const PER_PAGE = 60         // poster tiles per page
const MOVE_RANK_MAX = 50    // only the top 50 slide to their new slot on a poll change; the rest crossfade

export default function ExplorePage() {
  const q = useFilmQuery()
  const {
    loading, error, films, poll, topRank, filters, page,
    countriesData, filmCounts, titleOptions, directorOptions,
    beforeCountry, sorted, setParam, onFilterChange, clearFilters,
  } = q

  // Animate the reflow only when the user lands on a poll and pauses; snap when
  // they're clicking through quickly, paging, or moving the slider (avoids
  // overlapping/whole-page churn animations).
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

  const handleTopRankChange = (value) => {
    setAnimateReflow(false)
    setParam({ top: value == null ? '' : String(value) })
  }

  const handlePageChange = (p) => {
    setAnimateReflow(false)
    setParam({ page: String(p) })
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Paginate the sorted result set — same list, drawn as poster tiles.
  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE))
  const clampedPage = Math.min(page, totalPages)
  const pageFilms = useMemo(
    () => sorted.slice((clampedPage - 1) * PER_PAGE, clampedPage * PER_PAGE),
    [sorted, clampedPage]
  )

  // Poll-level vital stats — computed from the whole poll (independent of the
  // slider/filters), so it reads as a stable summary of the poll itself.
  const vitalStats = useMemo(() => {
    if (!films || poll === 'all') return null
    const year = parseInt(poll, 10)
    const members = films.filter(f => {
      const p = f.pollHistory.find(x => x.year === year)
      return p && p.votes > 0
    })
    if (!members.length) return null
    const countrySet = new Set()
    members.forEach(f => f.countries?.forEach(c => {
      const name = c && c.trim()
      if (name) countrySet.add(name)
    }))
    const years = members.map(f => parseInt(f.Year, 10)).filter(y => !Number.isNaN(y)).sort((a, b) => a - b)
    let medianYear = null
    if (years.length) {
      const mid = Math.floor(years.length / 2)
      medianYear = years.length % 2 ? years[mid] : Math.round((years[mid - 1] + years[mid]) / 2)
    }
    return {
      voters: POLL_VOTERS[year] ?? null,
      filmsWithVotes: members.length,
      countries: countrySet.size,
      medianYear,
      medianAge: medianYear != null ? year - medianYear : null,
    }
  }, [films, poll])

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
    topRank,
    onTopRankChange: handleTopRankChange,
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
          stood — then use the filters to narrow by rank, country, director, or year, from
          the full record down to the core of the canon.
        </p>

        <PollTimeline activePoll={poll} onChange={handlePollChange} counts={filmCounts} />

        <div className="mt-6 grid grid-cols-12 gap-8">
          {/* FILTER SIDEBAR (desktop) */}
          <aside className="hidden lg:block col-span-3">
            <FilterPanel {...filterPanelProps} />
          </aside>

          {/* MAIN */}
          <div className="col-span-12 lg:col-span-9" ref={resultsRef}>
            {/* Toolbar: mobile filter toggle + result summary */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <button
                onClick={() => setShowMobileFilters(v => !v)}
                className="lg:hidden py-2.5 px-4 bg-white text-black font-bold uppercase tracking-wide text-sm border-2 border-black hover:bg-black hover:text-white transition-colors"
              >
                {showMobileFilters ? 'Hide Filters ▲' : 'Show Filters ▼'}
              </button>
              <QueryMeta total={sorted.length} poll={poll} filters={filters} />
            </div>

            {/* MOBILE FILTER PANEL */}
            {showMobileFilters && (
              <div className="lg:hidden mb-6">
                <FilterPanel {...filterPanelProps} />
              </div>
            )}

            {/* POSTER GALLERY (paginated, animated on poll change) */}
            {pageFilms.length > 0 ? (
              <>
                {totalPages > 1 && (
                  <div className="mb-4">
                    <Pagination currentPage={clampedPage} totalPages={totalPages} onPageChange={handlePageChange} />
                  </div>
                )}
                <LayoutGroup>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <AnimatePresence mode="popLayout">
                      {pageFilms.map(f => {
                        const film = withCurrent(f, poll)
                        const isMover = film.currentRank != null && film.currentRank <= MOVE_RANK_MAX
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
                </LayoutGroup>
                <div className="mt-6">
                  <Pagination currentPage={clampedPage} totalPages={totalPages} onPageChange={handlePageChange} />
                </div>
              </>
            ) : (
              <EmptyState onClear={clearFilters} topRank={topRank} />
            )}

            {/* POLL FOOTER — vital stats + evolution handoff (single poll only) */}
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
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

/* ------------------------------ sub-components ------------------------------ */

function QueryMeta({ total, poll, filters }) {
  const pollLabel = poll === 'all' ? 'All polls' : `${poll} poll`
  const bits = []
  if (filters.selectedCountries.length) bits.push(filters.selectedCountries.join(', '))
  if (filters.selectedDirectors.length) bits.push(filters.selectedDirectors.join(', '))
  if (filters.yearStart || filters.yearEnd) bits.push(`${filters.yearStart || '…'}–${filters.yearEnd || '…'}`)
  return (
    <div className="text-sm text-gray-600 flex-1 min-w-0">
      <span className="font-bold text-black">{total.toLocaleString()}</span>{' '}
      {total === 1 ? 'film' : 'films'}
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

function EmptyState({ onClear, topRank }) {
  return (
    <div className="bg-white border-2 border-black p-12 text-center">
      <p className="text-lg font-bold text-black mb-2">No films match your filters</p>
      <p className="text-sm text-gray-500">
        {topRank != null
          ? 'Try widening the rank depth (“Show”), or adjusting your filters.'
          : 'Try adjusting your search criteria or clearing filters.'}
      </p>
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

// Position-only tween — cheaper than a spring FLIP when many tiles reflow at once.
const MOVE = { type: 'tween', duration: 0.7, ease: 'easeInOut' }
// Instant transition when stepping through polls rapidly / paging, so animations don't pile up.
const SNAP = { duration: 0 }
// Poll changes closer together than this are "rapid" → snap instead of animate.
const RAPID_MS = 800

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
