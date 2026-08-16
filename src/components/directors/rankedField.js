// Where a director ranking stops being a ranking.
//
// Past a certain depth every director is tied with someone, and a list of tied
// names in an arbitrary order isn't an ordering however far you scroll it. In
// 2022 the last director with a vote total nobody shares is #149, and 1,038 of
// the 2,071 sit together on the vote floor. The equivalent depths are #96 in
// 2012, #41 in 1992, #22 in 1952 — short in the small polls and long in the big
// ones, which is the truth about those polls rather than a display cap.
//
// Both the ranked list and the scatter cut here, from this one function, so they
// can never disagree about where the field ends.

/**
 * Rows sorted by the active metric, ties broken by THE OTHER METRIC.
 *
 * The tiebreak matters far more than it looks, because under the films metric
 * almost everything is a tie: at 2022's Top-100 depth, 48 of 73 directors have
 * exactly one film. That block used to be ordered by NAME, so the chart read
 * Kiarostami, Hammid, Weerasethakul, Loden — alphabetical, which is genuinely
 * arbitrary and looked it. By votes the same block opens Welles (164), Denis
 * (106), Vertov (100), which is an ordering that means something.
 *
 * It also makes the top-N cut defensible: DirectorsMain takes exactly N rows
 * and therefore cuts through a tie block. Cutting is only acceptable because
 * this secondary key decides where the cut falls.
 *
 * Symmetric in both directions — a votes tie breaks by films, so two directors
 * on equal votes are separated by whose canon is broader. Name is the last
 * resort, present only to keep the sort deterministic (Donen and Kelly share
 * both totals, being credited on the same film).
 */
export function orderRows(rows, valueKey) {
  const tiebreak = valueKey === 'films' ? 'votes' : 'films'
  return [...(rows || [])].sort(
    (a, b) =>
      b[valueKey] - a[valueKey] ||
      b[tiebreak] - a[tiebreak] ||
      a.name.localeCompare(b.name)
  )
}

/**
 * The deepest position whose value no other director shares, and how many sit
 * below it. `ordered` must already be sorted by `valueKey` descending.
 */
export function tieFloor(ordered, valueKey) {
  const counts = new Map()
  ordered.forEach(r => counts.set(r[valueKey], (counts.get(r[valueKey]) || 0) + 1))

  let lastUnique = 0
  ordered.forEach((row, i) => {
    if (counts.get(row[valueKey]) === 1) lastUnique = i + 1
  })

  return { lastUnique, tiedBelow: ordered.length - lastUnique }
}
