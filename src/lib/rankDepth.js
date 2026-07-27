// Rank depth — the single shared "how much of the canon am I looking at" filter,
// used by the Countries page, individual country pages, and Explore.
//
// The cutoff is a FILM-COUNT TARGET, not a rank cutoff. "Top 100" means "the ~100
// highest-ranked films of this poll", which is then resolved to whatever rank that
// takes in the poll you're looking at. A plain rank cutoff reads intuitively but
// behaves badly in the small polls: rank <= 100 in 1952 is all 199 films that poll
// ever recorded, because ties stack up enormously at the vote floor. Asking for 100
// and getting 82 is a much smaller surprise than asking for 100 and getting 199.
//
// Tie groups are never split — a rank shared by 40 films is either wholly in or
// wholly out, so the resolved count lands at or below the target, never above.

// Candidate targets offered as slider stops, deliberately sparse — intermediate
// rungs (25, and everything past 500) mostly produced stops nobody would choose,
// and in the small polls they collapsed into each other anyway. Which of these
// survive depends on the poll; see buildStops.
//
// Past 500 the ladder switches from counting films to the vote floor: the useful
// deep cut isn't "top 1000", it's "everything except the films only one person
// voted for", which is where the long tail actually begins.
export const RANK_TARGETS = [10, 50, 100, 250, 500]

// pollHistory stores single polls under a numeric year and the cross-poll aggregate
// under the string 'all'.
export const pollKeyOf = (poll) => (poll === 'all' ? 'all' : parseInt(poll, 10))

export const pollEntryOf = (film, pollKey) =>
  film?.pollHistory?.find(p => p.year === pollKey)

/**
 * Rank histogram for one poll: ascending [rank, filmsAtThatRank, votesPerFilm]
 * groups plus the poll's total film count. Everything else here is derived from
 * this, so build it once per (films, poll) and memoize.
 *
 * Rank is really just a proxy for vote count — every film sharing a rank shares a
 * vote total (verified across all 9 polls), so a "tie group" is exactly "the films
 * with N votes". 1972 has 16 rank groups because it has 16 distinct vote counts.
 * Carrying the vote count lets the UI explain a cutoff by what caused it.
 */
export function buildRankIndex(films, poll) {
  const pollKey = pollKeyOf(poll)
  const counts = new Map()
  let total = 0

  films?.forEach(film => {
    const entry = pollEntryOf(film, pollKey)
    if (!entry || !(entry.votes > 0)) return
    total++
    if (entry.rank == null) return
    const group = counts.get(entry.rank) || { count: 0, votes: entry.votes }
    group.count++
    counts.set(entry.rank, group)
  })

  const groups = Array.from(counts.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([rank, g]) => [rank, g.count, g.votes])
  return { groups, total }
}

export const EMPTY_RANK_INDEX = { groups: [], total: 0 }

/**
 * Resolve a film-count target to a rank cutoff and the film count it actually yields.
 * A null target means no cutoff at all.
 *
 * Tie groups are indivisible, so a target almost always falls inside one and the
 * result lands on whichever side is CLOSER — it can overshoot. Always rounding down
 * strands the result far below the target whenever the next block is large: 1972
 * jumps 31 -> 53 -> 86 -> 154 -> 363, so a target of 50 would have returned 31 (19
 * short) when 53 (3 over) was sitting right there.
 *
 * Callers display filmCount, never the target, so overshoot is never visible as a
 * broken promise — see buildStops.
 */
export function resolveTarget(index, target) {
  const lastVotes = index.groups.length ? index.groups[index.groups.length - 1][2] : null
  if (target == null) return { cutoffRank: null, filmCount: index.total, minVotes: lastVotes }

  let cumulative = 0
  let cutoffRank = null
  let minVotes = null
  for (const [rank, count, votes] of index.groups) {
    const next = cumulative + count
    if (next > target) {
      // Overshoot when it lands closer, and always when stopping short would leave
      // nothing at all (a target below the very first tie group).
      if (cumulative === 0 || (next - target) < (target - cumulative)) {
        return { cutoffRank: rank, filmCount: next, minVotes: votes }
      }
      break
    }
    cumulative = next
    cutoffRank = rank
    minVotes = votes
  }

  return { cutoffRank, filmCount: cumulative, minVotes }
}

/**
 * The slider stops for one poll.
 *
 * Each stop's VALUE is the film count it actually delivers, not the target that
 * placed it there. A poll only has as many reachable depths as it has tie-group
 * boundaries — 1972's are 9, 11, 17, 23, 24, 31, 53, 86, 154, 363, with nothing at
 * all between 86 and 154 — so a stop labelled "Top 100" there would be promising a
 * set that does not exist. Labelling by the achieved count means the number on the
 * control is always the true one; RANK_TARGETS only decides where the stops sit.
 *
 * Targets that resolve to the same set are redundant (1982's Top 250 and Top 500
 * both land on 216 films), and any target that swallows the whole poll is just "All
 * films" under another name. Both are dropped, so every reachable stop shows
 * something different.
 *
 * The last two rungs are fixed: everything above the single-vote tail, then All.
 */
export function buildStops(index) {
  const stops = []
  const seenCounts = new Set()

  const push = (resolved) => {
    if (!resolved || resolved.filmCount === 0 || resolved.filmCount >= index.total) return
    if (seenCounts.has(resolved.filmCount)) return
    seenCounts.add(resolved.filmCount)
    stops.push({ value: resolved.filmCount, ...resolved })
  }

  // The tightest rung rounds UP, so it never shows fewer than ten films. Nearest
  // rounding lands it on 9 in the polls with a tie straddling rank 10 (1952, 1972,
  // 1982), which contradicts the home page's "top ten of every poll" shelves — those
  // take rank <= 10 and so show 12, 11 and 11. Rounding up agrees with them exactly.
  push(resolveAtLeast(index, RANK_TARGETS[0]))
  RANK_TARGETS.slice(1).forEach(target => push(resolveTarget(index, target)))
  push(multiVoteBoundary(index))

  stops.push({ value: null, cutoffRank: null, filmCount: index.total })
  return stops
}

/**
 * The shallowest boundary holding AT LEAST `target` films — used for the tightest
 * rung, where landing short of ten would misrepresent it as the poll's top ten.
 */
function resolveAtLeast(index, target) {
  let cumulative = 0
  for (const [rank, count, votes] of index.groups) {
    cumulative += count
    if (cumulative >= target) return { cutoffRank: rank, filmCount: cumulative, minVotes: votes }
  }
  return null
}

/**
 * The deepest cut that still excludes films only one person voted for. Groups run
 * rank-ascending / votes-descending, so this is simply the last group with 2+ votes.
 * Always deeper than any surviving film-count stop (anything past it is the whole
 * poll), so it lands second-to-last on the slider.
 */
function multiVoteBoundary(index) {
  let cumulative = 0
  let cutoffRank = null
  let minVotes = null
  for (const [rank, count, votes] of index.groups) {
    if (votes < 2) break
    cumulative += count
    cutoffRank = rank
    minVotes = votes
  }
  return cumulative === 0 ? null : { cutoffRank, filmCount: cumulative, minVotes }
}

/** Slider position for the active target: the stop yielding the closest film count. */
export function stopIndexFor(stops, filmCount) {
  if (!stops.length) return 0
  let best = 0
  stops.forEach((stop, i) => {
    if (Math.abs(stop.filmCount - filmCount) < Math.abs(stops[best].filmCount - filmCount)) best = i
  })
  return best
}

/** Does this film fall inside the cutoff for the active poll? */
export function filmPassesDepth(film, pollKey, cutoffRank) {
  const entry = pollEntryOf(film, pollKey)
  if (!entry || !(entry.votes > 0)) return false
  if (cutoffRank == null) return true
  return entry.rank != null && entry.rank <= cutoffRank
}

/**
 * Short label for banners and filter summaries. Always the achieved count, never
 * the target. At full depth the count is dropped — the banner already opens with
 * it — and a cutoff instead carries its vote floor, which is the one number the
 * banner doesn't otherwise show and the reason the cutoff sits where it does.
 */
export function describeDepth(target, filmCount, minVotes = null) {
  if (target == null) return 'All films'
  const floor = minVotes != null
    ? ` (${minVotes.toLocaleString()}+ ${minVotes === 1 ? 'vote' : 'votes'})`
    : ''
  return `Top ${filmCount.toLocaleString()} films${floor}`
}
