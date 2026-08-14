// Categorical colors for per-line identity.
//
// CURRENTLY UNUSED — its only consumer was the director page's rank-trajectory
// chart, cut twice now. First when the standing chart took that slot; then again
// after it was restored and prototyped beside a multi-series version of the
// standing chart, because BOTH failed at the job they were brought back for.
//
// Worth knowing before proposing a third: the question they were meant to answer
// is "how did this director's films move across the polls", and RANK cannot
// answer it. Notorious falls #33 to #133 while its votes go 6 to 22 — the
// electorate grew 13x underneath it — and in the tail a rank is a tie-block
// label rather than a position (2,165 films share #1652 in 2022). Vote share is
// the measure that works, and voteShare() in utils/polls already computes it:
// Rear Window 1.2% → 3.2% of voters, Notorious 4.9% → 1.3%, which is the real
// story rank told backwards. The filmography grid's per-tile rank strips, read
// against the poll filter, already cover this well enough that no chart earned
// the space.
//
// Kept for the validation record below, which cost real work and applies to any
// future multi-line chart on this surface (the directors hub, where several
// directors share one plot).
//
// Each plotted line needs its own hue.
// This is the eight-slot categorical set from the dataviz standard, validated
// for this surface (light mode, white chart card):
//   lightness band PASS · chroma floor PASS · adjacent CVD ΔE 9.1 PASS ·
//   normal-vision ΔE 19.6 PASS · contrast WARN (three slots sit below 3:1)
// The contrast warning obliges a relief channel, which is why the chart ships a
// labelled checkbox list and per-point tooltips — color is never the only way to
// tell one line from another.
//
// Slots are claimed in fixed order and NEVER cycled, which is what caps the
// chart at eight simultaneous lines. Shading by rank tier (an ordinal job, not
// an identity one) uses a different scale entirely — see rankTiers.js.

export const SERIES_COLORS = [
  '#2a78d6', // blue
  '#eb6834', // orange
  '#1baf7a', // aqua
  '#eda100', // yellow
  '#e87ba4', // magenta
  '#008300', // green
  '#4a3aa7', // violet
  '#e34948', // red
]

/** Votes a film received across every poll (the 'all' entry is a real aggregate). */
export function totalVotes(film) {
  return film.pollHistory.find(p => p.year === 'all')?.votes ?? 0
}
