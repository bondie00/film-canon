export const POLL_YEARS = [1952, 1962, 1972, 1982, 1992, 2002, 2012, 2022]

// Voters per poll. Not in films.json — historical facts from the Sight & Sound
// record (see CLAUDE.md). The electorate grew 35x across the eight polls, which
// is why raw vote counts are not comparable between polls: a film's share of
// voters is the like-for-like measure.
export const POLL_VOTERS = {
  1952: 47, 1962: 45, 1972: 81, 1982: 122,
  1992: 130, 2002: 145, 2012: 846, 2022: 1635,
}

/** Percentage of that poll's voters who named the film (null if unknown poll). */
export function voteShare(year, votes) {
  const voters = POLL_VOTERS[year]
  if (!voters || !votes) return null
  return (votes / voters) * 100
}
