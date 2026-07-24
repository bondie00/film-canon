// Continent color mapping and order, shared across the country visualizations.
export const continentColors = {
  'Europe': '#3b82f6',        // blue-500
  'Asia': '#10b981',          // green-500
  'North America': '#8b5cf6', // purple-500
  'South America': '#f59e0b', // orange-500
  'Africa': '#ef4444',        // red-500
  'Oceania': '#ec4899',       // pink-500
}

export const CONTINENT_KEYS = Object.keys(continentColors)

// Interpolate white -> the given hex by `intensity` (0..1), with a floor so a non-zero
// cell is always visibly tinted. Used by the decade heatmap's row-normalized shading.
export function shadeToward(hex, intensity) {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  const factor = 0.15 + intensity * 0.85
  const mix = (c) => Math.round(255 - (255 - c) * factor)
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`
}
