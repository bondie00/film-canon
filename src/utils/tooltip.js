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

// Width in px. The map and heatmap position themselves and need the number for
// their flip-and-clamp maths; the bar chart's is applied by Recharts.
export const TOOLTIP_WIDTH = 180
