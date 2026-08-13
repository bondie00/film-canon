/**
 * The sticky filter rail. Every page that filters uses this shell, so the pane
 * is in the same place, at the same weight, with the same heading throughout the
 * site.
 *
 * Sections inside it are separated by <FilterSection>, which owns the rules
 * between controls — the dividers were previously hand-written on each control
 * and drifted out of step (some ruled above, some below, some not at all).
 */
export default function FilterCard({ children }) {
  return (
    <div className="bg-white border-4 border-black p-6 lg:sticky lg:top-8">
      <h2 className="text-3xl font-bold text-black mb-6 uppercase tracking-wider">Filters</h2>
      {children}
    </div>
  )
}

/**
 * One control in the rail. `first` drops the leading rule, so the top control
 * sits flush under the heading.
 */
export function FilterSection({ label, first = false, children }) {
  return (
    <div className={first ? '' : 'mt-6 pt-6 border-t-2 border-gray-300'}>
      {label && (
        <label className="block text-sm font-semibold text-black mb-3 uppercase tracking-wide">
          {label}
        </label>
      )}
      {children}
    </div>
  )
}
