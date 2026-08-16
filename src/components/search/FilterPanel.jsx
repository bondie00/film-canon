import SearchSelect from './SearchSelect'
import CountryFilter from '../filters/CountryFilter'
import RankDepthFilter from '../RankDepthFilter'
import { EMPTY_RANK_INDEX } from '../../lib/rankDepth'

const POLL_OPTIONS = [
  { value: 'all', label: 'All Polls Combined' },
  { value: '2022', label: '2022' },
  { value: '2012', label: '2012' },
  { value: '2002', label: '2002' },
  { value: '1992', label: '1992' },
  { value: '1982', label: '1982' },
  { value: '1972', label: '1972' },
  { value: '1962', label: '1962' },
  { value: '1952', label: '1952' },
]

export default function FilterPanel({
  filters,
  onFilterChange,
  onClear,
  countriesData,
  activePoll,
  onPollChange,
  filmCounts,
  titleOptions,
  directorOptions,
  filmsForCountryCounts,
  showPoll = true,
  topRank = null,
  onTopRankChange,
  rankIndex = EMPTY_RANK_INDEX,
}) {
  // Build poll label with count
  const getPollLabel = (value) => {
    const count = filmCounts?.[value] || 0
    const base = POLL_OPTIONS.find(o => o.value === value)?.label || value
    return `${base} (${count.toLocaleString()})`
  }

  // Check if any filters are active
  const hasActiveFilters = filters.selectedTitles.length > 0 || filters.selectedDirectors.length > 0 ||
    filters.selectedCountries.length > 0 || (filters.selectedContinents?.length || 0) > 0 ||
    filters.yearStart || filters.yearEnd ||
    filters.sortBy !== 'votes' || topRank != null

  return (
    // top-20 rather than the usual top-8: /explore pins the condensed poll bar to
    // the top of the viewport, and the panel has to come to rest below it.
    //
    // The max-height is a guard, not a layout: a sticky element taller than the
    // viewport never scrolls, so its bottom controls (Rank Depth, Sort) would be
    // permanently unreachable on a short window. Inert whenever the panel fits.
    <div className="bg-white border-4 border-black p-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
      {/* Header row: title + clear */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b-2 border-gray-300">
        <h2 className="text-xl font-black text-black uppercase tracking-wider">Filters</h2>
        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="text-xs font-bold text-red-600 hover:text-red-800 uppercase tracking-wide"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Poll Selector — hidden on the unified /explore page, where the prominent
          poll timeline drives poll selection instead. */}
      {showPoll && (
        <div className="mb-3 pb-3 border-b border-gray-200">
          <label className="block text-xs font-semibold text-black mb-1.5 uppercase tracking-wide">
            Poll
          </label>
          <select
            value={activePoll}
            onChange={(e) => onPollChange(e.target.value)}
            className="w-full px-2 py-1.5 border-2 border-black text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black"
          >
            {POLL_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {getPollLabel(opt.value)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Title Search */}
      <div className="mb-3 pb-3 border-b border-gray-200">
        <label className="block text-xs font-semibold text-black mb-1.5 uppercase tracking-wide">
          Title
        </label>
        <SearchSelect
          placeholder="Search film titles..."
          options={titleOptions}
          selected={filters.selectedTitles}
          onChange={(titles) => onFilterChange({ selectedTitles: titles })}
        />
      </div>

      {/* Director Search */}
      <div className="mb-3 pb-3 border-b border-gray-200">
        <label className="block text-xs font-semibold text-black mb-1.5 uppercase tracking-wide">
          Director
        </label>
        <SearchSelect
          placeholder="Search directors..."
          options={directorOptions}
          selected={filters.selectedDirectors}
          onChange={(directors) => onFilterChange({ selectedDirectors: directors })}
        />
      </div>

      {/* Country + continent, via the shared control the Directors hub also
          uses. This was ~130 lines of dropdown written inline here. */}
      <div className="mb-3 pb-3 border-b border-gray-200">
        <CountryFilter
          countriesData={countriesData}
          films={filmsForCountryCounts}
          countries={filters.selectedCountries}
          continents={filters.selectedContinents || []}
          onChange={({ countries, continents }) =>
            onFilterChange({ selectedCountries: countries, selectedContinents: continents })
          }
        />
      </div>

      {/* Year Range */}
      <div className="mb-3 pb-3 border-b border-gray-200">
        <label className="block text-xs font-semibold text-black mb-1.5 uppercase tracking-wide">
          Year
        </label>
        <div className="flex gap-1.5 items-center">
          <input
            type="number"
            value={filters.yearStart}
            onChange={(e) => onFilterChange({ yearStart: e.target.value })}
            placeholder="From"
            min="1888"
            max="2025"
            className="w-full px-2 py-1.5 border-2 border-black text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black"
          />
          <span className="text-gray-400 text-xs">–</span>
          <input
            type="number"
            value={filters.yearEnd}
            onChange={(e) => onFilterChange({ yearEnd: e.target.value })}
            placeholder="To"
            min="1888"
            max="2025"
            className="w-full px-2 py-1.5 border-2 border-black text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
      </div>

      {/* Rank depth — the same control the country pages use. It sits below the
          others here (rather than first, as on the Countries page) because on
          /explore the gallery is already rank-sorted and paginated, so the cutoff
          reads as a refinement of a filtered set, not a primary axis. Adjacent to
          Year on purpose: both narrow a range rather than name a thing. */}
      <div className="mb-3 pb-3 border-b border-gray-200">
        <RankDepthFilter
          index={rankIndex}
          target={topRank}
          onChange={onTopRankChange}
          dense
        />
      </div>

      {/* Sort */}
      <div>
        <label className="block text-xs font-semibold text-black mb-1.5 uppercase tracking-wide">
          Sort
        </label>
        <select
          value={filters.sortBy}
          onChange={(e) => onFilterChange({ sortBy: e.target.value })}
          className="w-full px-2 py-1.5 border-2 border-black text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black"
        >
          <option value="votes">Most Votes</option>
          <option value="title-az">Title A–Z</option>
          <option value="year-newest">Year (Newest)</option>
          <option value="year-oldest">Year (Oldest)</option>
        </select>
      </div>
    </div>
  )
}
