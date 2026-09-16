import { useMemo } from 'react'
import { pollKeyOf, pollEntryOf } from '../lib/rankDepth'
import { isFormatTag } from '../lib/genres'

/**
 * Per-genre totals for the active poll at an arbitrary rank cutoff, aggregated
 * live from films.json — the genre-side twin of useDirectorAggregates.
 *
 * A film carries ~2 tags, so it counts in full toward each of them: Drama and
 * Romance both get Brief Encounter's votes. That means genre totals do NOT sum
 * to the poll's total (the page's header figures come from `totals`, which are
 * counted once per film), and nothing here should be drawn as a share of a
 * whole. Ranked bars and per-row shading only.
 *
 * Rows split into CONTENT (what kind of film) and FORMAT (Short, Silent,
 * Animation…: what the work is). Only content rows are ranked against each
 * other — "Short" isn't an alternative to "Western" — and each family gets its
 * own competition ranks, so a Format row's rank is among formats.
 *
 * Each row carries its top film (best-voted in this poll, ties by rank) and
 * `topShare`, that film's share of the genre's votes — the concentration
 * measure: Drama's leader is 3% of Drama, a Western's is a fifth of Westerns.
 * The share is a VOTES quantity in both metrics; there's no film-count reading
 * of "one film's share" that says anything.
 */
export default function useGenreAggregates(filmsData, selectedPoll, cutoffRank) {
  return useMemo(() => {
    if (!filmsData) return null

    const pollKey = pollKeyOf(selectedPoll)
    const byGenre = new Map()
    let totalFilms = 0
    let totalVotes = 0

    filmsData.forEach(film => {
      const entry = pollEntryOf(film, pollKey)
      if (!entry || !(entry.votes > 0)) return
      if (cutoffRank != null && (entry.rank == null || entry.rank > cutoffRank)) return

      totalFilms++
      totalVotes += entry.votes

      film.genres?.forEach(name => {
        if (!name) return
        let acc = byGenre.get(name)
        if (!acc) {
          acc = { name, votes: 0, films: 0, filmList: [], isFormat: isFormatTag(name) }
          byGenre.set(name, acc)
        }
        acc.votes += entry.votes
        acc.films += 1
        acc.filmList.push({ film, votes: entry.votes, rank: entry.rank ?? null })
      })
    })

    const rows = []
    byGenre.forEach(acc => {
      acc.filmList.sort((a, b) => b.votes - a.votes || (a.rank ?? 1e9) - (b.rank ?? 1e9))
      const top = acc.filmList[0]
      rows.push({
        ...acc,
        topFilm: top?.film ?? null,
        topVotes: top?.votes ?? 0,
        topRank: top?.rank ?? null,
        topShare: acc.votes > 0 && top ? top.votes / acc.votes : 0,
      })
    })

    const content = rows.filter(r => !r.isFormat)
    const formats = rows.filter(r => r.isFormat)
    assignGenreRanks(content)
    assignGenreRanks(formats)

    return {
      rows,
      content,
      formats,
      totals: { films: totalFilms, votes: totalVotes, genres: content.length },
    }
  }, [filmsData, selectedPoll, cutoffRank])
}

/** Competition ranks (1, 2, 2, 4…) on both metrics, within one family. */
function assignGenreRanks(rows) {
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
  rows.forEach(r => { r.totalGenres = rows.length })
  return rows
}
