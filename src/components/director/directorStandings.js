// Where a director stands among every other director, poll by poll.
//
// Derived from films.json rather than directors.json, which only carries 2022
// ranks. One pass builds all eight tables.
//
// Standing is by VOTES, not film count. Per poll a film count is almost all
// ties — the great majority of directors place a single film in any given poll,
// so a count-based ranking would collapse most of the field onto one or two
// values. Films are still tallied per poll, but as the figure that makes a rank
// legible rather than as the thing ranked.
//
// Ties share a rank: a director's rank is the number of directors strictly
// ahead, plus one. Same rule the film ranks use.

import { POLL_YEARS } from '../../utils/polls'
import { votesIn } from './rankTiers'

/**
 * Each director's votes and films in one poll. Co-directed films count for both.
 *
 * Films are tallied alongside the votes that set the rank because they're what
 * makes a rank legible — Godard is #5 in 2022 off 21 films, Akerman #2 off 3.
 */
function tallyPoll(films, poll) {
  const totals = new Map()
  films.forEach(film => {
    const votes = votesIn(film, poll)
    if (votes <= 0) return
    ;(film.directors || []).forEach(name => {
      if (!name) return
      const entry = totals.get(name) || { votes: 0, films: 0 }
      entry.votes += votes
      entry.films += 1
      totals.set(name, entry)
    })
  })
  return totals
}

/**
 * Standing tables for all eight polls plus the all-time aggregate.
 *
 * `floors[year]` is the deepest rank that poll can actually produce, which is
 * far shallower than its director count — 2022 lists 2,072 directors but ties
 * at the vote floor compress its last rank to #1,035. The chart shades below it
 * for the same reason the film page does: without it, being last in a small
 * poll is indistinguishable from sitting mid-table.
 */
export function buildDirectorStandings(films) {
  if (!films || !films.length) return null

  const byPoll = {}
  const floors = {}
  POLL_YEARS.forEach(year => {
    const totals = tallyPoll(films, year)
    byPoll[year] = totals
    const values = [...totals.values()].map(e => e.votes)
    if (!values.length) {
      floors[year] = null
      return
    }
    const min = Math.min(...values)
    floors[year] = values.filter(v => v > min).length + 1
  })

  return { byPoll, floors }
}

/** Rank of `votes` within the poll's tally; ties share a rank. */
function rankOf(entries, votes) {
  let ahead = 0
  for (const e of entries) if (e.votes > votes) ahead += 1
  return ahead + 1
}

/**
 * One director's standing in each poll: rank, the votes behind it, the films
 * they placed, and the size of the field.
 *
 * `floor` is the deepest rank that poll produced, carried per row because a bare
 * rank is not comparable across polls — the field runs 61 deep in 1952 and 1,035
 * in 2022, so Hitchcock's #61 in 1952 was in fact dead last. The strip doesn't
 * use it; the standing chart draws it as a depth band.
 *
 * Polls the director drew no votes in return a null rank: a real absence.
 */
export function standingByPoll(standings, name) {
  if (!standings) return []
  return POLL_YEARS.map(year => {
    const totals = standings.byPoll[year]
    const mine = totals?.get(name)
    const floor = standings.floors[year]
    if (!mine) {
      return { year, rank: null, votes: null, films: 0, field: totals?.size ?? 0, floor }
    }
    return {
      year,
      rank: rankOf(totals.values(), mine.votes),
      votes: mine.votes,
      films: mine.films,
      field: totals.size,
      floor,
    }
  })
}
