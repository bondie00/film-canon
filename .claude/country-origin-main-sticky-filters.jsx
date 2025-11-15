import React from 'react';

export default function CountryOriginMainPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Sight & Sound Canon Explorer</h1>
            </div>
            <nav className="flex space-x-8">
              <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">Home</a>
              <a href="#" className="text-blue-600 font-medium border-b-2 border-blue-600">Visualizations</a>
              <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">Database</a>
              <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">About</a>
              <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">Blog</a>
            </nav>
          </div>
        </div>
      </header>

      {/* PAGE TITLE & BREADCRUMB */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-sm text-gray-500 mb-2">
            <a href="#" className="hover:text-gray-700">Visualizations</a> /
            <span className="text-gray-900"> Films by Country of Origin</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900">Films by Country of Origin</h1>
          <p className="text-lg text-gray-600 mt-2">
            Explore how different nations and continents are represented across the Sight & Sound canon
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-12 gap-8">

          {/* LEFT SIDEBAR - STICKY FILTERS */}
          <div className="col-span-3">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Filters</h2>

              {/* POLL YEAR FILTER */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Poll Selection
                </label>

                {/* Filter Mode Radio Buttons */}
                <div className="space-y-2 mb-4">
                  <label className="flex items-center cursor-pointer">
                    <input type="radio" name="pollMode" className="text-blue-600" defaultChecked />
                    <span className="ml-2 text-sm text-gray-700">Single Poll</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input type="radio" name="pollMode" className="text-blue-600" />
                    <span className="ml-2 text-sm text-gray-700">All Polls Combined</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input type="radio" name="pollMode" className="text-blue-600" />
                    <span className="ml-2 text-sm text-gray-700">Compare Two Polls</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input type="radio" name="pollMode" className="text-blue-600" />
                    <span className="ml-2 text-sm text-gray-700">Date Range</span>
                  </label>
                </div>

                {/* Single Poll Dropdown (shown when "Single Poll" selected) */}
                <div className="mb-3">
                  <label className="block text-xs text-gray-600 mb-1">Select Poll Year</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>2022 (Latest)</option>
                    <option>2012</option>
                    <option>2002</option>
                    <option>1992</option>
                    <option>1982</option>
                    <option>1972</option>
                    <option>1962</option>
                    <option>1952</option>
                  </select>
                </div>

                {/* Compare Two Polls Dropdowns (shown when "Compare" selected) */}
                <div className="space-y-2 text-xs text-gray-500 bg-gray-50 p-3 rounded">
                  <div className="flex items-center gap-2">
                    <select className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs bg-white">
                      <option>2022</option>
                      <option>2012</option>
                      <option>2002</option>
                    </select>
                    <span>vs</span>
                    <select className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs bg-white">
                      <option>2012</option>
                      <option>2002</option>
                      <option>1992</option>
                    </select>
                  </div>
                  <div className="text-xs italic">Shows changes between polls</div>
                </div>

                {/* Date Range Inputs (shown when "Date Range" selected) */}
                <div className="space-y-2 text-xs text-gray-500 bg-gray-50 p-3 rounded">
                  <div className="flex items-center gap-2">
                    <input type="number" placeholder="1952" min="1952" max="2022"
                           className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs" />
                    <span>to</span>
                    <input type="number" placeholder="2022" min="1952" max="2022"
                           className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs" />
                  </div>
                  <div className="text-xs italic">Combines multiple polls</div>
                </div>
              </div>

              {/* RANK RANGE FILTER */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Film Rank Range
                </label>
                <div className="space-y-2">
                  <label className="flex items-center cursor-pointer">
                    <input type="radio" name="rankRange" className="text-blue-600" defaultChecked />
                    <span className="ml-2 text-sm text-gray-700">All Films (1-4851)</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input type="radio" name="rankRange" className="text-blue-600" />
                    <span className="ml-2 text-sm text-gray-700">Top 100 Only</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input type="radio" name="rankRange" className="text-blue-600" />
                    <span className="ml-2 text-sm text-gray-700">Top 250 Only</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input type="radio" name="rankRange" className="text-blue-600" />
                    <span className="ml-2 text-sm text-gray-700">Top 500 Only</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input type="radio" name="rankRange" className="text-blue-600" />
                    <span className="ml-2 text-sm text-gray-700">Top 1000 Only</span>
                  </label>
                </div>
              </div>

              {/* CURRENT FILTER SUMMARY */}
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <div className="text-xs font-semibold text-blue-900 mb-2">Currently Showing:</div>
                <div className="text-sm text-blue-800">
                  <div className="mb-1">📅 2022 Poll</div>
                  <div className="mb-1">🎬 All 4,851 films</div>
                  <div className="text-xs text-blue-600 mt-2">119 countries represented</div>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="space-y-2">
                <button className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 font-semibold text-sm">
                  Apply Filters
                </button>
                <button className="w-full bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300 text-sm">
                  Reset All
                </button>
              </div>
            </div>
          </div>

          {/* MAIN CONTENT AREA - VISUALIZATIONS */}
          <div className="col-span-9">

            {/* QUICK STATS BAR */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <div className="text-3xl font-bold text-blue-600 mb-1">119</div>
                <div className="text-sm text-gray-600">Countries</div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <div className="text-3xl font-bold text-green-600 mb-1">6</div>
                <div className="text-sm text-gray-600">Continents</div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <div className="text-3xl font-bold text-purple-600 mb-1">USA</div>
                <div className="text-sm text-gray-600">Most Films (847)</div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <div className="text-3xl font-bold text-orange-600 mb-1">45%</div>
                <div className="text-sm text-gray-600">Europe's Share</div>
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
              <div className="bg-gray-100 rounded border-2 border-dashed border-gray-300 h-[500px] flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <div className="text-4xl mb-2">🗺️</div>
                  <div className="font-semibold mb-1">[Interactive World Map - Choropleth]</div>
                  <div className="text-sm max-w-md">
                    • Countries colored by film count (gradient from light to dark)<br/>
                    • Hover to see country name and exact film count<br/>
                    • Click any country to navigate to that country's detail page<br/>
                    • Legend showing color scale
                  </div>
                </div>
              </div>

              {/* Map Legend */}
              <div className="mt-4 flex items-center justify-center space-x-4 text-sm">
                <span className="text-gray-600 font-medium">Film Count:</span>
                <div className="flex items-center space-x-1">
                  <div className="w-8 h-4" style={{backgroundColor: '#eff6ff'}}></div>
                  <span className="text-gray-600">1-10</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-8 h-4" style={{backgroundColor: '#bfdbfe'}}></div>
                  <span className="text-gray-600">10-50</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-8 h-4" style={{backgroundColor: '#60a5fa'}}></div>
                  <span className="text-gray-600">50-100</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-8 h-4" style={{backgroundColor: '#2563eb'}}></div>
                  <span className="text-gray-600">100-500</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-8 h-4" style={{backgroundColor: '#1e3a8a'}}></div>
                  <span className="text-gray-600">500+</span>
                </div>
              </div>
            </div>

            {/* VISUALIZATION 2: BAR CHART - TOP COUNTRIES */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <div className="flex justify-between items-start mb-6">
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
                  <select className="px-3 py-1 border border-gray-300 rounded text-sm bg-white">
                    <option>Show Top 10</option>
                    <option>Show Top 15</option>
                    <option>Show Top 20</option>
                    <option>Show Top 30</option>
                  </select>
                  <button className="px-4 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 font-medium">
                    Customize Countries
                  </button>
                </div>
              </div>

              {/* PLACEHOLDER FOR BAR CHART */}
              <div className="bg-gray-100 rounded border-2 border-dashed border-gray-300 h-[400px] flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <div className="text-4xl mb-2">📊</div>
                  <div className="font-semibold mb-1">[Horizontal Bar Chart]</div>
                  <div className="text-sm max-w-md">
                    • Bars sorted by film count (highest to lowest)<br/>
                    • Y-axis: Country names<br/>
                    • X-axis: Number of films<br/>
                    • Click bar to navigate to country page<br/>
                    • Hover to see exact count and percentage<br/>
                    • Color-code by continent
                  </div>
                  <div className="text-xs mt-4 text-gray-400">
                    V2 Feature: "Customize Countries" opens modal to<br/>
                    add/remove specific countries for custom comparison
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
              <div className="bg-gray-100 rounded border-2 border-dashed border-gray-300 h-[500px] flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <div className="text-4xl mb-2">🔥</div>
                  <div className="font-semibold mb-1">[Interactive Heatmap]</div>
                  <div className="text-sm max-w-md">
                    • Y-axis: Top 20-30 countries<br/>
                    • X-axis: Decades (1910s, 1920s... 2020s)<br/>
                    • Cell color intensity = number of films<br/>
                    • Hover: "France, 1960s: 68 films (New Wave era)"<br/>
                    • Click cell: Show filtered list or modal<br/>
                    • Reveals patterns like France's 1960s dominance
                  </div>
                </div>
              </div>

              {/* Heatmap Legend */}
              <div className="mt-4 flex items-center justify-center space-x-4 text-sm">
                <span className="text-gray-600 font-medium">Films per decade:</span>
                <div className="flex items-center space-x-1">
                  <div className="w-8 h-4 bg-blue-100"></div>
                  <span className="text-gray-600">1-5</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-8 h-4 bg-blue-300"></div>
                  <span className="text-gray-600">5-15</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-8 h-4 bg-blue-500"></div>
                  <span className="text-gray-600">15-30</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-8 h-4 bg-blue-700"></div>
                  <span className="text-gray-600">30-50</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-8 h-4 bg-blue-900"></div>
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
                <div className="flex h-8 rounded overflow-hidden">
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
                    Latin Am. 5%
                  </div>
                  <div className="bg-red-500 flex items-center justify-center text-white text-xs font-semibold" style={{width: '1.5%'}}>
                    Africa
                  </div>
                  <div className="bg-pink-500 flex items-center justify-center text-white text-xs font-semibold" style={{width: '0.5%'}}>
                    Oceania
                  </div>
                </div>
              </div>

              {/* PLACEHOLDER FOR TREEMAP */}
              <div className="bg-gray-100 rounded border-2 border-dashed border-gray-300 h-[600px] flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <div className="text-4xl mb-2">🗂️</div>
                  <div className="font-semibold mb-1">[Interactive Treemap Visualization]</div>
                  <div className="text-sm max-w-2xl">
                    <div className="mb-4">
                      <strong>Structure:</strong><br/>
                      Large rectangles = Continents (sized by total films)<br/>
                      Nested rectangles within = Individual countries
                    </div>
                    <div className="mb-4">
                      <strong>Interactions:</strong><br/>
                      • Hover over country: "France: 347 films (15.9% of Europe, 7.2% of total)"<br/>
                      • Click country: Navigate to that country's detail page<br/>
                      • Click continent: Filter view to show only that continent
                    </div>
                    <div>
                      <strong>Key Insights:</strong><br/>
                      • USA dominates North America (one huge rectangle = 87%)<br/>
                      • Europe is diverse (France, Italy, UK, Germany all substantial)<br/>
                      • Japan is largest in Asia but India, China, Korea also visible
                    </div>
                  </div>
                </div>
              </div>

              {/* Continent Color Legend */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-500 rounded"></div>
                  <span className="text-gray-700 font-medium">Europe</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-500 rounded"></div>
                  <span className="text-gray-700 font-medium">Asia</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-purple-500 rounded"></div>
                  <span className="text-gray-700 font-medium">North America</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-orange-500 rounded"></div>
                  <span className="text-gray-700 font-medium">Latin America</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-red-500 rounded"></div>
                  <span className="text-gray-700 font-medium">Africa</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-pink-500 rounded"></div>
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
                  <ul className="space-y-2 text-gray-700">
                    <li>• USA represents 87% of all North American films on the list</li>
                    <li>• Europe remains the most represented continent at 45%</li>
                    <li>• France leads Europe with 347 films (31% of European total)</li>
                    <li>• Japan is the most represented Asian country with 289 films</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Temporal Patterns</h3>
                  <ul className="space-y-2 text-gray-700">
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
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                  <button className="absolute right-2 top-2 px-4 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                    Go
                  </button>
                </div>
              </div>

              {/* Popular Countries Quick Links */}
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-600 mb-3">Popular Countries:</div>
                <div className="flex flex-wrap justify-center gap-3">
                  <a href="#" className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 font-medium text-sm">
                    🇺🇸 United States
                  </a>
                  <a href="#" className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 font-medium text-sm">
                    🇫🇷 France
                  </a>
                  <a href="#" className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 font-medium text-sm">
                    🇯🇵 Japan
                  </a>
                  <a href="#" className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 font-medium text-sm">
                    🇮🇹 Italy
                  </a>
                  <a href="#" className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 font-medium text-sm">
                    🇬🇧 United Kingdom
                  </a>
                  <a href="#" className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 font-medium text-sm">
                    🇩🇪 Germany
                  </a>
                  <a href="#" className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 font-medium text-sm">
                    🇮🇳 India
                  </a>
                  <a href="#" className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 font-medium text-sm">
                    🇰🇷 South Korea
                  </a>
                  <a href="#" className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 font-medium text-sm">
                    🇧🇷 Brazil
                  </a>
                  <a href="#" className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 font-medium text-sm">
                    View All 119 Countries →
                  </a>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-gray-400 py-12 mt-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-white font-bold mb-4">Sight & Sound Canon Explorer</h3>
              <p className="text-sm">
                A comprehensive visualization and database of every film voted for in
                the 2022 Sight & Sound Greatest Films Poll.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Visualizations</a></li>
                <li><a href="#" className="hover:text-white">Database</a></li>
                <li><a href="#" className="hover:text-white">Methodology</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Data Source</h4>
              <p className="text-sm mb-2">
                All data from the official Sight & Sound 2022 Greatest Films Poll.
              </p>
              <a href="#" className="text-blue-400 hover:text-blue-300 text-sm">
                Learn more about Sight & Sound →
              </a>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>© 2025 Sight & Sound Canon Explorer. Data © British Film Institute.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
