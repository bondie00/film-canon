import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup
} from 'react-simple-maps'
import { COUNTRY_NAME_TO_ISO } from './countryCodeMapping'
import GridTile, { withCurrent } from '../search/GridTile'

// Natural Earth 110m world topology - lower resolution for performance
const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"

// Cap posters shown in the expanded panel; the rest live on the Explore page.
const PANEL_FILM_CAP = 30

// Country name as a link to its detail page, with an arrow icon signalling it's clickable.
function CountryTitleLink({ name }) {
  return (
    <Link
      to={`/countries/${encodeURIComponent(name)}`}
      className="group inline-flex items-center gap-1.5 hover:underline decoration-2 underline-offset-2"
    >
      <span>{name}</span>
      <svg className="w-4 h-4 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M7 17L17 7M17 7H8M17 7v9" />
      </svg>
    </Link>
  )
}

// Build an Explore-page link carrying the current filters (poll, country, rank depth).
function buildExploreUrl(countryNames, poll, rankRange, countriesData) {
  const params = new URLSearchParams()
  if (poll) params.set('poll', poll)
  countryNames.forEach(n => params.append('country', n))
  if (rankRange === 'consensus') {
    const top = poll === 'all' ? 100 : countriesData?._pollMetadata?.[poll]?.consensus?.cutoffRank
    if (top) params.set('top', String(top))
  }
  return `/explore?${params.toString()}`
}

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

// Color palette for the choropleth - emerald shades to match Asia bar chart color (#10b981).
// 10 tiers: the darkest (#04372a) is a near-black "runaway" shade so the single top country
// (the US in every big poll) separates out from the pack below it.
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
  '#04372a', // emerald-950ish (runaway darkest - kept lighter than the border so US stays outlined)
]

// Geometric film-count breakpoints (9 thresholds -> 10 tiers). Fixed so films color is comparable
// across polls; ~1.7x per shade at the low end, with a deliberate jump to 600 at the top so the
// runaway leader (US) sits alone in the darkest tier while the tier below it stays occupied (which
// keeps the dark-anchored compaction from collapsing the gap). Votes reuse these breakpoints
// scaled by each poll's median votes-per-film (see voteThresholds / tierRemap).
const FILM_THRESHOLDS = [2, 3, 5, 8, 13, 22, 38, 70, 600]

// Which fixed tier (0..9) a value lands in, before compaction.
function rawTier(value, thresholds) {
  let lo = 0, hi = thresholds.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (value < thresholds[mid]) hi = mid
    else lo = mid + 1
  }
  return lo
}

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

  // Color scale. Both metrics use the SAME geometric (magnitude) threshold basis so the two maps
  // are directly comparable — toggling films<->votes only changes a country's shade where the
  // underlying data genuinely differs, not because the scales are shaped differently.
  //
  // - Films use the fixed FILM_THRESHOLDS (era-neutral, comparable across polls).
  // - Votes use those breakpoints scaled by this poll's MEDIAN votes-per-film, so a country with a
  //   typical ratio lands on the same tier as its films shade and only reads darker/lighter where
  //   its films are disproportionately loved (concentrated canon) or broad-but-thin. Median, not
  //   mean, so the US vote-outlier doesn't inflate the factor and wash the map out.
  const voteThresholds = useMemo(() => {
    const ratios = Object.values(dataByISO)
      .filter(d => d.distinctFilms > 0 && d.votes > 0)
      .map(d => d.votes / d.distinctFilms)
      .sort((a, b) => a - b)
    const n = ratios.length
    const k = n === 0 ? 1 : (n % 2 ? ratios[(n - 1) / 2] : (ratios[n / 2 - 1] + ratios[n / 2]) / 2)
    return FILM_THRESHOLDS.map(t => t * k)
  }, [dataByISO])

  // Dark-anchored compaction. With fixed breakpoints, small/early polls leave empty tiers (their
  // leaders don't reach the higher breakpoints, and the ramp has internal gaps). Instead of wasting
  // those colors, we drop every empty tier and pack the occupied ones against the DARK end, so the
  // top country always hits the darkest shade and the palest greens simply go unused for sparse
  // polls. The occupied set is the UNION of both metrics' tiers, so films and votes shift by the
  // same amount and stay comparable (the cost: a tier occupied by only one metric leaves a small
  // gap in the other). Returns a map from raw tier index (0..9) to compacted color index.
  const tierRemap = useMemo(() => {
    const C = COLOR_RANGE.length
    const occupied = new Set()
    Object.values(dataByISO).forEach(d => {
      if (d.distinctFilms > 0) occupied.add(rawTier(d.distinctFilms, FILM_THRESHOLDS))
      if (d.votes > 0) occupied.add(rawTier(d.votes, voteThresholds))
    })
    const sorted = [...occupied].sort((a, b) => a - b)
    const offset = C - sorted.length // shift occupied tiers up against the dark end
    const map = new Array(C).fill(0)
    sorted.forEach((tier, rank) => { map[tier] = offset + rank })
    return map
  }, [dataByISO, voteThresholds])

  // Final value -> color for the active metric, after compaction.
  const getTierColor = useCallback((value) => {
    const thresholds = metric === 'votes' ? voteThresholds : FILM_THRESHOLDS
    return COLOR_RANGE[tierRemap[rawTier(value, thresholds)]]
  }, [metric, voteThresholds, tierRemap])

  // Competition ranks (ties share a rank: 1, 2, 2, 4, ...) for BOTH metrics, so the expanded panel
  // can show rank-by-films and rank-by-votes regardless of the active metric.
  const { filmsRankByISO, votesRankByISO } = useMemo(() => {
    const rankBy = (valueOf) => {
      const sorted = Object.entries(dataByISO)
        .filter(([, d]) => valueOf(d) > 0)
        .sort((a, b) => valueOf(b[1]) - valueOf(a[1]))
      const ranks = {}
      let prevValue = null
      let prevRank = 0
      sorted.forEach(([iso, d], index) => {
        const value = valueOf(d)
        if (value === prevValue) {
          ranks[iso] = prevRank
        } else {
          ranks[iso] = index + 1
          prevRank = index + 1
          prevValue = value
        }
      })
      return ranks
    }
    return {
      filmsRankByISO: rankBy(d => d.distinctFilms),
      votesRankByISO: rankBy(d => d.votes)
    }
  }, [dataByISO])

  const totalCountriesWithVotes = Object.values(dataByISO).filter(d => d.distinctFilms > 0).length

  // Get country fill color
  const getFillColor = useCallback((iso) => {
    const data = dataByISO[iso]
    if (!data || metricVal(data) === 0) return NO_DATA_COLOR
    return getTierColor(metricVal(data))
  }, [dataByISO, getTierColor, metric])

  // Handle mouse enter on country
  const handleMouseEnter = useCallback((iso, geo) => {
    const data = dataByISO[iso]
    if (!data || metricVal(data) === 0) return

    setHoveredGeo(geo) // Store the geography for overlay rendering

    setTooltipData({
      countries: data.countries,
      continent: data.continent,
      totalVotes: data.votes,
      totalDistinctFilms: data.distinctFilms
    })
  }, [dataByISO, metric])

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

  // If filters change (poll / rank / metric) so the selected country no longer has films, close
  // the panel — otherwise the open selection would leave the map frozen (interaction disabled).
  useEffect(() => {
    if (selectedCountry) {
      const data = dataByISO[selectedCountry]
      if (!data || data.countries.length === 0) setSelectedCountry(null)
    }
  }, [dataByISO, selectedCountry])

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
    // No countries with films under the current filters (e.g. the poll was switched to one where
    // this country has none) — render nothing rather than crash on an empty group.
    if (data.countries.length === 0) return null

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
      filmsRank: filmsRankByISO[selectedCountry],
      votesRank: votesRankByISO[selectedCountry],
      totalCountries: totalCountriesWithVotes,
      totalDistinctFilms: data.distinctFilms
    }
  }, [selectedCountry, dataByISO, filmsRankByISO, votesRankByISO, totalCountriesWithVotes, getFilmsForCountry])

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
                      <h4 className="font-black text-lg text-black uppercase tracking-wide"><CountryTitleLink name={country.name} /></h4>
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
                      {selectedCountryData.filmsRank && (
                        <p className="text-xs text-black font-medium mt-1">
                          #{selectedCountryData.filmsRank} of {selectedCountryData.totalCountries} countries by films
                        </p>
                      )}
                      {selectedCountryData.votesRank && (
                        <p className="text-xs text-black font-medium">
                          #{selectedCountryData.votesRank} of {selectedCountryData.totalCountries} countries by votes
                        </p>
                      )}
                    </div>

                    {/* Scrollable poster grid */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden p-3">
                      <div className="grid grid-cols-2 gap-2">
                        {country.films.slice(0, PANEL_FILM_CAP).map((film) => (
                          <GridTile key={film.key} film={withCurrent(film, selectedPoll)} activePoll={selectedPoll} square={false} />
                        ))}
                      </div>

                      {country.films.length > 0 && (
                        <Link
                          to={buildExploreUrl([country.name], selectedPoll, rankRange, countriesData)}
                          className="mt-3 block w-full text-center px-4 py-2 bg-black text-white border-2 border-black font-bold text-sm uppercase tracking-wide hover:bg-gray-900 transition-colors"
                        >
                          {country.films.length > PANEL_FILM_CAP
                            ? `View all ${country.films.length.toLocaleString()} films in Explore →`
                            : 'Open in Explore →'}
                        </Link>
                      )}

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
                  <h4 className="font-black text-lg text-black uppercase tracking-wide"><CountryTitleLink name={selectedCountryData.countries[0].name} /></h4>
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
                  {selectedCountryData.filmsRank && (
                    <p className="text-xs text-black font-medium mt-1">
                      #{selectedCountryData.filmsRank} of {selectedCountryData.totalCountries} countries by films
                    </p>
                  )}
                  {selectedCountryData.votesRank && (
                    <p className="text-xs text-black font-medium">
                      #{selectedCountryData.votesRank} of {selectedCountryData.totalCountries} countries by votes
                    </p>
                  )}
                </div>

                {/* Scrollable poster grid */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedCountryData.countries[0].films.slice(0, PANEL_FILM_CAP).map((film) => (
                      <GridTile key={film.key} film={withCurrent(film, selectedPoll)} activePoll={selectedPoll} square={false} />
                    ))}
                  </div>

                  {selectedCountryData.countries[0].films.length > 0 && (
                    <Link
                      to={buildExploreUrl([selectedCountryData.countries[0].name], selectedPoll, rankRange, countriesData)}
                      className="mt-3 block w-full text-center px-4 py-2 bg-black text-white border-2 border-black font-bold text-sm uppercase tracking-wide hover:bg-gray-900 transition-colors"
                    >
                      {selectedCountryData.countries[0].films.length > PANEL_FILM_CAP
                        ? `View all ${selectedCountryData.countries[0].films.length.toLocaleString()} films in Explore →`
                        : 'Open in Explore →'}
                    </Link>
                  )}

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
