// Rank shading, resolved per poll.
//
// Standing is an ORDINAL quantity — better rank, darker shade — so it gets one
// hue in monotone lightness steps rather than five unrelated colors, which would
// hide the ordering. The steps come from the standard blue sequential ramp and
// validate as an ordinal scale on white: monotone lightness PASS · adjacent
// ΔL ≥ 0.06 PASS · light end 2.11:1 vs surface PASS · single hue (4°) PASS.
//
// FIVE is the ceiling, not a choice: a sixth step in this hue lands at ΔL ≈ 0.047
// against its neighbour — below the gate, i.e. two shades a reader can't reliably
// tell apart. More levels would need a second channel, not a sixth blue.
//
// Cutoffs are PERCENTILES OF EACH POLL'S OWN FIELD, not fixed rank numbers.
// Fixed numbers break down because polls differ enormously in size and are
// compressed by ties: the worst rank in 1952 is #83 (199 films drew a vote),
// while 2022 runs to #1652. Absolute cutoffs of 250/1000 are unreachable in 1952,
// so that poll would draw entirely in the dark end of the ramp and read as a
// golden age. Percentiles make each poll use the whole ramp and mean the same
// thing: roughly 1% / 4% / 10% / 15% / 70% of the field per tier, in every poll.
//
// Ties look after themselves. A tier is a rank threshold and tied films share a
// rank, so no tie can ever be split across two shades. What ties DO set is a
// floor on the palest tier: 51–64% of any poll's films sit in one block on a
// single vote, which is why the last tier always lands near 70%.
//
// The resulting cutoffs are snapped to round benchmarks (2022 → 40/200/500/1000,
// 1952 → 2/10/25/50), so nothing exposes a percentage to the reader and any
// future label would read as a round number rather than "top 4.7%".

// Dark (best) → pale (tail).
export const TIER_COLORS = ['#0d366b', '#1c5cab', '#2a78d6', '#5598e7', '#86b6ef']
const TAIL_INDEX = TIER_COLORS.length - 1

// Share of each poll's ranked field falling at or above each of the four cutoffs.
const TARGETS = [0.01, 0.05, 0.15, 0.35]

// Benchmarks a cutoff may snap to, so boundaries are round rather than raw.
const LADDER = [
  1, 2, 3, 5, 10, 15, 20, 25, 30, 40, 50, 75,
  100, 150, 200, 250, 300, 400, 500, 750, 1000, 1500, 2000, 2500,
]

/** Nearest round benchmark to a raw cutoff. */
function snap(value) {
  return LADDER.reduce((best, x) =>
    Math.abs(x - value) < Math.abs(best - value) ? x : best
  , LADDER[0])
}

/**
 * Percentile cutoffs per poll, computed once from the whole dataset — a film's
 * shade depends on the field it competed in, so this needs every film, not just
 * one director's. Returns Map<'all'|'2022'|…, [c1, c2, c3, c4]>.
 */
export function buildTierCutoffs(films) {
  const ranksByPoll = new Map()
  films.forEach(film =>
    film.pollHistory.forEach(p => {
      if (!(p.votes > 0) || p.rank == null) return
      const key = String(p.year)
      if (!ranksByPoll.has(key)) ranksByPoll.set(key, [])
      ranksByPoll.get(key).push(p.rank)
    })
  )

  const cutoffs = new Map()
  ranksByPoll.forEach((ranks, key) => {
    ranks.sort((a, b) => a - b)
    const n = ranks.length
    const cuts = []
    TARGETS.forEach(target => {
      const raw = ranks[Math.min(n - 1, Math.ceil(target * n) - 1)]
      let cut = snap(raw)
      // Keep boundaries strictly increasing after snapping.
      if (cuts.length && cut <= cuts[cuts.length - 1]) cut = cuts[cuts.length - 1] + 1
      cuts.push(cut)
    })
    cutoffs.set(key, cuts)
  })
  return cutoffs
}

/** The film's entry for a poll ('all' is the combined ranking). */
export function pollEntry(film, poll = 'all') {
  const key = poll === 'all' ? 'all' : parseInt(poll, 10)
  return film.pollHistory.find(p => p.year === key) || null
}

export function rankIn(film, poll = 'all') {
  return pollEntry(film, poll)?.rank ?? null
}

export function votesIn(film, poll = 'all') {
  return pollEntry(film, poll)?.votes ?? 0
}

/** Ramp position for a film in a poll — 0 is the best tier, last is the tail. */
export function tierIndexOf(film, poll, cutoffs) {
  const rank = rankIn(film, poll)
  const cuts = cutoffs?.get(String(poll))
  if (rank == null || !cuts) return TAIL_INDEX
  const i = cuts.findIndex(c => rank <= c)
  return i === -1 ? TAIL_INDEX : i
}

export function tierColorOf(film, poll, cutoffs) {
  return TIER_COLORS[tierIndexOf(film, poll, cutoffs)]
}
