// Where one subject stands among every other subject of its kind, poll by poll.
//
// Three pages ask the same question and draw the answer with the same strip and
// the same chart: a film's rank among films, a director's among directors, a
// country's among countries. Every one of them needs the same six figures per
// poll — rank, votes, films, field size, and the depth that poll actually reached
// — so they all produce the same ROW SHAPE and the components take rows:
//
//   { year, rank, votes, films, field, floor }
//
// with `films` and `field` null where the page has no such figure (a film has no
// film count of its own, and its field size is already implied).
//
// The film case is a lookup — pollHistory already carries the rank. The two
// aggregate cases have to build the ranking, and differ only in which array of
// names a film is credited to, so that lives here once and each page passes an
// accessor.
//
// Derived from films.json rather than the pre-aggregated directors.json /
// countries.json, neither of which carries per-poll ranks. One pass builds all
// eight tables.
//
// Standing is by VOTES, not film count, for both kinds:
//   - Directors: a per-poll film count is almost all ties — the great majority
//     place a single film in any given poll, so a count ranking would collapse
//     most of the field onto one or two values.
//   - Countries: the same at the top for the opposite reason. The US and France
//     lead on both measures in every poll, but film counts run to the thousands
//     across the long tail and votes are what actually separate the field.
// Films are still tallied per poll, but as the figure that makes a rank legible
// rather than as the thing ranked.
//
// Ties share a rank: an entity's rank is the number strictly ahead of it, plus
// one. Same rule the film ranks use.

import { POLL_YEARS } from '../utils/polls'
import { votesIn } from './rankTiers'

/**
 * One film's rank among all films, per poll — the film page's rows.
 *
 * No tally needed: pollHistory already carries the rank the poll assigned. The
 * floors come from buildPollFloors, which reads them off the whole dataset for
 * the same reason the aggregate builders compute their own — ties compress the
 * deepest rank far below the film count, so 2022 records 3,816 films but bottoms
 * out around #1,652.
 *
 * `films` and `field` stay null: a film has no film count of its own, and the
 * number of films in the poll is not what makes its rank legible.
 */
export function filmStandingRows(film, pollFloors = {}) {
  if (!film?.pollHistory) return []
  return POLL_YEARS.map(year => {
    const poll = film.pollHistory.find(p => p.year === year)
    const appeared = poll && poll.votes > 0
    return {
      year,
      rank: appeared ? poll.rank ?? null : null,
      votes: appeared ? poll.votes : null,
      films: null,
      field: null,
      // Present for every poll, not just the ones this film charted in — the
      // shaded depth band spans the full width regardless.
      floor: pollFloors[year] ?? null,
    }
  })
}

/** The two accessors in use. A film credits its votes in full to each name. */
export const byDirector = film => film.directors
export const byCountry = film => film.countries

/**
 * Each entity's votes and films in one poll. Co-credited films count in full for
 * every name on them — a France/Italy co-production is a film for both, matching
 * how useCountryAggregates and useDirectorAggregates count.
 *
 * Films are tallied alongside the votes that set the rank because they're what
 * makes a rank legible — Godard is #5 in 2022 off 21 films, Akerman #2 off 3.
 */
function tallyPoll(films, poll, getNames) {
  const totals = new Map()
  films.forEach(film => {
    const votes = votesIn(film, poll)
    if (votes <= 0) return
    ;(getNames(film) || []).forEach(name => {
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
 * Standing tables for all eight polls.
 *
 * `floors[year]` is the deepest rank that poll can actually produce, which is
 * shallower than its entity count — 2022 lists 2,072 directors but ties at the
 * vote floor compress its last rank to #1,035, and its 105 countries bottom out
 * at #82. The chart shades below it for the same reason the film page does:
 * without it, being last in a small poll is indistinguishable from sitting
 * mid-table.
 */
export function buildStandings(films, getNames) {
  if (!films || !films.length) return null

  const byPoll = {}
  const floors = {}
  POLL_YEARS.forEach(year => {
    const totals = tallyPoll(films, year, getNames)
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

export const buildDirectorStandings = films => buildStandings(films, byDirector)
export const buildCountryStandings = films => buildStandings(films, byCountry)

/** Rank of `votes` within the poll's tally; ties share a rank. */
function rankOf(entries, votes) {
  let ahead = 0
  for (const e of entries) if (e.votes > votes) ahead += 1
  return ahead + 1
}

/**
 * One entity's standing in each poll: rank, the votes behind it, the films it
 * placed, and the size of the field.
 *
 * `floor` is the deepest rank that poll produced, carried per row because a bare
 * rank is not comparable across polls. The field runs 61 directors deep in 1952
 * and 1,035 in 2022, so Hitchcock's #61 in 1952 was in fact dead last; the same
 * holds for countries, where the field grows from 14 to 105 while the US and
 * France never move off #1 and #2 — the depth is the entire content of those two
 * lines. The strip doesn't use it; the standing chart draws it as a band.
 *
 * Polls the entity drew no votes in return a null rank: a real absence.
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
