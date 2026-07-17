import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import CountryOriginMain from './pages/CountryOriginMain'
import CountryDetail from './pages/CountryDetail'
import SearchPage from './pages/SearchPage'
import ExplorePage from './pages/ExplorePage'
import FilmDetailPage from './pages/FilmDetailPage'
import CanonEvolution from './pages/CanonEvolution'
import DecadesPage from './pages/DecadesPage'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<div className="p-8 text-center">
          <h1 className="text-4xl font-bold mb-4">Sight & Sound Canon Explorer</h1>
          <p className="text-gray-600 mb-8">Landing page coming soon...</p>
          <a href="/visualizations/country" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">
            View Country Visualizations →
          </a>
        </div>} />
        <Route path="/visualizations/country" element={<CountryOriginMain />} />
        <Route path="/visualizations/country/:countryName" element={<CountryDetail />} />
        <Route path="/visualizations/evolution" element={<CanonEvolution />} />
        <Route path="/visualizations/decades" element={<DecadesPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/film/:key" element={<FilmDetailPage />} />
      </Routes>
    </Router>
  )
}

export default App
