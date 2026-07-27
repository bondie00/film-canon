import { pollKeyOf, pollEntryOf } from './rankDepth'

/**
 * A country's films for the active poll, inside the active rank-depth cutoff,
 * ordered the way the expanded panels show them: most votes first, ties broken by
 * rank. Shared by the bar chart and the decade heatmap so a country's panel is
 * identical wherever you open it from.
 */
export function filmsForCountry(filmsData, countryName, selectedPoll, cutoffRank = null) {
  if (!filmsData) return []
  const pollKey = pollKeyOf(selectedPoll)

  return filmsData
    .filter(film => film.countries?.includes(countryName))
    .map(film => {
      const entry = pollEntryOf(film, pollKey)
      const votes = entry?.votes || 0
      const rank = entry?.rank ?? null
      if (votes === 0) return null
      // Same cutoff the aggregates were built with, so a panel's film list always
      // matches the country's headline count.
      if (cutoffRank != null && (rank == null || rank > cutoffRank)) return null
      return { film, sortVotes: votes, sortRank: rank }
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (b.sortVotes !== a.sortVotes) return b.sortVotes - a.sortVotes
      if (a.sortRank && b.sortRank) return a.sortRank - b.sortRank
      return 0
    })
    .map(x => x.film)
}

/**
 * Competition ranks (ties share a rank: 1, 2, 2, 4, ...) written onto each row for
 * BOTH metrics, so a panel can report rank-by-films and rank-by-votes regardless of
 * which metric is active. Mutates and returns `rows`; also stamps totalCountries.
 */
export function assignCompetitionRanks(rows) {
  const ranked = rows.filter(r => r.films > 0)

  const rankBy = (valueKey, rankField) => {
    const order = [...ranked].sort((a, b) => b[valueKey] - a[valueKey])
    let prevValue = null
    let prevRank = 0
    order.forEach((row, i) => {
      if (row[valueKey] === prevValue) {
        row[rankField] = prevRank
      } else {
        row[rankField] = i + 1
        prevRank = i + 1
        prevValue = row[valueKey]
      }
    })
  }

  rankBy('films', 'filmsRank')
  rankBy('votes', 'votesRank')
  rows.forEach(r => { r.totalCountries = ranked.length })
  return rows
}
