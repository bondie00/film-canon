import Header from '../Header'
import Footer from '../Footer'

/**
 * The outer chrome every page shares: page background, header, a centred
 * content column, footer. Nothing else — pages that want the sidebar layout
 * wrap their content in <SidebarLayout>.
 *
 * `width` picks the column. The hub and detail pages run `wide` (max-w-7xl),
 * which is what a 3/9 split and a world map need; the film and voter pages run
 * `narrow` (max-w-5xl), since a single column of prose and small charts set to
 * the full width would run to unreadable line lengths. Those two pages each had
 * their own copy of this wrapper before the option existed — the voter page's
 * was a verbatim duplicate, the film page's differed only in that number.
 *
 * `bleed` renders edge to edge between the header and the column, for the film
 * page's backdrop hero. It's a slot rather than a prop on the content because
 * the band has to escape the column's max-width while what's inside it stays
 * aligned to that same column.
 */
const WIDTHS = {
  wide: 'max-w-7xl',
  narrow: 'max-w-5xl',
}

export default function PageShell({ children, width = 'wide', bleed = null }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      {bleed}
      <div className={`${WIDTHS[width]} mx-auto px-4 sm:px-6 lg:px-8 py-8`}>{children}</div>
      <Footer />
    </div>
  )
}

/**
 * The 3/9 split used by the country and director sections: a sticky filter rail
 * on the left, visualizations on the right, stacking on small screens.
 */
export function SidebarLayout({ sidebar, children }) {
  return (
    <div className="grid grid-cols-12 gap-8">
      <div className="col-span-12 lg:col-span-3">{sidebar}</div>
      <div className="col-span-12 lg:col-span-9">{children}</div>
    </div>
  )
}
