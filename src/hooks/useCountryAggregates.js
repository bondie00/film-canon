import { useMemo } from 'react'
import { pollKeyOf, pollEntryOf } from '../lib/rankDepth'

/**
 * Per-country film/vote totals for the active poll at an arbitrary rank cutoff,
 * aggregated live from films.json.
 *
 * countries.json only ships two precomputed buckets per country (the whole poll and
 * the old fixed "consensus" set), which is why the rank filter used to be a two-way
 * toggle. Every country page already loads films.json, and aggregating from it
 * reproduces countries.json exactly (verified against US/France/UK/Japan/Italy/
 * Belgium for 2022 and 'all'), so any cutoff is one memoized pass over ~4,800 films
 * instead of a data-pipeline change.
 *
 * Returns the same shape the visualizations already read — { [country]: { continent,
 * byPoll: { [poll]: { distinctFilms, total } } } } — so they only had to drop their
 * consensus branches. `_totals` carries the poll-wide distinct film and vote counts
 * (no co-production double counting) for the page banner.
 */
export default function useCountryAggregates(filmsData, countriesData, selectedPoll, cutoffRank) {
  return useMemo(() => {
    if (!filmsData || !countriesData) return null

    const pollKey = pollKeyOf(selectedPoll)
    const byCountry = new Map()
    let totalFilms = 0
    let totalVotes = 0

    filmsData.forEach(film => {
      const entry = pollEntryOf(film, pollKey)
      if (!entry || !(entry.votes > 0)) return
      if (cutoffRank != null && (entry.rank == null || entry.rank > cutoffRank)) return

      totalFilms++
      totalVotes += entry.votes

      film.countries?.forEach(name => {
        const acc = byCountry.get(name) || { distinctFilms: 0, total: 0 }
        acc.distinctFilms++
        acc.total += entry.votes
        byCountry.set(name, acc)
      })
    })

    const result = {}
    Object.entries(countriesData).forEach(([name, info]) => {
      if (name.startsWith('_')) return
      result[name] = {
        ...info,
        byPoll: { [selectedPoll]: byCountry.get(name) || { distinctFilms: 0, total: 0 } },
      }
    })

    result._totals = { films: totalFilms, votes: totalVotes }
    return result
  }, [filmsData, countriesData, selectedPoll, cutoffRank])
}
