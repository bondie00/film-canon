import { BrowserRouter as Router, Routes, Route, Navigate, useSearchParams } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import CountryOriginMain from './pages/CountryOriginMain'
import CountryDetail from './pages/CountryDetail'
import ExplorePage from './pages/ExplorePage'
import FilmDetailPage from './pages/FilmDetailPage'
import CanonEvolution from './pages/CanonEvolution'
import DecadesPage from './pages/DecadesPage'

// The former Database page is now the List view of /explore. Redirect old links
// (including bookmarked ?poll= deep links) to the unified surface.
function SearchRedirect() {
  const [params] = useSearchParams()
  const next = new URLSearchParams(params)
  next.set('view', 'list')
  if (!next.get('poll')) next.set('poll', 'all')
  return <Navigate to={`/explore?${next.toString()}`} replace />
}

function App() {
  return (
    <Router>
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
