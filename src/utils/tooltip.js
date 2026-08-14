// Shared hover-tooltip styling for the country visualizations (world map, bar
// chart, decade heatmap). Kept in one place so the three stay typographically
// identical — they drifted apart when each grew its own copy.
//
// The shape they all follow:
//   TITLE            the thing you're hovering (country / continent), uppercase
//   subtitle         its context (continent, decade)
//   VALUE            the active metric, the one number you're here for
//   detail           the other metric, and any extra notes

export const TOOLTIP_BOX = 'bg-white p-2.5 border-2 border-black shadow-lg'
export const TOOLTIP_TITLE = 'font-bold text-base text-black uppercase tracking-wide'
export const TOOLTIP_SUBTITLE = 'text-xs text-black font-medium mb-1'
export const TOOLTIP_VALUE = 'text-xl font-black text-black my-1'
export const TOOLTIP_DETAIL = 'text-xs text-black font-medium mt-0.5'

// Identity-led variant — for marks that are anonymous until you hover them.
//
// The scale above puts the VALUE largest, because on a map or a labelled bar the
// thing you're hovering is already named on screen and the number is what you
// came for. That inverts on the film tooltips: an 8px tile inside a director's
// bar says nothing at all, so "which film is this" IS the payload and the rank is
// context. Use NAME instead of TITLE there, and keep the figures at detail size.
//
// It also drops the uppercase. That reads well on FRANCE and 2022 POLL, the only
// things the original slot ever held; it does not read well on JEANNE DIELMAN,
// 23, QUAI DU COMMERCE, 1080 BRUXELLES. leading-tight because these wrap.
export const TOOLTIP_NAME = 'font-bold text-base text-black leading-tight'
export const TOOLTIP_NAME_SM = 'font-bold text-sm text-black leading-tight'

// Width in px. The map and heatmap position themselves and need the number for
// their flip-and-clamp maths; the bar chart's is applied by Recharts.
export const TOOLTIP_WIDTH = 180

// Compact variant — same box, smaller type.
//
// The scale above was set against the country visualizations, which are 300-400px
// tall and full width. It renders a box around 100px tall, which is fine there and
// covers half the plot on the standing chart, the shortest chart on the site at
// 200px. That chart used to carry a black text-xs tooltip of its own for exactly
// this reason; the split was between "big chart" and "small chart", not between two
// intended styles, so the fix is a second SIZE rather than a second family.
//
// Identical shell (white, 2px black border, shadow) so it still reads as the same
// object, roughly 66px tall — no worse coverage than the black box it replaces.
// Anything reading as a headline drops one step: base to xs, xl to base.
export const TOOLTIP_BOX_SM = 'bg-white p-2 border-2 border-black shadow-lg'
export const TOOLTIP_TITLE_SM = 'font-bold text-xs text-black uppercase tracking-wide'
export const TOOLTIP_SUBTITLE_SM = 'text-[11px] text-black font-medium'
export const TOOLTIP_VALUE_SM = 'text-base font-black text-black leading-tight my-0.5'
export const TOOLTIP_DETAIL_SM = 'text-[11px] text-black font-medium'

// Narrower than the full box to match the smaller type. Only the hand-positioned
// tooltips need it; Recharts sizes its own.
export const TOOLTIP_WIDTH_SM = 160
