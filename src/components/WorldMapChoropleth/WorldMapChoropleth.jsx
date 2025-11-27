import { useState, useMemo, useCallback, useRef } from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup
} from 'react-simple-maps'
import { scaleQuantile } from 'd3-scale'
import { Tooltip } from 'react-tooltip'
import { COUNTRY_NAME_TO_ISO } from './countryCodeMapping'

// Natural Earth 110m world topology - lower resolution for performance
const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"

// Color palette for the choropleth (light to dark green)
const COLOR_RANGE = [
  '#dcfce7', // green-100
  '#bbf7d0', // green-200
  '#86efac', // green-300
  '#4ade80', // green-400
  '#22c55e', // green-500
  '#16a34a', // green-600
  '#166534', // green-800
]

const NO_DATA_COLOR = '#e5e7eb' // gray-200

export default function WorldMapChoropleth({ countriesData, selectedPoll, rankRange }) {
  const [tooltipContent, setTooltipContent] = useState('')
  const [position, setPosition] = useState({ coordinates: [13, 13], zoom: 1.35 })
  const [hoveredGeo, setHoveredGeo] = useState(null) // Track hovered geography for overlay
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

      const votes = rankRange === 'all' ? pollData.total : pollData.top100
      const distinctFilms = rankRange === 'all' ? pollData.distinctFilms : pollData.distinctFilmsTop100

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
      aggregated[iso].countries.push(countryName)
    })

    return aggregated
  }, [countriesData, selectedPoll, rankRange])

  // Calculate color scale using quantile (equal number of countries per color bucket)
  const colorScale = useMemo(() => {
    const values = Object.values(dataByISO)
      .map(d => d.votes)
      .filter(v => v > 0)
      .sort((a, b) => a - b)

    if (values.length === 0) {
      return scaleQuantile().domain([1, 100]).range(COLOR_RANGE)
    }

    return scaleQuantile()
      .domain(values)
      .range(COLOR_RANGE)
  }, [dataByISO])

  // Calculate country rankings for tooltip
  const countryRankings = useMemo(() => {
    const sorted = Object.entries(dataByISO)
      .filter(([, data]) => data.votes > 0)
      .sort((a, b) => b[1].votes - a[1].votes)

    const rankings = {}
    sorted.forEach(([iso], index) => {
      rankings[iso] = index + 1
    })
    return rankings
  }, [dataByISO])

  const totalCountriesWithVotes = Object.keys(countryRankings).length

  // Get country fill color
  const getFillColor = useCallback((iso) => {
    const data = dataByISO[iso]
    if (!data || data.votes === 0) return NO_DATA_COLOR
    return colorScale(data.votes)
  }, [dataByISO, colorScale])

  // Handle mouse enter on country
  const handleMouseEnter = useCallback((iso, geo) => {
    const data = dataByISO[iso]
    if (!data || data.votes === 0) return

    setHoveredGeo(geo) // Store the geography for overlay rendering

    const rank = countryRankings[iso]
    const countryNames = data.countries.join(' + ')

    setTooltipContent(
      `<p class="font-bold text-base text-black uppercase tracking-wide">${countryNames}</p>` +
      `<p class="text-xs text-black font-medium mb-1">${data.continent}</p>` +
      `<p class="text-xl font-black text-black my-1">${data.votes.toLocaleString()} votes</p>` +
      `<p class="text-xs text-black font-medium mt-0.5">#${rank} out of ${totalCountriesWithVotes} countries</p>` +
      `<p class="text-xs text-black font-medium mt-0.5">${data.distinctFilms.toLocaleString()} distinct films</p>`
    )
  }, [dataByISO, countryRankings, totalCountriesWithVotes])

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setTooltipContent('')
    setHoveredGeo(null)
  }, [])

  if (!countriesData) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-black h-[455px] flex items-center justify-center">
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
        className="border-2 border-black h-[455px] overflow-hidden select-none"
        style={{ userSelect: 'none', backgroundColor: '#ffffff' }}
        data-tooltip-id="map-tooltip"
        data-tooltip-html={tooltipContent}
        onWheel={handleWheel}
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
              {({ geographies }) => (
                <>
                  {/* Base layer: all countries */}
                  {geographies.map((geo) => {
                    const iso = geo.id
                    const data = dataByISO[iso]
                    const hasData = data && data.votes > 0

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={getFillColor(iso)}
                        stroke="none"
                        style={{
                          default: {
                            outline: 'none'
                          },
                          hover: {
                            outline: 'none',
                            cursor: hasData ? 'pointer' : 'default'
                          },
                          pressed: {
                            outline: 'none'
                          }
                        }}
                        onMouseEnter={() => {
                          if (hasData) handleMouseEnter(iso, geo)
                        }}
                        onMouseLeave={handleMouseLeave}
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
              )}
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>
      </div>

      {/* Tooltip */}
      <Tooltip
        id="map-tooltip"
        className="z-50"
        style={{
          backgroundColor: 'white',
          color: 'black',
          border: '2px solid black',
          borderRadius: '0',
          padding: '10px',
          maxWidth: '180px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
        }}
      />
    </div>
  )
}
