import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useSearchParams, useLocation } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import CountryOriginMain from './pages/CountryOriginMain'
import CountryDetail from './pages/CountryDetail'
import ExplorePage from './pages/ExplorePage'
import FilmDetailPage from './pages/FilmDetailPage'
import CanonEvolution from './pages/CanonEvolution'
import DecadesPage from './pages/DecadesPage'

// The former Database page (/search) is now the unified /explore surface.
// Redirect old links (including bookmarked ?poll= deep links) there.
function SearchRedirect() {
  const [params] = useSearchParams()
  const next = new URLSearchParams(params)
  if (!next.get('poll')) next.set('poll', 'all')
  return <Navigate to={`/explore?${next.toString()}`} replace />
}

// Reset scroll to the top whenever the route (pathname) changes. Keyed to
// pathname only — changing filters/view on /explore updates the query string
// but should keep your place, so we intentionally ignore search-param changes.
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/visualizations/country" element={<CountryOriginMain />} />
        <Route path="/visualizations/country/:countryName" element={<CountryDetail />} />
        <Route path="/visualizations/evolution" element={<CanonEvolution />} />
        <Route path="/visualizations/decades" element={<DecadesPage />} />
        <Route path="/search" element={<SearchRedirect />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/film/:key" element={<FilmDetailPage />} />
      </Routes>
    </Router>
  )
}

export default App
