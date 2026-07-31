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

/**
 * Deepest film rank each poll actually recorded — the floor of any rank axis, and
 * the depth band drawn behind the rank charts.
 *
 * Derived from the data rather than hardcoded, because ties compress ranks far
 * below the film count: 2022 records 3,816 films but bottoms out around #1,652,
 * since every single-vote film shares one rank at the bottom.
 *
 * These are FILM-rank floors, used by the film page's rank chart. The director
 * page's standing chart draws a band too, but over a different field — director
 * ranks against 2,072 directors, not film ranks against 3,816 films — and builds
 * its own floors in directorStandings.
 */
export function buildPollFloors(films) {
  const floors = {}
  if (!films) return floors
  films.forEach(film => {
    film.pollHistory.forEach(p => {
      // pollHistory also carries an 'all' aggregate entry; only real polls count.
      if (!POLL_YEARS.includes(p.year)) return
      if (p.votes > 0 && p.rank != null) {
        floors[p.year] = Math.max(floors[p.year] || 1, p.rank)
      }
    })
  })
  return floors
}
