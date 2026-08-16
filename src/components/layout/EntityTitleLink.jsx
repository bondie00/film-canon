import { Link } from 'react-router-dom'

/**
 * An entity's name as the heading of a panel, linking through to its own page.
 *
 * The arrow is the whole point: inside an expanded panel the name is already the
 * biggest text on screen, so nothing about it reads as a link — the underline
 * only appears once you're on it. The arrow says "this goes somewhere" before
 * you hover, and points out of the box to say the destination is a new page
 * rather than more of this panel.
 *
 * There were three copies of this: CountryPanel and WorldMapChoropleth each
 * declared an identical local CountryTitleLink, and DirectorPanel inlined the
 * same markup. Panels opened from the map, the bar chart and the beeswarm all
 * have to look like the same object, which is exactly the thing three copies
 * stop guaranteeing.
 */
export default function EntityTitleLink({ to, name }) {
  return (
    <Link
      to={to}
      className="group inline-flex items-center gap-1.5 hover:underline decoration-2 underline-offset-2"
    >
      <span>{name}</span>
      <svg
        className="w-4 h-4 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M7 17L17 7M17 7H8M17 7v9" />
      </svg>
    </Link>
  )
}
