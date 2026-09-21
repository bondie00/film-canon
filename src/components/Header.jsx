import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import GlobalSearch from './search/GlobalSearch'
import { PUBLIC_MODE } from '../lib/siteMode'

export default function Header() {
  const [vizOpen, setVizOpen] = useState(false)
  const linkCls = 'text-gray-700 hover:text-black font-medium'
  // The homepage has its own, larger search box in the hero; a second one in
  // the bar above it would be the same control twice on one screen.
  const onHome = useLocation().pathname === '/'
  const vizRef = useRef(null)

  // Close the dropdown when clicking outside it.
  useEffect(() => {
    if (!vizOpen) return
    const onClick = (e) => {
      if (vizRef.current && !vizRef.current.contains(e.target)) setVizOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [vizOpen])

  // A hatched off-white bar on the hero's own 2px black rule. Plain white
  // merged with the hero below it into one slab; solid black was too heavy.
  return (
    <header className="surface-hatch text-black border-b-2 border-black">
      <div className="max-w-7xl 3xl:max-w-wide mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center">
            <Link to="/">
              {/* Mixed case and bold, as it was: set in the hero's caps it read as a
                  different face. Only the size grew. */}
              <h1 className="text-3xl font-bold whitespace-nowrap">
                Cinema Canon
              </h1>
            </Link>
          </div>

          {/* Global search — persistent across pages (lg+ to avoid crowding the
              bar). It takes whatever width the name and nav leave, up to a cap
              that keeps it a search box rather than a banner. */}
          <div className="hidden lg:block flex-1 max-w-xl mx-8">
            {!onHome && <GlobalSearch variant="nav" />}
          </div>

          <nav className="hidden md:flex items-center space-x-8">
            {/* No Home link: the site name at the left is the way home. */}
            <Link to="/explore" className={linkCls}>
              Explore
            </Link>
            {/* The entity sections and the Visualizations menu belong to the
                full build. The public cut's nav is Home and Explore. */}
            {!PUBLIC_MODE && (
              <>
                <Link to="/countries" className={linkCls}>
                  Countries
                </Link>
                <Link to="/directors" className={linkCls}>
                  Directors
                </Link>
                <Link to="/genres" className={linkCls}>
                  Genres
                </Link>

                {/* Visualizations dropdown */}
                <div className="relative" ref={vizRef}>
                  <button
                    onClick={() => setVizOpen(o => !o)}
                    className={`flex items-center gap-1 ${linkCls}`}
                    aria-expanded={vizOpen}
                    aria-haspopup="true"
                  >
                    Visualizations
                    <span className={`text-xs transition-transform ${vizOpen ? 'rotate-180' : ''}`}>▾</span>
                  </button>
                  {vizOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 shadow-lg rounded-md py-1 z-20">
                      {VIZ_LINKS.map(item =>
                        item.soon ? (
                          <div
                            key={item.label}
                            className="flex items-center justify-between px-4 py-2 text-sm text-gray-400 cursor-default"
                          >
                            {item.label}
                            <span className="text-[10px] uppercase tracking-wide font-bold">Soon</span>
                          </div>
                        ) : (
                          <Link
                            key={item.label}
                            to={item.to}
                            onClick={() => setVizOpen(false)}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-medium"
                          >
                            {item.label}
                          </Link>
                        )
                      )}
                    </div>
                  )}
                </div>

                {/* About and Blog do not exist yet; the placeholders stay out
                    of the public cut. */}
                <a href="#" className={linkCls}>
                  About
                </a>
                <a href="#" className={linkCls}>
                  Blog
                </a>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
