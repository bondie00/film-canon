import { TOP_N_OPTIONS } from '../../hooks/useDirectorSelection'

/**
 * The quick filters and the search-and-add dropdown, shared by the ranking chart
 * and the decade heatmap — the director-side twin of CountrySelectionControls.
 *
 * Where the country controls offer continents, these offer depth, for the reason
 * given in useDirectorSelection: a director has no continent to filter by.
 */
export function DirectorQuickFilters({ sel }) {
  return (
    <div className="flex flex-wrap gap-2">
      {TOP_N_OPTIONS.map(n => (
        <div key={n} className="bg-white border-2 border-black p-1 flex-shrink-0">
          <button
            onClick={() => sel.selectTopN(n)}
            className={`py-2 px-3 text-sm font-bold uppercase tracking-wide transition-all border-2 border-black ${
              sel.activeTopN === n
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-black hover:text-white'
            }`}
          >
            Top {n}
          </button>
        </div>
      ))}
    </div>
  )
}

export function DirectorSearchDropdown({ sel }) {
  return (
    <div className="border-t-2 border-black bg-white p-4 mt-4 relative">
      <div
        onClick={sel.openDropdown}
        className="w-full px-4 py-3 border-2 border-black text-sm text-black cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between font-medium"
      >
        <span>Search and add directors…</span>
        <span className="text-xs text-black font-bold">{sel.selectedNames.length} selected</span>
      </div>

      {sel.isDropdownOpen && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-20 z-40" onClick={sel.closeDropdown} />

          <div className="absolute left-4 right-4 top-16 bg-white border-2 border-black shadow-2xl z-50 max-h-96 flex flex-col">
            <div className="p-3 border-b-2 border-gray-300">
              <input
                type="text"
                placeholder={`Search all ${sel.total.toLocaleString()} directors…`}
                value={sel.searchQuery}
                onChange={e => sel.setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border-2 border-black text-sm focus:outline-none focus:ring-2 focus:ring-black font-medium"
                autoFocus
              />
              <div className="mt-2 flex justify-between items-center">
                <div className="text-xs text-black font-bold uppercase tracking-wide">
                  <span>{sel.pendingSelection.length} selected</span>
                  {sel.pendingSelection.length >= sel.maxSelection && (
                    <span className="text-red-600 font-black ml-2">
                      Maximum of {sel.maxSelection} reached
                    </span>
                  )}
                </div>
                <button
                  onClick={sel.clearPending}
                  disabled={!sel.pendingSelection.length}
                  className={`text-xs font-bold px-2 py-1 transition-colors uppercase tracking-wide ${
                    sel.pendingSelection.length
                      ? 'text-red-600 hover:bg-red-50 cursor-pointer'
                      : 'text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-3 space-y-1">
              {sel.results.map(row => {
                const isSelected = sel.pendingSelection.includes(row.name)
                const isDisabled = !isSelected && sel.pendingSelection.length >= sel.maxSelection
                return (
                  <label
                    key={row.name}
                    className={`flex items-center gap-2 p-1.5 cursor-pointer ${
                      isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isDisabled}
                      onChange={() => sel.togglePending(row.name)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-black font-medium flex-1 truncate">{row.name}</span>
                    <span className="text-xs text-black font-medium tabular-nums">
                      {row.films} {row.films === 1 ? 'film' : 'films'} · {row.votes.toLocaleString()}
                    </span>
                  </label>
                )
              })}
              {!sel.results.length && (
                <div className="text-center text-black py-8 font-medium">
                  No director found matching “{sel.searchQuery}”
                </div>
              )}
            </div>

            <div className="p-3 border-t-2 border-gray-300 flex gap-2 justify-end">
              <button
                onClick={sel.closeDropdown}
                className="px-4 py-2 text-sm font-bold text-black bg-white border-2 border-black hover:bg-gray-100 transition-colors uppercase tracking-wide"
              >
                Cancel
              </button>
              <button
                onClick={sel.applySelection}
                disabled={!sel.pendingSelection.length || sel.pendingSelection.length > sel.maxSelection}
                className={`px-4 py-2 text-sm font-bold uppercase tracking-wide transition-colors ${
                  !sel.pendingSelection.length || sel.pendingSelection.length > sel.maxSelection
                    ? 'bg-gray-400 text-white cursor-not-allowed border-2 border-gray-400'
                    : 'bg-black text-white border-2 border-black hover:bg-gray-900'
                }`}
              >
                Apply Changes
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
