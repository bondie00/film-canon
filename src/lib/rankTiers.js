// Rank shading, resolved per poll.
//
// Standing is an ORDINAL quantity — better rank, darker shade — so it gets one
// hue in monotone lightness steps rather than five unrelated colors, which would
// hide the ordering. The steps come from the standard blue sequential ramp and
// validate as an ordinal scale on white: monotone lightness PASS · adjacent
// ΔL ≥ 0.06 PASS · light end 2.11:1 vs surface PASS · single hue (4°) PASS.
//
// SEVEN is the ceiling, and the reason an earlier five-step version of this file
// claimed FIVE was: it drew its steps from the design system's documented blue
// ramp, which is quantised at ΔL ≈ 0.047 per step. At that quantisation every
// usable gap has to skip two steps (0.094), and the ten legal steps offer only
// nine gaps — so five colors is genuinely the most that ramp's own steps can
// yield. Sampling the same curve at even L intervals instead of snapping to its
// steps fits SEVEN at ΔL 0.071 across the identical range. Eight lands at 0.061
// and fails the gate, so seven is the real limit, not a round number.
//
// Both endpoints are unchanged from the five-step version, so nothing regressed:
// the pale end is still the lightest step clearing 2:1 on white (2.11:1) and the
// dark end is still the ramp's darkest. The five added/moved middle steps are
// interpolated along the documented curve, holding its hue.
//
// Cutoffs are PERCENTILES OF EACH POLL'S OWN FIELD, not fixed rank numbers.
// Fixed numbers break down because polls differ enormously in size and are
// compressed by ties: the worst rank in 1952 is #83 (199 films drew a vote),
// while 2022 runs to #1652. Absolute cutoffs of 250/1000 are unreachable in 1952,
// so that poll would draw entirely in the dark end of the ramp and read as a
// golden age. Percentiles make each poll use the whole ramp and mean roughly the
// same thing everywhere: about 1 / 1 / 1 / 4 / 8 / 14 / 71% of the field per tier.
//
// Ties look after themselves. A tier is a rank threshold and tied films share a
// rank, so no tie can ever be split across two shades. What ties DO set is a
// floor on the palest tier: 51–64% of any poll's films sit in one block on a
// single vote, which is why the last tier always lands near 70%.
//
// The resulting cutoffs are snapped to round benchmarks (2022 → 25/50/100/250/
// 500/1000, 1952 → 2/4/5/15/25/50), so nothing exposes a percentage to the
// reader and any label reads as a round number rather than "top 4.7%".

// Dark (best) → pale (tail). Validated with the dataviz skill's ordinal checks
// against a white surface: monotone lightness PASS · adjacent ΔL ≥ 0.06 PASS
// (every gap 0.071) · light end 2.11:1 vs surface PASS · single hue (4°) PASS.
export const TIER_COLORS = [
  '#0d366b', '#14498b', '#1c5cab', '#2771ca', '#3987e5', '#619fe9', '#86b6ef',
]
const TAIL_INDEX = TIER_COLORS.length - 1

// Share of each poll's ranked field falling at or above each of the six cutoffs,
// geometric from the top so the darkest tier stays genuinely elite — 0.0065 puts
// it at 2022's top 25 rather than its top 40.
//
// It stops at 0.35 because past roughly a third of the field every poll runs into
// its single-vote tie block, so a further cutoff would land inside a block it
// cannot split and buy nothing.
const TARGETS = [0.0065, 0.015, 0.032, 0.07, 0.16, 0.35]

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
    let filled = 0 // films already inside the previous cutoff
    TARGETS.forEach(target => {
      const raw = ranks[Math.min(n - 1, Math.ceil(target * n) - 1)]
      let cut = snap(raw)
      // A cutoff admitting no new film paints a tier with nothing in it, and the
      // legend then shows a shade that shades nothing. It happens in the small
      // polls, where the tight upper targets land inside one tie block: in 1952
      // the top three targets all resolve into the first handful of ranks. Push
      // the cutoff up to the next film's rank so every tier holds at least one.
      if (filled < n) cut = Math.max(cut, ranks[filled])
      // Keep boundaries strictly increasing after snapping.
      if (cuts.length && cut <= cuts[cuts.length - 1]) cut = cuts[cuts.length - 1] + 1
      cuts.push(cut)
      while (filled < n && ranks[filled] <= cut) filled++
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

/**
 * Ramp position from a rank already resolved against a poll, given that poll's
 * cuts. Callers holding the rank (the director aggregates carry one per film)
 * skip the pollHistory lookup; an unranked film falls to the tail.
 */
export function tierIndexForRank(rank, cuts) {
  if (rank == null || !cuts) return TAIL_INDEX
  const i = cuts.findIndex(c => rank <= c)
  return i === -1 ? TAIL_INDEX : i
}

/**
 * Tier boundaries as reader-facing labels — one per TIER_COLORS step. The
 * cuts are already snapped to round benchmarks, so these read as "Top 200"
 * rather than as a percentile.
 */
export function tierLabels(cuts) {
  if (!cuts?.length) return []
  return [
    ...cuts.map(c => `Top ${c.toLocaleString()}`),
    `Past ${cuts[cuts.length - 1].toLocaleString()}`,
  ]
}

/** Ramp position for a film in a poll — 0 is the best tier, last is the tail. */
export function tierIndexOf(film, poll, cutoffs) {
  return tierIndexForRank(rankIn(film, poll), cutoffs?.get(String(poll)))
}

export function tierColorOf(film, poll, cutoffs) {
  return TIER_COLORS[tierIndexOf(film, poll, cutoffs)]
}
