import Header from '../Header'
import Footer from '../Footer'

/**
 * The outer chrome every page shares: page background, header, the max-w-7xl
 * content column, footer. Nothing else — pages that want the sidebar layout
 * wrap their content in <SidebarLayout>, and pages that run full width (the
 * landing page, a film page) just render children.
 */
export default function PageShell({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</div>
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
