import { Fragment } from 'react'
import { Link } from 'react-router-dom'

/**
 * The opening of a detail page: trail back to the hub, an optional accent chip,
 * the name at full size, and one dense line of metadata.
 *
 * Typographic, no imagery — the content below carries the page. The ONE header
 * for all four hub and detail pages; it was written for the director page, and
 * the other three opened with an underlined h1 over a bordered InfoBanner box
 * until this replaced them (both of those components are now deleted). The hubs
 * pass no crumb and no chip, which is the only difference between them.
 *
 * It sits ABOVE the SidebarLayout on every page, never inside it: a title names
 * the whole page including the filter rail, and inset into the 9-column content
 * area it read as a label for the charts alone.
 *
 * The FACTS RESPOND TO THE FILTERS. Every figure describes the set the rail
 * currently selects, and the last fact names that selection in grey. The filter
 * rail holds controls and nothing else — a readout down there was small print in
 * a pane meant to be operated rather than read, and it left the page's headline
 * numbers describing a set nobody had asked for.
 *
 * So labels must not over-claim: "587 films", not "587 films in the canon", since
 * at Top 100 it is neither the canon nor 587.
 *
 * `facts` is an array of nodes rather than strings because they carry mixed
 * emphasis and links (a bold count with a plain label, a run of country links).
 * They're joined with middots here so no caller has to punctuate.
 *
 * `chip` is the accent: a small colour block above the name. The country page
 * gives it the continent, which is the only categorical fact a country has and
 * the same colour that keys its charts.
 */
export default function DetailHeader({ crumb, chip, title, facts = [] }) {
  const shown = facts.filter(Boolean)

  return (
    <div className="pt-2 pb-8">
      {crumb && (
        <Link
          to={crumb.to}
          className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-black"
        >
          ← {crumb.label}
        </Link>
      )}

      {chip && (
        <div className="mt-3">
          <span
            className="inline-block px-2 py-1 text-white text-xs font-bold uppercase tracking-wide"
            style={{ backgroundColor: chip.color }}
          >
            {chip.label}
          </span>
        </div>
      )}

      <h1 className="mt-3 text-5xl sm:text-6xl font-black text-black uppercase tracking-tight leading-none">
        {title}
      </h1>

      {shown.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-lg text-gray-600">
          {shown.map((fact, i) => (
            <Fragment key={i}>
              {i > 0 && <span className="text-gray-300">·</span>}
              {fact}
            </Fragment>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * A bold figure with a plain label after it — the shape most facts take. The
 * label is optional, for values that already read as a phrase ("4,208 votes").
 */
export function Figure({ value, children }) {
  return (
    <span>
      <span className="font-bold text-black tabular-nums">{value}</span>
      {children ? <> {children}</> : null}
    </span>
  )
}
