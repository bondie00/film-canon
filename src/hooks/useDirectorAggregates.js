import { useMemo } from 'react'
import { pollKeyOf, pollEntryOf } from '../lib/rankDepth'

// A credit that names no one. Four films carry it; it would otherwise rank as a
// director in its own right.
const UNKNOWN_CREDIT = '(unknown)'

/** Production year as a number; ranges like "1960-1964" resolve to their start. */
const startYear = film => parseInt(String(film.Year ?? ''), 10)

/**
 * Per-director totals for the active poll at an arbitrary rank cutoff, aggregated
 * live from films.json — the director-side twin of useCountryAggregates.
 *
 * directors.json is not usable for this: it only carries 2022 ranks, so it can
 * answer neither "the 1972 poll" nor any depth other than the whole poll. One
 * memoized pass over ~4,800 films answers every combination instead.
 *
 * Co-directed films count in full for each director, matching lib/standings.js
 * and the director detail pages.
 *
 * Each row carries both metrics, the span of their canonized work, and topShare —
 * the largest single film's share of their votes, the director-level version of
 * the Belgium/Jeanne Dielman point: Donen is 89% one film, Godard 22% across
 * thirty.
 *
 * Deliberately NO country or continent. A country is a property of a film, and
 * collapsing a filmography to one of them is a fiction: in the 2022 poll 98
 * directors have films on more than one continent and a plurality rule would
 * silently discard the minority (Hitchcock is US 13 / UK 9), while 48 more have
 * an outright tie for their commonest country and would be assigned by iteration
 * order. Nothing on this page is worth that.
 */
export default function useDirectorAggregates(filmsData, selectedPoll, cutoffRank) {
  return useMemo(() => {
    if (!filmsData) return null

    const pollKey = pollKeyOf(selectedPoll)
    const byDirector = new Map()
    let totalFilms = 0
    let totalVotes = 0

    filmsData.forEach(film => {
      const entry = pollEntryOf(film, pollKey)
      if (!entry || !(entry.votes > 0)) return
      if (cutoffRank != null && (entry.rank == null || entry.rank > cutoffRank)) return

      totalFilms++
      totalVotes += entry.votes

      film.directors?.forEach(name => {
        if (!name || name === UNKNOWN_CREDIT) return
        let acc = byDirector.get(name)
        if (!acc) {
          acc = { name, votes: 0, films: 0, filmList: [] }
          byDirector.set(name, acc)
        }
        acc.votes += entry.votes
        acc.films += 1
        acc.filmList.push({ film, votes: entry.votes, rank: entry.rank ?? null })
      })
    })

    const rows = []
    byDirector.forEach(acc => {
      // Best-voted first, ties broken by rank — the order the panels and the
      // segmented bars both read.
      acc.filmList.sort((a, b) => b.votes - a.votes || (a.rank ?? 1e9) - (b.rank ?? 1e9))

      const years = acc.filmList.map(x => startYear(x.film)).filter(y => !Number.isNaN(y)).sort((a, b) => a - b)

      rows.push({
        name: acc.name,
        votes: acc.votes,
        films: acc.films,
        filmList: acc.filmList,
        yearFrom: years.length ? years[0] : null,
        yearTo: years.length ? years[years.length - 1] : null,
        topShare: acc.votes > 0 ? acc.filmList[0].votes / acc.votes : 0,
        topFilm: acc.filmList[0]?.film ?? null,
      })
    })

    assignDirectorRanks(rows)

    return { rows, totals: { films: totalFilms, votes: totalVotes, directors: rows.length } }
  }, [filmsData, selectedPoll, cutoffRank])
}

/**
 * Competition ranks (ties share a rank: 1, 2, 2, 4, …) for BOTH metrics, so a
 * panel can report standing by votes and by films whichever one is driving the
 * chart. Mutates and returns `rows`.
 *
 * Worth knowing what the films ranking is worth before showing it: two thirds of
 * directors place exactly one film in any given poll, so filmsRank is a very
 * coarse ordering. It's reported as a secondary figure for that reason.
 */
export function assignDirectorRanks(rows) {
  const rankBy = (valueKey, rankField) => {
    const order = [...rows].sort((a, b) => b[valueKey] - a[valueKey])
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

  rankBy('votes', 'votesRank')
  rankBy('films', 'filmsRank')
  rows.forEach(r => { r.totalDirectors = rows.length })
  return rows
}
