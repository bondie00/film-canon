import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useSearchParams, useLocation, useParams } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import CountryOriginMain from './pages/CountryOriginMain'
import CountryDetail from './pages/CountryDetail'
import DirectorsMain from './pages/DirectorsMain'
import GenresMain from './pages/GenresMain'
import ExplorePage from './pages/ExplorePage'
import FilmDetailPage from './pages/FilmDetailPage'
import DirectorDetailPage from './pages/DirectorDetailPage'
import VoterDetailPage from './pages/VoterDetailPage'
import CanonEvolution from './pages/CanonEvolution'
import DecadesPage from './pages/DecadesPage'
import NotFound from './components/layout/NotFound'
import PageShell from './components/layout/PageShell'
import { PUBLIC_MODE } from './lib/siteMode'

// The former Database page (/search) is now the unified /explore surface.
// Redirect old links (including bookmarked ?poll= deep links) there.
function SearchRedirect() {
  const [params] = useSearchParams()
  const next = new URLSearchParams(params)
  if (!next.get('poll')) next.set('poll', 'all')
  return <Navigate to={`/explore?${next.toString()}`} replace />
}

// The country hub graduated out of /visualizations into its own top-level
// /countries section. Redirect the old paths (preserving ?poll= and the
// country name) so existing links and bookmarks keep working.
function CountryHubRedirect() {
  const { search } = useLocation()
  return <Navigate to={`/countries${search}`} replace />
}
function CountryDetailRedirect() {
  const { countryName } = useParams()
  const { search } = useLocation()
  return <Navigate to={`/countries/${encodeURIComponent(countryName)}${search}`} replace />
}

// Director pages shipped at the singular /director/:name, before /directors
// existed as a hub. Now that it does, the pair matches countries: a plural hub
// with its detail pages beneath it. Redirect the old singular path — it's the
// address in every link that was shared or bookmarked before this.
function DirectorDetailRedirect() {
  const { name } = useParams()
  const { search } = useLocation()
  return <Navigate to={`/directors/${encodeURIComponent(name)}${search}`} replace />
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
        {/* The public cut: the routes every build has. */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/search" element={<SearchRedirect />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/film/:key" element={<FilmDetailPage />} />
        <Route path="/voter/:slug" element={<VoterDetailPage />} />

        {/* The hubs, their detail pages and the single-chart visualizations:
            full build only. See lib/siteMode.js. */}
        {!PUBLIC_MODE && (
          <>
            <Route path="/countries" element={<CountryOriginMain />} />
            <Route path="/countries/:countryName" element={<CountryDetail />} />
            <Route path="/directors" element={<DirectorsMain />} />
            <Route path="/directors/:name" element={<DirectorDetailPage />} />
            <Route path="/genres" element={<GenresMain />} />
            <Route path="/visualizations/country" element={<CountryHubRedirect />} />
            <Route path="/visualizations/country/:countryName" element={<CountryDetailRedirect />} />
            <Route path="/visualizations/evolution" element={<CanonEvolution />} />
            <Route path="/visualizations/decades" element={<DecadesPage />} />
            <Route path="/director/:name" element={<DirectorDetailRedirect />} />
          </>
        )}

        <Route path="*" element={<PageShell><NotFound title="Page not found" body="Nothing lives at this address." /></PageShell>} />
      </Routes>
    </Router>
  )
}

export default App
