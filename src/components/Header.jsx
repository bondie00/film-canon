import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import GlobalSearch from './search/GlobalSearch'

// The Visualizations menu holds the pages that are a chart and nothing else.
// Countries and Directors are not in it: they're entity SECTIONS — a hub over a
// set of detail pages, each with its own address — and they sit beside Explore
// at the top level. Directors was in this menu until it got its own hub and
// /directors/:name detail pages, which made it Countries' twin and left the two
// halves of the same pair reached by different means.
const VIZ_LINKS = [
  { to: '/visualizations/decades', label: 'By Decade & Age' },
  { to: '/visualizations/evolution', label: 'Canon Evolution' },
]

export default function Header() {
  const [vizOpen, setVizOpen] = useState(false)
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

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/">
              <h1 className="text-2xl font-bold text-gray-900">
                Sight & Sound Canon Explorer
              </h1>
            </Link>
          </div>

          {/* Global search — persistent across pages (lg+ to avoid crowding the bar) */}
          <div className="hidden lg:block flex-1 max-w-xs mx-8">
            <GlobalSearch variant="nav" />
          </div>

          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-700 hover:text-gray-900 font-medium">
              Home
            </Link>
            <Link to="/explore" className="text-gray-700 hover:text-gray-900 font-medium">
              Explore
            </Link>
            <Link to="/countries" className="text-gray-700 hover:text-gray-900 font-medium">
              Countries
            </Link>
            <Link to="/directors" className="text-gray-700 hover:text-gray-900 font-medium">
              Directors
            </Link>

            {/* Visualizations dropdown */}
            <div className="relative" ref={vizRef}>
              <button
                onClick={() => setVizOpen(o => !o)}
                className="flex items-center gap-1 text-gray-700 hover:text-gray-900 font-medium"
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

            <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">
              About
            </a>
            <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">
              Blog
            </a>
          </nav>
        </div>
      </div>
    </header>
  )
}
