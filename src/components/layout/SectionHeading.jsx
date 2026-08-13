/**
 * A section on a detail page: a ruled line, a small caps heading, and room on
 * the right for controls that belong to this section alone.
 *
 * Deliberately much lighter than <VizCard> — the hub pages frame each chart in a
 * heavy box because each is a self-contained instrument, while a detail page
 * reads top to bottom and a stack of boxes turns into more frame than content.
 *
 * `action` is for controls scoped to this section (a sort toggle); anything
 * governing the whole page belongs in the filter rail instead.
 */
export default function SectionHeading({ title, note, action }) {
  return (
    <div className="mb-3 border-b-2 border-black pb-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2 className="text-xl font-black uppercase tracking-tight">{title}</h2>
      {note && <span className="text-xs text-gray-500">{note}</span>}
      {action}
    </div>
  )
}

/** A pair of mutually exclusive options, sized to sit on a SectionHeading. */
export function HeadingToggle({ value, onChange, options }) {
  return (
    <div className="flex border-2 border-black self-center">
      {options.map(([optValue, label]) => (
        <button
          key={optValue}
          type="button"
          onClick={() => onChange(optValue)}
          aria-pressed={value === optValue}
          className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors ${
            value === optValue ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
