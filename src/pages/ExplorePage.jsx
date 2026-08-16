import { useState, useMemo, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Header from '../components/Header'
import Footer from '../components/Footer'
import FilterPanel from '../components/search/FilterPanel'
import Pagination from '../components/search/Pagination'
import GridTile, { withCurrent } from '../components/search/GridTile'
import { useFilmQuery, POLL_YEARS } from '../hooks/useFilmQuery'

const PER_PAGE = 60         // poster tiles per page

export default function ExplorePage() {
  const q = useFilmQuery()
  const {
    loading, error, poll, topRank, rankIndex, filters, page,
    countriesData, filmCounts, titleOptions, directorOptions,
    beforeCountry, sorted, setParam, onFilterChange, clearFilters,
  } = q

  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const resultsRef = useRef(null)

  // The poll timeline pins to the top of the viewport so the poll stays switchable
  // from anywhere in the gallery. A sentinel sits just BELOW the in-flow timeline;
  // once it scrolls out of view, a condensed copy of the bar is drawn as a separate
  // fixed element (label and count line dropped, ~50px instead of ~150px).
  //
  // The condensed copy is deliberately not the same element made `sticky`: shrinking
  // a sticky block removes ~100px of document height, the browser's scroll anchoring
  // compensates by nudging scrollTop, that pushes the sentinel back into view, and
  // the bar flickers between states forever when you scroll slowly across the
  // boundary. Keeping the in-flow timeline at a constant size breaks that loop.
  const stickySentinelRef = useRef(null)
  const [pollBarStuck, setPollBarStuck] = useState(false)
  useEffect(() => {
    const el = stickySentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setPollBarStuck(!entry.isIntersecting),
      { threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loading])   // the sentinel only exists once the loading screen is replaced

  // A poll change keeps your page. The bar is pinned, so you can switch polls from
  // anywhere in the gallery — resetting to page 1 while leaving the scroll position
  // untouched would strand you at the same y-offset over a completely different
  // depth of the canon. Holding the page keeps the comparison honest: the same rank
  // window, one poll against another. (Depth and filters still reset to page 1 —
  // those change the size of the result set rather than swapping the dataset.)
  const handlePollChange = (value) => {
    if (value === poll) return
    setParam({ poll: value, ...(page > 1 ? { page: String(page) } : {}) })
  }

  const handleTopRankChange = (value) => {
    setParam({ top: value == null ? '' : String(value) })
  }

  const handlePageChange = (p) => {
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

  // Poll sizes differ enormously (1952 is 4 pages, 2022 is 64), so a preserved page
  // can land past the end. clampedPage already handles the render; write it back so
  // the URL can't say page 40 while page 4 is on screen and a shared link misleads.
  // Skipped while loading: sorted is empty then, and clamping to 1 would break deep
  // links to a page before the data arrives.
  useEffect(() => {
    if (loading || page === clampedPage) return
    setParam({ page: clampedPage > 1 ? String(clampedPage) : '' }, { replace: true })
  }, [loading, page, clampedPage, setParam])

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
    rankIndex,
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
        <div ref={stickySentinelRef} aria-hidden className="h-px" />

        {/* Slides in from above rather than cutting: safe to animate because the bar
            is out of flow, so nothing here can perturb scroll position. */}
        <AnimatePresence>
          {pollBarStuck && (
            <motion.div
              key="poll-bar"
              initial={{ y: '-100%' }}
              animate={{ y: 0 }}
              exit={{ y: '-100%' }}
              transition={POLL_BAR_SLIDE}
              className="fixed inset-x-0 top-0 z-40 bg-gray-50 border-b border-gray-300 py-2"
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <PollTimeline
                  activePoll={poll}
                  onChange={handlePollChange}
                  counts={filmCounts}
                  condensed
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-6 grid grid-cols-12 gap-8">
          {/* FILTER SIDEBAR (desktop) */}
          <aside className="hidden lg:block col-span-3">
            <FilterPanel {...filterPanelProps} />
          </aside>

          {/* MAIN */}
          {/* scroll-mt clears the pinned poll bar when paging jumps back to the top */}
          <div className="col-span-12 lg:col-span-9 scroll-mt-24" ref={resultsRef}>
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
                {/* Keyed on poll, so the whole gallery fades in as one unit when you
                    switch polls — a single calm "the page changed" gesture that reads the
                    same at rank 1 or rank 180. Paging and filter changes swap instantly
                    (the key is unchanged), which is what you want when you're typing into
                    a filter. Tiles pass fade={false}: the container owns the fade, and
                    per-tile fades on top of it would speckle. */}
                <motion.div
                  key={poll}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={GRID_FADE}
                  className="grid grid-cols-2 md:grid-cols-3 gap-3"
                >
                  {pageFilms.map(f => (
                    <GridTile
                      key={f.key}
                      film={withCurrent(f, poll)}
                      activePoll={poll}
                      fade={false}
                    />
                  ))}
                </motion.div>
                <div className="mt-6">
                  <Pagination currentPage={clampedPage} totalPages={totalPages} onPageChange={handlePageChange} />
                </div>
              </>
            ) : (
              <EmptyState onClear={clearFilters} topRank={topRank} />
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
  // Continents first, and as themselves — this line is where selecting a
  // continent used to spell out all forty of its countries.
  if (filters.selectedContinents?.length) bits.push(filters.selectedContinents.join(', '))
  if (filters.selectedCountries.length) bits.push(filters.selectedCountries.join(', '))
  if (filters.selectedDirectors.length) bits.push(filters.selectedDirectors.join(', '))
  if (filters.yearStart || filters.yearEnd) bits.push(`${filters.yearStart || '…'}–${filters.yearEnd || '…'}`)
  return (
    // Truncation lives HERE, on the block, not on the inner span it used to sit
    // on: `text-overflow` needs a block box with overflow hidden, so on an inline
    // <span> it did nothing and a long list simply widened the row it shares.
    <div className="text-sm text-gray-600 flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis">
      <span className="font-bold text-black">{total.toLocaleString()}</span>{' '}
      {total === 1 ? 'film' : 'films'}
      <span className="text-gray-300 mx-1.5">·</span>
      {pollLabel}
      {bits.length > 0 && (
        <>
          <span className="text-gray-300 mx-1.5">·</span>
          {bits.join(' · ')}
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

// Rendered twice on the page: once in flow at full size, and again — with
// `condensed` — inside the fixed bar that takes over once the first scrolls away.
// Condensed drops the framing label and the count sentence and lays the nine stops
// out as one tight row (horizontally scrollable on narrow screens, where the full
// version wraps to three). The count stays visible either way: QueryMeta carries it.
function PollTimeline({ activePoll, onChange, counts, condensed }) {
  const options = ['all', ...POLL_YEARS]
  const total = activePoll === 'all'
    ? counts?.all ?? 0
    : counts?.[String(activePoll)] ?? 0
  return (
    <div className={`border-2 border-black bg-white ${condensed ? 'p-2' : 'p-4'}`}>
      {!condensed && (
        <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
          Choose a poll
        </div>
      )}
      <div className={condensed ? 'flex gap-1.5 overflow-x-auto' : 'grid grid-cols-3 md:grid-cols-9 gap-2'}>
        {options.map(opt => {
          const value = String(opt)
          const active = value === String(activePoll)
          const size = condensed
            ? `flex-1 min-w-[3.25rem] py-1.5 ${opt === 'all' ? 'text-[11px] uppercase tracking-wide' : 'text-sm'}`
            : `py-4 ${opt === 'all' ? 'text-sm uppercase tracking-wide' : 'text-xl'}`
          return (
            <button
              key={value}
              onClick={() => onChange(value)}
              className={`font-black border-2 border-black transition-colors ${size} ${
                active ? 'bg-black text-white' : 'bg-white text-black hover:bg-black hover:text-white'
              }`}
            >
              {opt === 'all' ? 'All' : opt}
            </button>
          )
        })}
      </div>
      {!condensed && (
        <div className="mt-3 text-sm text-gray-500">
          <span className="font-bold text-black">{total.toLocaleString()}</span>{' '}
          {activePoll === 'all'
            ? 'films received at least one vote across all polls.'
            : <>films received at least one vote in the <span className="font-bold text-black">{activePoll}</span> poll.</>}
        </div>
      )}
    </div>
  )
}

// Short enough that crossing the boundary still feels like a direct response to the scroll.
const POLL_BAR_SLIDE = { type: 'tween', duration: 0.22, ease: 'easeOut' }
// The gallery's fade-in on a poll change. Long enough to register as a deliberate
// change, short enough that stepping through polls doesn't feel gated behind it.
const GRID_FADE = { type: 'tween', duration: 0.15, ease: 'easeOut' }
