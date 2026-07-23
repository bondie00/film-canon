import { useState, useMemo, useCallback, useRef } from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup
} from 'react-simple-maps'
import { scaleQuantile } from 'd3-scale'
import { COUNTRY_NAME_TO_ISO } from './countryCodeMapping'
import GridTile, { withCurrent } from '../search/GridTile'

// Natural Earth 110m world topology - lower resolution for performance
const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"

// Split overseas territories so they don't get colored as their parent country.
// French Guiana is part of France's MultiPolygon but sits in South America.
function getPolygonAvgLon(polygon) {
  const ring = polygon[0]
  if (!ring || ring.length === 0) return 0
  return ring.reduce((sum, coord) => sum + coord[0], 0) / ring.length
}

function splitOverseasTerritories(geographies) {
  const result = []
  for (const geo of geographies) {
    // Only split France (ISO 250) - its MultiPolygon includes French Guiana
    if (geo.id !== "250" || geo.geometry?.type !== "MultiPolygon") {
      result.push(geo)
      continue
    }

    const mainPolygons = []
    const overseasPolygons = []

    for (const polygon of geo.geometry.coordinates) {
      // French Guiana is ~longitude -53; metropolitan France & Corsica are > -10
      if (getPolygonAvgLon(polygon) < -10) {
        overseasPolygons.push(polygon)
      } else {
        mainPolygons.push(polygon)
      }
    }

    if (mainPolygons.length > 0) {
      result.push({
        ...geo,
        geometry: { ...geo.geometry, coordinates: mainPolygons },
        rsmKey: geo.rsmKey + "-main"
      })
    }
    if (overseasPolygons.length > 0) {
      // Use a fake ID so it won't match any country data → gets NO_DATA_COLOR
      result.push({
        ...geo,
        id: "250-overseas",
        geometry: { ...geo.geometry, coordinates: overseasPolygons },
        rsmKey: geo.rsmKey + "-overseas"
      })
    }
  }
  return result
}

// Color palette for the choropleth - emerald shades to match Asia bar chart color (#10b981)
const COLOR_RANGE = [
  '#ecfdf5', // emerald-50
  '#d1fae5', // emerald-100
  '#a7f3d0', // emerald-200
  '#6ee7b7', // emerald-300
  '#34d399', // emerald-400
  '#10b981', // emerald-500 (Asia bar chart color)
  '#059669', // emerald-600
  '#047857', // emerald-700
  '#065741', // emerald-850 (interpolated)
]

const NO_DATA_COLOR = '#e5e7eb' // gray-200
const BORDER_COLOR = '#022c22' // emerald-950 - subtle dark border to separate countries

export default function WorldMapChoropleth({ countriesData, filmsData, selectedPoll, rankRange, metric = 'films' }) {
  // The quantity that drives color, ranking and visibility for a given ISO row.
  const metricVal = (d) => (metric === 'votes' ? d.votes : d.distinctFilms)
  const [tooltipData, setTooltipData] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [position, setPosition] = useState({ coordinates: [13, 13], zoom: 1.35 })
  const [hoveredGeo, setHoveredGeo] = useState(null) // Track hovered geography for overlay
  const [selectedCountry, setSelectedCountry] = useState(null) // ISO code of selected country for expanded view
  const mapRef = useRef(null)

  // Zoom controls with smoother increments
  const handleZoomIn = () => {
    if (position.zoom >= 8) return
    setPosition(pos => ({ ...pos, zoom: pos.zoom * 1.4 }))
  }

  const handleZoomOut = () => {
    if (position.zoom <= 1) return
    setPosition(pos => ({ ...pos, zoom: Math.max(1, pos.zoom / 1.4) }))
  }

  const handleMoveEnd = (newPosition) => {
    setPosition(newPosition)
  }

  // Prevent scroll wheel zoom
  const handleWheel = useCallback((e) => {
    e.stopPropagation()
  }, [])

  // Track mouse position for tooltip
  const handleMouseMove = useCallback((e) => {
    setMousePos({ x: e.clientX, y: e.clientY })
  }, [])

  // Aggregate data by ISO code (combines historical entities like East/West Germany)
  const dataByISO = useMemo(() => {
    if (!countriesData) return {}

    const aggregated = {}

    Object.entries(countriesData).forEach(([countryName, countryInfo]) => {
      // Skip metadata
      if (countryName.startsWith('_')) return

      const iso = COUNTRY_NAME_TO_ISO[countryName]
      if (!iso) return

      const pollData = countryInfo.byPoll?.[selectedPoll]
      if (!pollData) return

      const votes = rankRange === 'all' ? pollData.total : pollData.consensus
      const distinctFilms = rankRange === 'all' ? pollData.distinctFilms : pollData.distinctFilmsConsensus

      if (!aggregated[iso]) {
        aggregated[iso] = {
          votes: 0,
          distinctFilms: 0,
          countries: [],
          continent: countryInfo.continent
        }
      }

      aggregated[iso].votes += votes || 0
      aggregated[iso].distinctFilms += distinctFilms || 0
      // Only include countries that have films for current filters
      if ((distinctFilms || 0) > 0) {
        aggregated[iso].countries.push({
          name: countryName,
          votes: votes,
          distinctFilms: distinctFilms || 0
        })
      }
    })

    return aggregated
  }, [countriesData, selectedPoll, rankRange])

  // Calculate color scale using quantile (equal number of countries per color bucket)
  const colorScale = useMemo(() => {
    const values = Object.values(dataByISO)
      .map(metricVal)
      .filter(v => v > 0)
      .sort((a, b) => a - b)

    if (values.length === 0) {
      return scaleQuantile().domain([1, 100]).range(COLOR_RANGE)
    }

    return scaleQuantile()
      .domain(values)
      .range(COLOR_RANGE)
  }, [dataByISO, metric])

  // Calculate country rankings for tooltip
  const countryRankings = useMemo(() => {
    const sorted = Object.entries(dataByISO)
      .filter(([, data]) => metricVal(data) > 0)
      .sort((a, b) => metricVal(b[1]) - metricVal(a[1]))

    const rankings = {}
    sorted.forEach(([iso], index) => {
      rankings[iso] = index + 1
    })
    return rankings
  }, [dataByISO, metric])

  const totalCountriesWithVotes = Object.keys(countryRankings).length

  // Get country fill color
  const getFillColor = useCallback((iso) => {
    const data = dataByISO[iso]
    if (!data || metricVal(data) === 0) return NO_DATA_COLOR
    return colorScale(metricVal(data))
  }, [dataByISO, colorScale, metric])

  // Handle mouse enter on country
  const handleMouseEnter = useCallback((iso, geo) => {
    const data = dataByISO[iso]
    if (!data || metricVal(data) === 0) return

    setHoveredGeo(geo) // Store the geography for overlay rendering

    const rank = countryRankings[iso]

    setTooltipData({
      countries: data.countries,
      continent: data.continent,
      totalVotes: data.votes,
      rank: rank,
      totalCountries: totalCountriesWithVotes,
      totalDistinctFilms: data.distinctFilms
    })
  }, [dataByISO, countryRankings, totalCountriesWithVotes, metric])

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setTooltipData(null)
    setHoveredGeo(null)
  }, [])

  // Handle country click - open expanded view
  const handleCountryClick = useCallback((iso) => {
    if (selectedCountry) return // Already have a country selected
    const data = dataByISO[iso]
    if (!data || metricVal(data) === 0) return

    setSelectedCountry(iso)
    setTooltipData(null)
    setHoveredGeo(null)
  }, [selectedCountry, dataByISO, metric])

  // Close expanded view
  const handleCloseExpanded = useCallback(() => {
    setSelectedCountry(null)
  }, [])

  // Get films for a specific country based on current filters
  const getFilmsForCountry = useCallback((countryName) => {
    if (!filmsData) return []

    return filmsData
      .filter(film => film.countries?.includes(countryName))
      .map(film => {
        let votes = 0
        let rank = null

        if (selectedPoll === 'all') {
          const allPollData = film.pollHistory?.find(p => p.year === 'all')
          votes = allPollData?.votes || 0
          rank = null
        } else {
          // Find the specific poll
          const pollEntry = film.pollHistory?.find(p => p.year === parseInt(selectedPoll))
          votes = pollEntry?.votes || 0
          rank = pollEntry?.rank || null
        }

        // Filter by consensus rank range
        if (rankRange === 'consensus') {
          if (selectedPoll === 'all') {
            // For "all" combined, check if film is in top 100 by total votes
            const allPollData = film.pollHistory?.find(p => p.year === 'all')
            if (!allPollData?.rank || allPollData.rank > 100) return null
          } else {
            const cutoffRank = countriesData?._pollMetadata?.[selectedPoll]?.consensus?.cutoffRank
            if (!rank || !cutoffRank || rank > cutoffRank) return null
          }
        }

        if (votes === 0) return null

        return { film, sortVotes: votes, sortRank: rank }
      })
      .filter(Boolean)
      .sort((a, b) => {
        // Sort by votes descending, then by rank ascending if available
        if (b.sortVotes !== a.sortVotes) return b.sortVotes - a.sortVotes
        if (a.sortRank && b.sortRank) return a.sortRank - b.sortRank
        return 0
      })
      .map(x => x.film)
  }, [filmsData, selectedPoll, rankRange, countriesData])

  // Get selected country data for expanded view
  const selectedCountryData = useMemo(() => {
    if (!selectedCountry || !dataByISO[selectedCountry]) return null

    const data = dataByISO[selectedCountry]
    const rank = countryRankings[selectedCountry]

    // Calculate continent rank
    const continentISOs = Object.entries(dataByISO)
      .filter(([, d]) => d.continent === data.continent && metricVal(d) > 0)
      .sort((a, b) => metricVal(b[1]) - metricVal(a[1]))
    const continentRank = continentISOs.findIndex(([iso]) => iso === selectedCountry) + 1
    const continentTotal = continentISOs.length

    // Get films for each country in this ISO group
    const countriesWithFilms = data.countries.map(country => ({
      ...country,
      films: getFilmsForCountry(country.name)
    }))

    return {
      iso: selectedCountry,
      countries: countriesWithFilms,
      continent: data.continent,
      totalVotes: data.votes,
      rank,
      totalCountries: totalCountriesWithVotes,
      continentRank,
      continentTotal,
      totalDistinctFilms: data.distinctFilms
    }
  }, [selectedCountry, dataByISO, countryRankings, totalCountriesWithVotes, getFilmsForCountry, metric])

  if (!countriesData) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-black h-[28.44rem] flex items-center justify-center">
        <div className="text-black font-bold">Loading map data...</div>
      </div>
    )
  }

  return (
    <div className="w-full relative">
      {/* Zoom Controls */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        <button
          onClick={handleZoomIn}
          className="w-8 h-8 bg-white border-2 border-black text-black font-bold hover:bg-gray-100 flex items-center justify-center"
          title="Zoom in"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          className="w-8 h-8 bg-white border-2 border-black text-black font-bold hover:bg-gray-100 flex items-center justify-center"
          title="Zoom out"
        >
          −
        </button>
      </div>

      {/* Map Container */}
      <div
        ref={mapRef}
        className="border-2 border-black h-[28.44rem] overflow-hidden select-none"
        style={{ userSelect: 'none', backgroundColor: '#ffffff' }}
        onWheel={handleWheel}
        onMouseMove={handleMouseMove}
      >
        {/* CSS for smooth zoom transitions */}
        <style>{`
          .rsm-zoomable-group {
            transition: transform 0.3s ease-out;
          }
        `}</style>
        <ComposableMap
          projection="geoNaturalEarth1"
          projectionConfig={{
            scale: 180,
            center: [0, 0]
          }}
          style={{
            width: '100%',
            height: '100%'
          }}
        >
          <ZoomableGroup
            zoom={position.zoom}
            center={position.coordinates}
            onMoveEnd={handleMoveEnd}
            minZoom={1}
            maxZoom={8}
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }) => {
                const processed = splitOverseasTerritories(geographies)
                return (
                <>
                  {/* Base layer: all countries */}
                  {processed.map((geo) => {
                    const iso = geo.id
                    const data = dataByISO[iso]
                    const hasData = data && metricVal(data) > 0
                    const isInteractionDisabled = !!selectedCountry

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={getFillColor(iso)}
                        stroke={BORDER_COLOR}
                        strokeWidth={0.4 / (position.zoom / 1.35)}
                        style={{
                          default: {
                            outline: 'none'
                          },
                          hover: {
                            outline: 'none',
                            cursor: isInteractionDisabled ? 'default' : (hasData ? 'pointer' : 'default')
                          },
                          pressed: {
                            outline: 'none'
                          }
                        }}
                        onMouseEnter={() => {
                          if (!isInteractionDisabled && hasData) handleMouseEnter(iso, geo)
                        }}
                        onMouseLeave={() => {
                          if (!isInteractionDisabled) handleMouseLeave()
                        }}
                        onClick={() => {
                          if (!isInteractionDisabled && hasData) handleCountryClick(iso)
                        }}
                      />
                    )
                  })}

                  {/* Overlay layer: hovered country rendered on top with outline */}
                  {hoveredGeo && (
                    <Geography
                      geography={hoveredGeo}
                      fill="transparent"
                      stroke="#fbbf24"
                      strokeWidth={2 / (position.zoom / 1.35)}
                      style={{
                        default: {
                          outline: 'none',
                          pointerEvents: 'none' // Don't capture mouse events
                        },
                        hover: {
                          outline: 'none',
                          pointerEvents: 'none'
                        },
                        pressed: {
                          outline: 'none',
                          pointerEvents: 'none'
                        }
                      }}
                    />
                  )}
                </>
                )
              }}
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>
      </div>

      {/* Custom Tooltip - same style as bar chart with smooth transitions */}
      {tooltipData && (() => {
        const mapRect = mapRef.current?.getBoundingClientRect()
        if (!mapRect) return null

        const hasMultipleCountries = tooltipData.countries.length > 1
        const displayName = hasMultipleCountries
          ? tooltipData.countries.map(c => c.name).join(' + ')
          : tooltipData.countries[0].name

        // Estimate tooltip height based on content
        const baseHeight = 130 // Single country tooltip
        const extraPerCountry = 55 // Additional height per country in combined entities
        const tooltipHeight = hasMultipleCountries
          ? baseHeight + 20 + (tooltipData.countries.length * extraPerCountry) // +20 for divider/spacing
          : baseHeight
        const tooltipWidth = 180
        const offset = 10

        // Determine horizontal position
        const isRightHalf = mousePos.x > window.innerWidth / 2
        let tooltipX = isRightHalf ? mousePos.x - tooltipWidth - offset : mousePos.x + offset

        // Determine vertical position - prefer below cursor, flip if would go beyond map bottom
        const mapMidY = mapRect.top + mapRect.height / 2
        const isBottomHalf = mousePos.y > mapMidY
        let tooltipY = isBottomHalf ? mousePos.y - tooltipHeight - offset : mousePos.y + offset

        // Clamp to stay within map boundaries
        const minY = mapRect.top
        const maxY = mapRect.bottom - tooltipHeight
        tooltipY = Math.max(minY, Math.min(maxY, tooltipY))

        return (
          <div
            className="fixed z-50 pointer-events-none bg-white p-2.5 border-2 border-black shadow-lg w-[180px]"
            style={{
              left: tooltipX,
              top: tooltipY,
              transition: 'left 0.08s ease-out, top 0.08s ease-out'
            }}
          >
          <p className="font-bold text-base text-black uppercase tracking-wide">{displayName}</p>
          <p className="text-xs text-black font-medium mb-1">{tooltipData.continent}</p>
          <p className="text-xl font-black text-black my-1">
            {metric === 'votes'
              ? `${tooltipData.totalVotes.toLocaleString()} votes`
              : `${tooltipData.totalDistinctFilms.toLocaleString()} ${tooltipData.totalDistinctFilms === 1 ? 'film' : 'films'}`}
          </p>
          <p className="text-xs text-black font-medium mt-0.5">
            #{tooltipData.rank} out of {tooltipData.totalCountries} countries
          </p>
          <p className="text-xs text-black font-medium mt-0.5">
            {metric === 'votes'
              ? `${tooltipData.totalDistinctFilms.toLocaleString()} ${tooltipData.totalDistinctFilms === 1 ? 'film' : 'films'}`
              : `${tooltipData.totalVotes.toLocaleString()} votes`}
          </p>

          {/* Individual country breakdown for combined entities */}
          {hasMultipleCountries && (
            <div className="mt-2 pt-2 border-t border-gray-300">
              {tooltipData.countries.map((country, idx) => (
                <div key={country.name} className={idx > 0 ? 'mt-1.5 pt-1.5 border-t border-gray-200' : ''}>
                  <p className="font-semibold text-xs text-black uppercase tracking-wide">{country.name}</p>
                  <p className="text-xs text-black">
                    {country.distinctFilms.toLocaleString()} films · {country.votes.toLocaleString()} votes
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
        )
      })()}

      {/* Expanded Country Panel */}
      {selectedCountryData && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-4 pointer-events-none">
          {/* Semi-transparent overlay to dim the map */}
          <div
            className="absolute inset-0 bg-black bg-opacity-20 pointer-events-auto"
            onClick={handleCloseExpanded}
          />

          {/* Expanded panel - centered, height matches bar chart panel */}
          <div className="relative w-[calc(100%-32px)] h-[calc(28.44rem-32px)] max-w-full bg-white border-4 border-black pointer-events-auto flex flex-col shadow-xl">
            {/* Close button */}
            <button
              onClick={handleCloseExpanded}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white border-2 border-black text-black font-black text-lg hover:bg-black hover:text-white transition-colors flex items-center justify-center z-10"
              title="Close"
            >
              ×
            </button>

            {selectedCountryData.countries.length > 1 ? (
              /* Multi-country: horizontal scrollable layout */
              <div className="flex-1 overflow-hidden flex overflow-x-auto divide-x-2 divide-gray-300">
                {selectedCountryData.countries.map((country) => (
                  <div key={country.name} className="flex flex-col w-[400px] flex-shrink-0">
                    {/* Country header */}
                    <div className="px-4 py-3 bg-gray-50 border-b-2 border-gray-300 flex-shrink-0">
                      <h4 className="font-black text-lg text-black uppercase tracking-wide">{country.name}</h4>
                      <div className="flex gap-3 mt-1">
                        <span className="text-base font-black text-black">
                          {metric === 'votes'
                            ? `${country.votes.toLocaleString()} votes`
                            : `${country.films.length.toLocaleString()} ${country.films.length === 1 ? 'film' : 'films'}`}
                        </span>
                        <span className="text-sm text-black font-medium self-end">
                          {metric === 'votes'
                            ? `${country.films.length.toLocaleString()} ${country.films.length === 1 ? 'film' : 'films'}`
                            : `${country.votes.toLocaleString()} votes`}
                        </span>
                      </div>
                      {selectedCountryData.continentRank > 0 && (
                        <p className="text-xs text-black font-medium mt-1">
                          #{selectedCountryData.continentRank} of {selectedCountryData.continentTotal} {selectedCountryData.continentTotal === 1 ? 'country' : 'countries'} in {selectedCountryData.continent}
                        </p>
                      )}
                      {selectedCountryData.rank && (
                        <p className="text-xs text-black font-medium">
                          #{selectedCountryData.rank} of {selectedCountryData.totalCountries} {selectedCountryData.totalCountries === 1 ? 'country' : 'countries'} globally
                        </p>
                      )}
                    </div>

                    {/* Scrollable poster grid */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden p-3">
                      <div className="grid grid-cols-2 gap-2">
                        {country.films.map((film) => (
                          <GridTile key={film.key} film={withCurrent(film, selectedPoll)} activePoll={selectedPoll} square={false} />
                        ))}
                      </div>

                      {country.films.length === 0 && (
                        <div className="px-4 py-8 text-center text-gray-500 text-sm">
                          No films found for current filters
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Single country: flat layout matching bar chart structure */
              <>
                {/* Country header */}
                <div className="px-4 py-3 bg-gray-50 border-b-2 border-gray-300 flex-shrink-0">
                  <h4 className="font-black text-lg text-black uppercase tracking-wide">{selectedCountryData.countries[0].name}</h4>
                  <div className="flex gap-3 mt-1">
                    <span className="text-base font-black text-black">
                      {metric === 'votes'
                        ? `${selectedCountryData.countries[0].votes.toLocaleString()} votes`
                        : `${selectedCountryData.countries[0].films.length.toLocaleString()} ${selectedCountryData.countries[0].films.length === 1 ? 'film' : 'films'}`}
                    </span>
                    <span className="text-sm text-black font-medium self-end">
                      {metric === 'votes'
                        ? `${selectedCountryData.countries[0].films.length.toLocaleString()} ${selectedCountryData.countries[0].films.length === 1 ? 'film' : 'films'}`
                        : `${selectedCountryData.countries[0].votes.toLocaleString()} votes`}
                    </span>
                  </div>
                  {selectedCountryData.continentRank > 0 && (
                    <p className="text-xs text-black font-medium mt-1">
                      #{selectedCountryData.continentRank} of {selectedCountryData.continentTotal} {selectedCountryData.continentTotal === 1 ? 'country' : 'countries'} in {selectedCountryData.continent}
                    </p>
                  )}
                  {selectedCountryData.rank && (
                    <p className="text-xs text-black font-medium">
                      #{selectedCountryData.rank} of {selectedCountryData.totalCountries} {selectedCountryData.totalCountries === 1 ? 'country' : 'countries'} globally
                    </p>
                  )}
                </div>

                {/* Scrollable poster grid */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedCountryData.countries[0].films.map((film) => (
                      <GridTile key={film.key} film={withCurrent(film, selectedPoll)} activePoll={selectedPoll} square={false} />
                    ))}
                  </div>

                  {selectedCountryData.countries[0].films.length === 0 && (
                    <div className="px-4 py-8 text-center text-gray-500 text-sm">
                      No films found for current filters
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
