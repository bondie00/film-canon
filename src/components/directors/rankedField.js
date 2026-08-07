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

/** Rows sorted by the active metric, ties broken by name for a stable order. */
export function orderRows(rows, valueKey) {
  return [...(rows || [])].sort(
    (a, b) => b[valueKey] - a[valueKey] || a.name.localeCompare(b.name)
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
