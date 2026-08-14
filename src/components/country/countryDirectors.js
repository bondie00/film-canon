// Who makes up a country's canon.
//
// The framing matters: this is never "which country a director belongs to" —
// directors have no nationality in this dataset and shouldn't be given one. It's
// the composition of the COUNTRY'S canon, tallied from the films credited to that
// country. Bergman isn't Swedish here; Sweden's canon is 81-100% his films.

/**
 * Every director credited on this set of films in one poll, strongest first.
 *
 * Co-directed films count in full for each director, matching lib/standings and
 * useCountryAggregates. `cutoff` applies the page's rank-depth filter, resolved
 * for THIS poll — same rule the decade heatmap uses per row.
 */
export function tallyDirectors(films, poll, cutoff = null) {
  const key = poll === 'all' ? 'all' : parseInt(poll, 10)
  const totals = new Map()
  let grandVotes = 0

  films.forEach(film => {
    const entry = film.pollHistory?.find(p => p.year === key)
    if (!entry || !(entry.votes > 0)) return
    if (cutoff != null && (entry.rank == null || entry.rank > cutoff)) return
    grandVotes += entry.votes
    ;(film.directors || []).forEach(name => {
      if (!name || name === '(unknown)') return
      const d = totals.get(name) || { name, votes: 0, films: 0 }
      d.votes += entry.votes
      d.films += 1
      totals.set(name, d)
    })
  })

  const ranked = [...totals.values()].sort(
    (a, b) => b.votes - a.votes || b.films - a.films || a.name.localeCompare(b.name)
  )

  // `grandVotes` is the country's real vote total and is NOT a valid denominator
  // for a per-director share. A co-directed film contributes its votes once here
  // and once to each of its directors, so shares against it can exceed 100% — 15
  // country-polls do, and Argentina 1972 reaches 200% off a single two-director
  // film. Anything showing a percentage must divide by the sum of the director
  // credits instead, `ranked.reduce((n, d) => n + d.votes, 0)`. Splitting votes
  // between co-directors would fix the arithmetic the other way but contradict
  // every other tally on the site — standings, useCountryAggregates and
  // useDirectorAggregates all credit co-directors in full.
  //
  // Nothing shows a share today: the ranked list dropped its percentage column,
  // and the strip that needed one was cut.
  return { ranked, grandVotes }
}
