import { Link } from 'react-router-dom'
import { PUBLIC_MODE } from '../lib/siteMode'

export default function Footer() {
  return (
    <footer className="surface-hatch border-t-2 border-black text-gray-600 py-12 mt-16">
      <div className="max-w-6xl 3xl:max-w-wide mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-black font-bold mb-4">
              Cinema Canon
            </h3>
            <p className="text-sm">
              A database of every film voted for in
              the Sight & Sound Greatest Films polls (1952-2022).
            </p>
          </div>
          <div>
            <h4 className="text-black font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-black">Home</Link></li>
              <li><Link to="/explore" className="hover:text-black">Explore</Link></li>
              {!PUBLIC_MODE && (
                <>
                  <li><Link to="/countries" className="hover:text-black">Countries</Link></li>
                  <li><Link to="/directors" className="hover:text-black">Directors</Link></li>
                  <li><Link to="/genres" className="hover:text-black">Genres</Link></li>
                </>
              )}
            </ul>
          </div>
          <div>
            <h4 className="text-black font-semibold mb-4">Data Source</h4>
            <p className="text-sm mb-2">
              All data from the official Sight & Sound Greatest Films polls.
            </p>
            <a
              href="https://www.bfi.org.uk/sight-and-sound"
              target="_blank"
              rel="noopener noreferrer"
              className="text-black underline hover:no-underline text-sm"
            >
              Learn more about Sight & Sound →
            </a>
          </div>
        </div>
        <div className="border-t border-gray-300 mt-8 pt-8 text-center text-sm">
          <p>© 2026 Cinema Canon. Data © British Film Institute.</p>
        </div>
      </div>
    </footer>
  )
}
