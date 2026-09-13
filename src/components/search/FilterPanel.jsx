import SearchSelect from './SearchSelect'
import CountryFilter from '../filters/CountryFilter'
import GenreFilter from '../filters/GenreFilter'
import FilterCard, { FilterSection, ClearButton } from '../filters/FilterCard'
import PollGrid from '../filters/PollGrid'
import RankDepthFilter from '../RankDepthFilter'
import { EMPTY_RANK_INDEX } from '../../lib/rankDepth'

const inputClass =
  'w-full px-2 py-1.5 border-2 border-black text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black'

/**
 * /explore's filter rail, on the same FilterCard as the Countries and Directors
 * hubs. Poll and rank depth open it, in the order the hubs use, because they
 * choose WHICH canon you're looking at; the rest narrow within it.
 *
 * The poll used to be a full-width strip above the page that condensed into a
 * pinned bar on scroll. The rail is sticky, so the grid here does that job
 * without a second copy of the control. It makes the rail taller than a laptop
 * screen; FilterCard handles that by letting the rail travel with the page.
 */
export default function FilterPanel({
  filters,
  onFilterChange,
  onClear,
  countriesData,
  activePoll,
  onPollChange,
  titleOptions,
  directorOptions,
  filmsForCountryCounts,
  filmsForGenreCounts,
  topRank = null,
  onTopRankChange,
  rankIndex = EMPTY_RANK_INDEX,
}) {
  const hasActiveFilters = filters.selectedTitles.length > 0 || filters.selectedDirectors.length > 0 ||
    filters.selectedCountries.length > 0 || (filters.selectedContinents?.length || 0) > 0 ||
    (filters.selectedGenres?.length || 0) > 0 ||
    filters.yearStart || filters.yearEnd ||
    filters.sortBy !== 'votes' || topRank != null

  const clear = hasActiveFilters && (
    <button
      onClick={onClear}
      className="text-xs font-bold text-red-600 hover:text-red-800 uppercase tracking-wide"
    >
      Clear All
    </button>
  )

  return (
    <FilterCard action={clear}>
      <FilterSection label="Poll Selection" first>
        <PollGrid value={activePoll} onChange={onPollChange} />
      </FilterSection>

      {/* Shared with the Countries hub and the country pages */}
      <FilterSection>
        <RankDepthFilter index={rankIndex} target={topRank} onChange={onTopRankChange} />
      </FilterSection>

      <FilterSection
        label="Title"
        action={<ClearButton count={filters.selectedTitles.length} onClick={() => onFilterChange({ selectedTitles: [] })} />}
      >
        <SearchSelect
          placeholder="Search film titles..."
          options={titleOptions}
          selected={filters.selectedTitles}
          onChange={(titles) => onFilterChange({ selectedTitles: titles })}
        />
      </FilterSection>

      <FilterSection
        label="Director"
        action={<ClearButton count={filters.selectedDirectors.length} onClick={() => onFilterChange({ selectedDirectors: [] })} />}
      >
        <SearchSelect
          placeholder="Search directors..."
          options={directorOptions}
          selected={filters.selectedDirectors}
          onChange={(directors) => onFilterChange({ selectedDirectors: directors })}
        />
      </FilterSection>

      {/* Country + continent, via the shared control the Directors hub also uses.
          It carries its own label. */}
      <FilterSection>
        <CountryFilter
          countriesData={countriesData}
          films={filmsForCountryCounts}
          countries={filters.selectedCountries}
          continents={filters.selectedContinents || []}
          onChange={({ countries, continents }) =>
            onFilterChange({ selectedCountries: countries, selectedContinents: continents })
          }
        />
      </FilterSection>

      <FilterSection>
        <GenreFilter
          films={filmsForGenreCounts}
          selected={filters.selectedGenres || []}
          onChange={(genres) => onFilterChange({ selectedGenres: genres })}
        />
      </FilterSection>

      <FilterSection label="Year">
        <div className="flex gap-1.5 items-center">
          <input
            type="number"
            value={filters.yearStart}
            onChange={(e) => onFilterChange({ yearStart: e.target.value })}
            placeholder="From"
            min="1888"
            max="2025"
            aria-label="From year"
            className={inputClass}
          />
          <span className="text-gray-400 text-xs">–</span>
          <input
            type="number"
            value={filters.yearEnd}
            onChange={(e) => onFilterChange({ yearEnd: e.target.value })}
            placeholder="To"
            min="1888"
            max="2025"
            aria-label="To year"
            className={inputClass}
          />
        </div>
      </FilterSection>

      <FilterSection label="Sort">
        <select
          value={filters.sortBy}
          onChange={(e) => onFilterChange({ sortBy: e.target.value })}
          className={inputClass}
        >
          <option value="votes">Most Votes</option>
          <option value="title-az">Title A–Z</option>
          <option value="year-newest">Year (Newest)</option>
          <option value="year-oldest">Year (Oldest)</option>
        </select>
      </FilterSection>
    </FilterCard>
  )
}
