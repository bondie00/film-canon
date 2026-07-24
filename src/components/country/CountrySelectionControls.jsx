import { continentColors } from '../../utils/continents'

// The quick-filter buttons (Top N + per-continent) plus the search-and-add dropdown, driven by a
// useCountrySelection() instance. Shared by the country visualizations so their selection UI stays
// identical. `sel` is the hook's return value.
export default function CountrySelectionControls({ sel }) {
  const {
    selectedCountries, activeContinents, activeButton, defaultCount, maxSelection,
    isDropdownOpen, pendingSelection, searchQuery, setSearchQuery, expandedContinents,
    filteredContinents,
    resetToTopN, selectContinent, openDropdown, closeDropdown, toggleContinentExpanded,
    applySelection, clearPending, togglePendingCountry, togglePendingContinent,
  } = sel

  return (
    <>
      {/* Quick Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        <div className="bg-white border-2 border-black p-1 flex-shrink-0">
          <button
            onClick={resetToTopN}
            className={`py-2 px-3 text-sm font-bold uppercase tracking-wide transition-all border-2 border-black ${
              activeButton === 'topN'
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-black hover:text-white'
            }`}
          >
            Top {defaultCount}
          </button>
        </div>

        {Object.entries(continentColors).map(([continent, color]) => {
          const isActive = activeContinents.has(continent)
          const isPressed = activeButton === continent
          return (
            <div
              key={continent}
              className={`border-2 p-1 flex-shrink-0 ${
                isActive ? 'bg-white border-black' : 'bg-gray-100 border-gray-300'
              }`}
            >
              <button
                onClick={() => isActive && selectContinent(continent)}
                disabled={!isActive}
                className={`py-2 px-3 text-sm font-bold uppercase tracking-wide transition-all border-2 ${
                  !isActive
                    ? 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed'
                    : isPressed
                      ? 'text-white'
                      : 'bg-white text-black hover:text-white'
                }`}
                style={isActive ? {
                  borderColor: color,
                  ...(isPressed ? { backgroundColor: color } : {})
                } : {}}
                onMouseEnter={(e) => {
                  if (isActive && !isPressed) {
                    e.currentTarget.style.backgroundColor = color
                    e.currentTarget.style.borderColor = color
                  }
                }}
                onMouseLeave={(e) => {
                  if (isActive && !isPressed) {
                    e.currentTarget.style.backgroundColor = 'white'
                    e.currentTarget.style.borderColor = color
                  }
                }}
              >
                {continent}
              </button>
            </div>
          )
        })}
      </div>

      {/* ADD COUNTRY DROPDOWN */}
      <div className="border-t-2 border-black bg-white p-4 mt-4 relative">
        {/* Dropdown trigger */}
        <div
          onClick={openDropdown}
          className="w-full px-4 py-3 border-2 border-black text-sm text-black cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between font-medium"
        >
          <span>Search and add countries...</span>
          <span className="text-xs text-black font-bold">
            {selectedCountries.length} selected
          </span>
        </div>

        {/* Dropdown modal */}
        {isDropdownOpen && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black bg-opacity-20 z-40" onClick={closeDropdown} />

            {/* Dropdown content */}
            <div className="absolute left-4 right-4 top-16 bg-white border-2 border-black shadow-2xl z-50 max-h-96 flex flex-col">
              {/* Search header */}
              <div className="p-3 border-b-2 border-gray-300">
                <input
                  type="text"
                  placeholder="Search countries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black text-sm focus:outline-none focus:ring-2 focus:ring-black font-medium"
                  autoFocus
                />
                <div className="mt-2 flex justify-between items-center">
                  <div className="text-xs text-black font-bold uppercase tracking-wide">
                    <span>{pendingSelection.length} {pendingSelection.length === 1 ? 'country' : 'countries'} selected</span>
                    {pendingSelection.length >= maxSelection && (
                      <span className="text-red-600 font-black ml-2">Maximum of {maxSelection} reached</span>
                    )}
                  </div>
                  <button
                    onClick={clearPending}
                    disabled={pendingSelection.length === 0}
                    className={`text-xs font-bold px-2 py-1 transition-colors uppercase tracking-wide ${
                      pendingSelection.length === 0
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-red-600 hover:bg-red-50 cursor-pointer'
                    }`}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Scrollable continent list */}
              <div className="overflow-y-auto flex-1 p-3">
                {filteredContinents.map((continent) => {
                  const names = continent.countries.map(c => c.name)
                  const selectedInContinent = names.filter(n => pendingSelection.includes(n)).length
                  const totalInContinent = names.length
                  const allSelected = selectedInContinent === totalInContinent
                  const someSelected = selectedInContinent > 0 && selectedInContinent < totalInContinent
                  const isExpanded = expandedContinents[continent.continent]

                  return (
                    <div key={continent.continent} className="mb-3">
                      {/* Continent header with checkbox and accordion toggle */}
                      <div className="flex items-center gap-2 mb-2 p-2 hover:bg-gray-50">
                        <button
                          onClick={() => toggleContinentExpanded(continent.continent)}
                          className="text-black hover:text-gray-700 focus:outline-none font-bold"
                        >
                          {isExpanded ? '▼' : '▶'}
                        </button>

                        <div
                          className="flex items-center gap-2 flex-1 cursor-pointer"
                          onClick={() => togglePendingContinent(continent)}
                        >
                          <input
                            type="checkbox"
                            checked={allSelected}
                            ref={(el) => { if (el) el.indeterminate = someSelected }}
                            onChange={() => togglePendingContinent(continent)}
                            className="w-4 h-4 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="font-bold text-black uppercase tracking-wide">
                            {continent.continent}
                          </span>
                          <span className="text-xs text-black font-medium">
                            ({selectedInContinent}/{totalInContinent} selected)
                          </span>
                        </div>
                      </div>

                      {/* Country list - only shown when expanded */}
                      {isExpanded && (
                        <div className="ml-6 space-y-1">
                          {continent.countries.map((country) => {
                            const isSelected = pendingSelection.includes(country.name)
                            const isDisabled = !isSelected && pendingSelection.length >= maxSelection
                            return (
                              <label
                                key={country.name}
                                className={`flex items-center gap-2 p-1.5 cursor-pointer ${
                                  isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  disabled={isDisabled}
                                  onChange={() => togglePendingCountry(country.name)}
                                  className="w-4 h-4"
                                />
                                <span className="text-sm text-black font-medium">{country.name}</span>
                                <span className="text-xs text-black font-medium">({country.filmCount})</span>
                              </label>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}

                {filteredContinents.length === 0 && (
                  <div className="text-center text-black py-8 font-medium">
                    No countries found matching "{searchQuery}"
                  </div>
                )}
              </div>

              {/* Footer with buttons */}
              <div className="p-3 border-t-2 border-gray-300 flex gap-2 justify-end">
                <button
                  onClick={closeDropdown}
                  className="px-4 py-2 text-sm font-bold text-black bg-white border-2 border-black hover:bg-gray-100 transition-colors uppercase tracking-wide"
                >
                  Cancel
                </button>
                <button
                  onClick={applySelection}
                  disabled={pendingSelection.length === 0 || pendingSelection.length > maxSelection}
                  className={`px-4 py-2 text-sm font-bold uppercase tracking-wide transition-colors ${
                    pendingSelection.length === 0 || pendingSelection.length > maxSelection
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
    </>
  )
}
