import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import PageShell, { SidebarLayout } from '../components/layout/PageShell'
import DetailHeader, { Figure } from '../components/layout/DetailHeader'
import { LoadingState } from '../components/layout/NotFound'
import FilterPanel from '../components/search/FilterPanel'
import Pagination from '../components/search/Pagination'
import GridTile, { withCurrent } from '../components/search/GridTile'
import { useFilmQuery } from '../hooks/useFilmQuery'
import { describeDepth } from '../lib/rankDepth'
import { votesLabel, pollLabel } from '../lib/metrics'

const PER_PAGE = 60         // poster tiles per page

export default function ExplorePage() {
  const q = useFilmQuery()
  const {
    loading, error, poll, topRank, rankIndex, depthFilmCount, depthMinVotes, filters, page,
    countriesData, titleOptions, directorOptions,
    beforeCountry, beforeGenre, sorted, getPollData, setParam, onFilterChange, clearFilters,
  } = q

  const [showMobileFilters, setShowMobileFilters] = useState(false)

  // A poll change keeps your page. The rail is sticky, so you can switch polls from
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
    // To the top of the page, not the grid: the pagination lives in the header
    // now, so landing on the grid would scroll the control you just used away.
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Paginate the sorted result set — same list, drawn as poster tiles.
  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE))
  const clampedPage = Math.min(page, totalPages)
  const pageFilms = useMemo(
    () => sorted.slice((clampedPage - 1) * PER_PAGE, clampedPage * PER_PAGE),
    [sorted, clampedPage]
  )

  // Votes the current result set received in the active poll.
  const totalVotes = useMemo(
    () => sorted.reduce((sum, f) => sum + (getPollData(f).votes || 0), 0),
    [sorted, getPollData]
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
    titleOptions,
    directorOptions,
    filmsForCountryCounts: beforeCountry,
    filmsForGenreCounts: beforeGenre,
    topRank,
    onTopRankChange: handleTopRankChange,
    rankIndex,
  }

  if (loading || error) {
    return (
      <PageShell>
        {error
          ? <p className="text-center py-20 text-red-600 font-bold">{error}</p>
          : <LoadingState label="Loading the canon…" />}
      </PageShell>
    )
  }

  return (
    <PageShell>
      {/* Same header as the hubs: the figures describe the set the rail selects,
          and the last fact names that selection in grey. */}
      <DetailHeader
        title="Explore"
        facts={[
          <Figure key="films" value={sorted.length.toLocaleString()}>
            {sorted.length === 1 ? 'film' : 'films'}
          </Figure>,
          <span key="votes" className="tabular-nums">{votesLabel(totalVotes)}</span>,
          <span key="filter" className="text-gray-400">
            {selectionText({ poll, topRank, depthFilmCount, depthMinVotes, filters })}
          </span>,
        ]}
        aside={
          <Pagination currentPage={clampedPage} totalPages={totalPages} onPageChange={handlePageChange} />
        }
      />

      <SidebarLayout
        sidebar={
          <>
            <button
              onClick={() => setShowMobileFilters(v => !v)}
              className="lg:hidden w-full py-2.5 px-4 bg-white text-black font-bold uppercase tracking-wide text-sm border-2 border-black hover:bg-black hover:text-white transition-colors"
            >
              {showMobileFilters ? 'Hide Filters ▲' : 'Show Filters ▼'}
            </button>
            {/* `contents` on desktop: this wrapper would be exactly as tall as the
                rail, leaving the sticky rail no room to stick within the column. */}
            <div className={showMobileFilters ? 'mt-4 lg:mt-0 lg:contents' : 'hidden lg:contents'}>
              <FilterPanel {...filterPanelProps} />
            </div>
          </>
        }
      >
        <div>
          {/* POSTER GALLERY (paginated, animated on poll change) */}
          {pageFilms.length > 0 ? (
            <>
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
      </SidebarLayout>
    </PageShell>
  )
}

/* ------------------------------ sub-components ------------------------------ */

// The grey last fact: poll and depth as the hubs word them, then any narrowing
// filters. Continents are named as themselves — this line is where selecting a
// continent used to spell out all forty of its countries.
function selectionText({ poll, topRank, depthFilmCount, depthMinVotes, filters }) {
  const bits = [pollLabel(poll), describeDepth(topRank, depthFilmCount, depthMinVotes)]
  if (filters.selectedTitles.length) bits.push(filters.selectedTitles.join(', '))
  if (filters.selectedContinents?.length) bits.push(filters.selectedContinents.join(', '))
  if (filters.selectedCountries.length) bits.push(filters.selectedCountries.join(', '))
  if (filters.selectedDirectors.length) bits.push(filters.selectedDirectors.join(', '))
  // "+" rather than a comma: genre picks narrow, where the lists above add up.
  if (filters.selectedGenres?.length) bits.push(filters.selectedGenres.join(' + '))
  if (filters.yearStart || filters.yearEnd) bits.push(`${filters.yearStart || '…'}–${filters.yearEnd || '…'}`)
  return bits.join(' • ')
}

function EmptyState({ onClear, topRank }) {
  return (
    <div className="bg-white border-2 border-black p-12 text-center">
      <p className="text-lg font-bold text-black mb-2">No films match your filters</p>
      <p className="text-sm text-gray-500">
        {topRank != null
          ? 'Try widening the rank depth, or adjusting your filters.'
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

// The gallery's fade-in on a poll change. Long enough to register as a deliberate
// change, short enough that stepping through polls doesn't feel gated behind it.
const GRID_FADE = { type: 'tween', duration: 0.15, ease: 'easeOut' }
