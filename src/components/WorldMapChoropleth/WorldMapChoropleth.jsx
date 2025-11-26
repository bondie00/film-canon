import { useState, useMemo, useCallback } from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup
} from 'react-simple-maps'
import { scaleQuantize } from 'd3-scale'
import { Tooltip } from 'react-tooltip'
import { COUNTRY_NAME_TO_ISO, ISO_TO_COUNTRY_NAMES } from './countryCodeMapping'

// Natural Earth 110m world topology - lower resolution for performance
const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"

// Color palette for the choropleth (light to dark blue)
const COLOR_RANGE = [
  '#dbeafe', // blue-100
  '#bfdbfe', // blue-200
  '#93c5fd', // blue-300
  '#60a5fa', // blue-400
  '#3b82f6', // blue-500
  '#2563eb', // blue-600
  '#1d4ed8', // blue-700
]

const NO_DATA_COLOR = '#e5e7eb' // gray-200

export default function WorldMapChoropleth({ countriesData, selectedPoll, rankRange }) {
  const [tooltipContent, setTooltipContent] = useState('')

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

  // Calculate color scale based on current data
  const colorScale = useMemo(() => {
    const values = Object.values(dataByISO)
      .map(d => d.votes)
      .filter(v => v > 0)

    if (values.length === 0) {
      return scaleQuantize().domain([1, 100]).range(COLOR_RANGE)
    }

    const maxValue = Math.max(...values)

    return scaleQuantize()
      .domain([1, maxValue])
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
  const handleMouseEnter = useCallback((iso) => {
    const data = dataByISO[iso]
    if (!data || data.votes === 0) return

    const rank = countryRankings[iso]
    const countryNames = data.countries.join(' + ')

    setTooltipContent(
      `<div class="font-bold text-base">${countryNames}</div>` +
      `<div class="text-sm text-gray-600 mb-2">${data.continent}</div>` +
      `<div class="text-sm"><span class="font-semibold">${data.votes.toLocaleString()}</span> votes</div>` +
      `<div class="text-sm"><span class="font-semibold">${data.distinctFilms.toLocaleString()}</span> distinct films</div>` +
      `<div class="text-sm text-gray-600 mt-1">#${rank} of ${totalCountriesWithVotes} countries</div>`
    )
  }, [dataByISO, countryRankings, totalCountriesWithVotes])

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setTooltipContent('')
  }, [])

  // Get legend thresholds for display
  const legendThresholds = useMemo(() => {
    const values = Object.values(dataByISO)
      .map(d => d.votes)
      .filter(v => v > 0)

    if (values.length === 0) return []

    const maxValue = Math.max(...values)
    const step = maxValue / COLOR_RANGE.length

    return COLOR_RANGE.map((color, i) => ({
      color,
      min: Math.round(i * step) + (i === 0 ? 1 : 0),
      max: i === COLOR_RANGE.length - 1 ? maxValue : Math.round((i + 1) * step)
    }))
  }, [dataByISO])

  if (!countriesData) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-black h-[500px] flex items-center justify-center">
        <div className="text-black font-bold">Loading map data...</div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Map Container */}
      <div
        className="bg-gray-50 border-2 border-black"
        data-tooltip-id="map-tooltip"
        data-tooltip-html={tooltipContent}
      >
        <ComposableMap
          projection="geoNaturalEarth1"
          projectionConfig={{
            scale: 160,
            center: [0, 0]
          }}
          style={{
            width: '100%',
            height: 'auto'
          }}
        >
          <ZoomableGroup>
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  // Get ISO code from properties
                  const iso = geo.properties.ISO_A3 || geo.id
                  const data = dataByISO[iso]
                  const hasData = data && data.votes > 0

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={getFillColor(iso)}
                      stroke="#9ca3af"
                      strokeWidth={0.5}
                      style={{
                        default: {
                          outline: 'none'
                        },
                        hover: hasData
                          ? {
                              outline: 'none',
                              stroke: '#000',
                              strokeWidth: 1.5,
                              cursor: 'pointer'
                            }
                          : {
                              outline: 'none'
                            },
                        pressed: {
                          outline: 'none'
                        }
                      }}
                      onMouseEnter={() => {
                        if (hasData) handleMouseEnter(iso)
                      }}
                      onMouseLeave={handleMouseLeave}
                    />
                  )
                })
              }
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
          padding: '12px',
          boxShadow: '4px 4px 0 rgba(0,0,0,0.2)'
        }}
      />

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm border-t-2 border-gray-300 pt-4">
        <span className="text-black font-bold uppercase tracking-wide">Vote Count:</span>
        <div className="flex items-center space-x-2">
          <div
            className="w-8 h-4 border-2 border-black"
            style={{ backgroundColor: NO_DATA_COLOR }}
          />
          <span className="text-black font-medium">No data</span>
        </div>
        {legendThresholds.map((threshold, i) => (
          <div key={i} className="flex items-center space-x-2">
            <div
              className="w-8 h-4 border-2 border-black"
              style={{ backgroundColor: threshold.color }}
            />
            <span className="text-black font-medium">
              {threshold.min === threshold.max
                ? threshold.min.toLocaleString()
                : `${threshold.min.toLocaleString()}-${threshold.max.toLocaleString()}`
              }
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
