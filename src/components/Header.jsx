import { Link } from 'react-router-dom'

export default function Header() {
  return (
    <header className="bg-cream shadow-sm border-b border-brown">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/">
              <h1 className="text-2xl font-bold text-brown">
                Sight & Sound Canon Explorer
              </h1>
            </Link>
          </div>
          <nav className="hidden md:flex space-x-8">
            <Link to="/" className="text-brown/70 hover:text-brown font-medium">
              Home
            </Link>
            <Link
              to="/visualizations/country"
              className="text-blue-600 font-medium border-b-2 border-blue-600"
            >
              Visualizations
            </Link>
            <a href="#" className="text-brown/70 hover:text-brown font-medium">
              Database
            </a>
            <a href="#" className="text-brown/70 hover:text-brown font-medium">
              About
            </a>
            <a href="#" className="text-brown/70 hover:text-brown font-medium">
              Blog
            </a>
          </nav>
        </div>
      </div>
    </header>
  )
}
