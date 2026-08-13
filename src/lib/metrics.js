/**
 * The films/votes metric switch, in words.
 *
 * Every surface that respects the metric toggle shows the same pair: the active
 * quantity in bold and the other one beside it as a secondary detail. Both labels
 * are built here so a page can never end up bolding one metric and pluralising
 * the other.
 */

export const filmsLabel = (n) => `${n.toLocaleString()} ${n === 1 ? 'film' : 'films'}`
export const votesLabel = (n) => `${n.toLocaleString()} ${n === 1 ? 'vote' : 'votes'}`

/** `{ primary, secondary }` for the active metric — primary is the one to bold. */
export function metricPair(metric, { films = 0, votes = 0 }) {
  const f = filmsLabel(films)
  const v = votesLabel(votes)
  return metric === 'votes' ? { primary: v, secondary: f } : { primary: f, secondary: v }
}

/** How a poll selection reads in a banner. */
export const pollLabel = (poll) =>
  String(poll) === 'all' ? 'All Polls Combined' : `${poll} Poll`
