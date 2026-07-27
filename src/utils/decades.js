// Shared decade-axis rules for the three decade heatmaps (countries × decades on
// the hub, polls × decades and rank-tiers × decades on a country page).

export const ALL_DECADES = [
  '1890', '1900', '1910', '1920', '1930', '1940', '1950', '1960', '1970', '1980',
  '1990', '2000', '2010', '2020',
]

// The axis always covers at least this span, so a decade heatmap reads as a fixed
// historical timeline instead of a bar of whatever happens to be occupied.
//
// It starts at the 1920s rather than the 1890s because the three decades before it
// hold 93 films between them — under 2% of the canon, touching only 9 of 105
// countries — so reserving permanent columns for them would spend a fifth of the
// axis on empty space for nearly everyone. The frame extends left when the data
// genuinely reaches back (the US, France and the UK all do), so nothing is hidden.
const FRAME_START = '1920'
const FRAME_END = '2020'

/**
 * Decade columns to render, given the decades that actually hold data.
 *
 * Always contiguous. The previous rule filtered to occupied decades only, which
 * dropped interior gaps as well as trailing ones — Germany has three empty decades
 * inside its range, so its 1920s column rendered flush against its 1950s and the
 * axis quietly misrepresented the history.
 *
 * @param {Iterable<string>} occupied decade keys ('1920', '1930', …) holding data
 */
export function decadeColumns(occupied) {
  const present = new Set(occupied)
  // No data at all means no axis — callers key their empty state off this.
  if (present.size === 0) return []

  let startIdx = ALL_DECADES.indexOf(FRAME_START)
  ALL_DECADES.forEach((decade, i) => {
    if (present.has(decade) && i < startIdx) startIdx = i
  })
  const endIdx = ALL_DECADES.indexOf(FRAME_END)
  return ALL_DECADES.slice(startIdx, endIdx + 1)
}
