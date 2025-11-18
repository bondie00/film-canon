import { useState } from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'

export default function CountryOriginMain() {
  // Filter state (not functional yet - Phase 2)
  const [selectedPoll, setSelectedPoll] = useState('2022')
  const [rankRange, setRankRange] = useState('all')

  // Helper function to generate filter description text
  const getFilterText = () => {
    const pollText = selectedPoll === 'all'
      ? 'All Polls Combined'
      : `${selectedPoll} Poll`

    const rankText = rankRange === 'all'
      ? 'All Films'
      : `Top ${rankRange.replace('top', '')} Films`

    return `${pollText} • ${rankText}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-12 gap-8">

          {/* LEFT SIDEBAR - STICKY FILTERS */}
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-white rounded-lg shadow-md p-6 lg:sticky lg:top-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Filters</h2>

              {/* POLL SELECTION FILTER */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Poll Selection
                </label>
                <select
                  value={selectedPoll}
                  onChange={(e) => setSelectedPoll(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Polls Combined</option>
                  <option value="2022">2022 (Latest)</option>
                  <option value="2012">2012</option>
                  <option value="2002">2002</option>
                  <option value="1992">1992</option>
                  <option value="1982">1982</option>
                  <option value="1972">1972</option>
                  <option value="1962">1962</option>
                  <option value="1952">1952</option>
                </select>
              </div>

              {/* RANK RANGE FILTER */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Film Rank Range
                </label>
                <div className="space-y-2">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="rankRange"
                      value="all"
                      checked={rankRange === 'all'}
                      onChange={(e) => setRankRange(e.target.value)}
                      className="text-blue-600"
                    />
                    <span className="ml-2 text-sm text-gray-700">All Films (1-4851)</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="rankRange"
                      value="top100"
                      checked={rankRange === 'top100'}
                      onChange={(e) => setRankRange(e.target.value)}
                      className="text-blue-600"
                    />
                    <span className="ml-2 text-sm text-gray-700">Top 100 Only</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="rankRange"
                      value="top250"
                      checked={rankRange === 'top250'}
                      onChange={(e) => setRankRange(e.target.value)}
                      className="text-blue-600"
                    />
                    <span className="ml-2 text-sm text-gray-700">Top 250 Only</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="rankRange"
                      value="top500"
                      checked={rankRange === 'top500'}
                      onChange={(e) => setRankRange(e.target.value)}
                      className="text-blue-600"
                    />
                    <span className="ml-2 text-sm text-gray-700">Top 500 Only</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="rankRange"
                      value="top1000"
                      checked={rankRange === 'top1000'}
                      onChange={(e) => setRankRange(e.target.value)}
                      className="text-blue-600"
                    />
                    <span className="ml-2 text-sm text-gray-700">Top 1000 Only</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* MAIN CONTENT AREA - VISUALIZATIONS */}
          <div className="col-span-12 lg:col-span-9">

            {/* BREADCRUMB */}
            <div className="text-sm text-gray-500 mb-2">
              <a href="/visualizations" className="hover:text-gray-700">Visualizations</a>
              <span> / </span>
              <span className="text-gray-900">Films by Country of Origin</span>
            </div>

            {/* PAGE TITLE */}
            <h1 className="text-4xl font-bold text-gray-900 mb-6">Films by Country of Origin</h1>

            {/* INFO BANNER */}
            <div className="bg-gray-100 border border-gray-200 rounded-lg px-4 py-3 mb-8">
              <div className="text-sm text-gray-700">
                <span className="font-medium">Showing 117 countries across 3,817 films</span>
                <span className="mx-2 text-gray-400">|</span>
                <span className="text-gray-600">Filters: {getFilterText()}</span>
              </div>
            </div>

            {/* VISUALIZATION 1: WORLD MAP */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Global Distribution
                </h2>
                <p className="text-gray-600">
                  Darker colors indicate more films. Click any country to see detailed analysis.
                </p>
              </div>

              {/* PLACEHOLDER FOR WORLD MAP */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded border-2 border-dashed border-gray-300 h-[500px] flex items-center justify-center">
                <div className="text-center text-gray-500 max-w-2xl p-6">
                  <div className="text-6xl mb-4">🗺️</div>
                  <div className="font-bold text-xl mb-3 text-gray-700">Interactive World Map - Choropleth</div>
                  <div className="text-sm space-y-2">
                    <p>• Countries colored by film count (gradient from light to dark)</p>
                    <p>• Hover to see country name and exact film count</p>
                    <p>• Click any country to navigate to that country's detail page</p>
                    <p>• Legend showing color scale</p>
                  </div>
                  <div className="mt-6 text-xs text-gray-400 italic">
                    [Phase 3: D3.js implementation]
                  </div>
                </div>
              </div>

              {/* Map Legend */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm">
                <span className="text-gray-600 font-medium">Film Count:</span>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-4 bg-blue-100 border border-gray-300"></div>
                  <span className="text-gray-600">1-10</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-4 bg-blue-300 border border-gray-300"></div>
                  <span className="text-gray-600">10-50</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-4 bg-blue-500 border border-gray-300"></div>
                  <span className="text-gray-600">50-100</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-4 bg-blue-700 border border-gray-300"></div>
                  <span className="text-gray-600">100-500</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-4 bg-blue-900 border border-gray-300"></div>
                  <span className="text-gray-600">500+</span>
                </div>
              </div>
            </div>

            {/* VISUALIZATION 2: BAR CHART - TOP COUNTRIES */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-6 gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Top Countries by Film Count
                  </h2>
                  <p className="text-gray-600">
                    Compare the most represented nations in the canon
                  </p>
                </div>

                {/* Customization Options */}
                <div className="flex items-center gap-3">
                  <select className="px-3 py-1 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Show Top 10</option>
                    <option>Show Top 15</option>
                    <option>Show Top 20</option>
                    <option>Show Top 30</option>
                  </select>
                </div>
              </div>

              {/* PLACEHOLDER FOR BAR CHART */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded border-2 border-dashed border-gray-300 h-[400px] flex items-center justify-center">
                <div className="text-center text-gray-500 max-w-2xl p-6">
                  <div className="text-6xl mb-4">📊</div>
                  <div className="font-bold text-xl mb-3 text-gray-700">Horizontal Bar Chart</div>
                  <div className="text-sm space-y-2">
                    <p>• Bars sorted by film count (highest to lowest)</p>
                    <p>• Y-axis: Country names | X-axis: Number of films</p>
                    <p>• Click bar to navigate to country page</p>
                    <p>• Hover to see exact count and percentage</p>
                    <p>• Color-coded by continent</p>
                  </div>
                  <div className="mt-6 text-xs text-gray-400 italic">
                    [Phase 3: Recharts implementation]
                  </div>
                </div>
              </div>
            </div>

            {/* VISUALIZATION 3: DECADE HEATMAP */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Films by Decade and Country
                </h2>
                <p className="text-gray-600">
                  When were films produced that appear in the canon? See which decades shaped each nation's contribution.
                </p>
              </div>

              {/* PLACEHOLDER FOR HEATMAP */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded border-2 border-dashed border-gray-300 h-[500px] flex items-center justify-center">
                <div className="text-center text-gray-500 max-w-2xl p-6">
                  <div className="text-6xl mb-4">🔥</div>
                  <div className="font-bold text-xl mb-3 text-gray-700">Interactive Heatmap</div>
                  <div className="text-sm space-y-2">
                    <p>• Y-axis: Top 20-30 countries</p>
                    <p>• X-axis: Decades (1910s, 1920s... 2020s)</p>
                    <p>• Cell color intensity = number of films</p>
                    <p>• Hover: "France, 1960s: 68 films (New Wave era)"</p>
                    <p>• Reveals patterns like France's 1960s dominance</p>
                  </div>
                  <div className="mt-6 text-xs text-gray-400 italic">
                    [Phase 3: Custom/D3 implementation]
                  </div>
                </div>
              </div>

              {/* Heatmap Legend */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm">
                <span className="text-gray-600 font-medium">Films per decade:</span>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-4 bg-blue-100 border border-gray-300"></div>
                  <span className="text-gray-600">1-5</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-4 bg-blue-300 border border-gray-300"></div>
                  <span className="text-gray-600">5-15</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-4 bg-blue-500 border border-gray-300"></div>
                  <span className="text-gray-600">15-30</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-4 bg-blue-700 border border-gray-300"></div>
                  <span className="text-gray-600">30-50</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-4 bg-blue-900 border border-gray-300"></div>
                  <span className="text-gray-600">50+</span>
                </div>
              </div>
            </div>

            {/* VISUALIZATION 4: TREEMAP - CONTINENTAL BREAKDOWN */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Continental & Country Breakdown
                </h2>
                <p className="text-gray-600">
                  See both continent-level patterns and individual country contributions.
                  Size represents film count.
                </p>
              </div>

              {/* Simple stacked bar for continental overview */}
              <div className="mb-6">
                <div className="text-sm font-medium text-gray-700 mb-2">Continental Distribution</div>
                <div className="flex h-8 rounded overflow-hidden shadow-sm">
                  <div className="bg-blue-500 flex items-center justify-center text-white text-xs font-semibold" style={{width: '45%'}}>
                    Europe 45%
                  </div>
                  <div className="bg-green-500 flex items-center justify-center text-white text-xs font-semibold" style={{width: '28%'}}>
                    Asia 28%
                  </div>
                  <div className="bg-purple-500 flex items-center justify-center text-white text-xs font-semibold" style={{width: '20%'}}>
                    N. America 20%
                  </div>
                  <div className="bg-orange-500 flex items-center justify-center text-white text-xs font-semibold" style={{width: '5%'}}>
                    L.Am 5%
                  </div>
                  <div className="bg-red-500 flex items-center justify-center text-white text-xs font-semibold" style={{width: '1.5%'}}>
                    AF
                  </div>
                  <div className="bg-pink-500 flex items-center justify-center text-white text-xs font-semibold" style={{width: '0.5%'}}>
                    OC
                  </div>
                </div>
              </div>

              {/* PLACEHOLDER FOR TREEMAP */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded border-2 border-dashed border-gray-300 h-[600px] flex items-center justify-center">
                <div className="text-center text-gray-500 max-w-2xl p-6">
                  <div className="text-6xl mb-4">🗂️</div>
                  <div className="font-bold text-xl mb-3 text-gray-700">Interactive Treemap Visualization</div>
                  <div className="text-sm space-y-3">
                    <div>
                      <strong className="text-gray-700">Structure:</strong><br/>
                      Large rectangles = Continents (sized by total films)<br/>
                      Nested rectangles = Individual countries
                    </div>
                    <div>
                      <strong className="text-gray-700">Interactions:</strong><br/>
                      • Hover: "France: 679 films (15.9% of Europe, 7.2% of total)"<br/>
                      • Click country: Navigate to detail page<br/>
                      • Click continent: Filter view to that continent
                    </div>
                  </div>
                  <div className="mt-6 text-xs text-gray-400 italic">
                    [Phase 3: Recharts treemap implementation]
                  </div>
                </div>
              </div>

              {/* Continent Color Legend */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-500 rounded border border-gray-300"></div>
                  <span className="text-gray-700 font-medium">Europe</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-500 rounded border border-gray-300"></div>
                  <span className="text-gray-700 font-medium">Asia</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-purple-500 rounded border border-gray-300"></div>
                  <span className="text-gray-700 font-medium">North America</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-orange-500 rounded border border-gray-300"></div>
                  <span className="text-gray-700 font-medium">Latin America</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-red-500 rounded border border-gray-300"></div>
                  <span className="text-gray-700 font-medium">Africa</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-pink-500 rounded border border-gray-300"></div>
                  <span className="text-gray-700 font-medium">Oceania</span>
                </div>
              </div>
            </div>

            {/* KEY INSIGHTS SECTION */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="text-3xl mr-3">💡</span>
                Key Geographic Insights
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Domination Patterns</h3>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    <li>• USA represents 1,780 films (37% of all films in the dataset)</li>
                    <li>• Europe remains the most represented continent at 45%</li>
                    <li>• France leads Europe with 679 films</li>
                    <li>• Japan is the most represented Asian country with 247 films</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Temporal Patterns</h3>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    <li>• France's 1960s dominance reflects the New Wave movement</li>
                    <li>• Japan's golden age (1950s) heavily represented with Kurosawa/Ozu</li>
                    <li>• Recent decades show growth from East Asian cinema (Korea, China)</li>
                    <li>• African and Oceanian representation remains minimal but growing</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* NAVIGATION: EXPLORE SPECIFIC COUNTRIES */}
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
                Explore Individual Countries
              </h2>
              <p className="text-gray-600 text-center mb-6">
                Dive deep into any country's cinematic contribution with detailed analysis,
                rank progressions, and notable films
              </p>

              {/* Search Bar */}
              <div className="max-w-xl mx-auto mb-8">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search for a country (e.g., France, Japan, Brazil)..."
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                  <button className="absolute right-2 top-2 px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors">
                    Go
                  </button>
                </div>
              </div>

              {/* Popular Countries Quick Links */}
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-600 mb-3">Popular Countries:</div>
                <div className="flex flex-wrap justify-center gap-3">
                  <a href="#" className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-blue-100 hover:text-blue-700 font-medium text-sm transition-colors">
                    🇺🇸 United States
                  </a>
                  <a href="#" className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-blue-100 hover:text-blue-700 font-medium text-sm transition-colors">
                    🇫🇷 France
                  </a>
                  <a href="#" className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-blue-100 hover:text-blue-700 font-medium text-sm transition-colors">
                    🇯🇵 Japan
                  </a>
                  <a href="#" className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-blue-100 hover:text-blue-700 font-medium text-sm transition-colors">
                    🇮🇹 Italy
                  </a>
                  <a href="#" className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-blue-100 hover:text-blue-700 font-medium text-sm transition-colors">
                    🇬🇧 United Kingdom
                  </a>
                  <a href="#" className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-blue-100 hover:text-blue-700 font-medium text-sm transition-colors">
                    🇩🇪 Germany
                  </a>
                  <a href="#" className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-blue-100 hover:text-blue-700 font-medium text-sm transition-colors">
                    🇮🇳 India
                  </a>
                  <a href="#" className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-blue-100 hover:text-blue-700 font-medium text-sm transition-colors">
                    🇰🇷 South Korea
                  </a>
                  <a href="#" className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-blue-100 hover:text-blue-700 font-medium text-sm transition-colors">
                    🇧🇷 Brazil
                  </a>
                  <a href="#" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium text-sm transition-colors">
                    View All 117 Countries →
                  </a>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
