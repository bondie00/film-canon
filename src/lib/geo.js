/**
 * Country → continent lookup, and how a country selection resolves to a set of
 * countries.
 *
 * ## Why continents are a SEPARATE selection dimension
 *
 * Selecting a continent used to add every one of its countries to the selection,
 * individually. Europe is 40 of them. That made /explore too WIDE: the result
 * summary above the gallery spells the selection out ("France, Italy, Germany,
 * …" for all forty), and it shares a flex row, so the line pushed that row past
 * the page. It also meant 40 chips in the filter rail for one click.
 *
 * So a continent is now its own token — one chip, one `?continent=` param — and
 * a selection is the UNION of the continents and the countries in it. The chips
 * stay proportional to what you asked for rather than to how many countries
 * happen to be in it.
 *
 * ## Excluding one country from a selected continent
 *
 * A continent token can't express "Europe except France", so unchecking a
 * country inside a selected continent EXPANDS that token back into its explicit
 * countries, minus the one you unchecked (see CountryFilter). The compact form
 * is kept for as long as it's true and abandoned the moment it stops being —
 * rather than being unexpressible, which is what a pure continent token would
 * be, or always expanded, which is the problem this solves.
 *
 * Expansion is over the countries actually on offer, never the full atlas, so it
 * can't introduce chips for countries with no films in the current view.
 */

/** `countriesData` keys beginning with `_` are metadata, not countries. */
const isCountryKey = key => !key.startsWith('_')

/**
 * `{ continentOf, countriesIn, continents }` from countries.json.
 *
 * `countriesIn` is built from `available` when given — the countries the current
 * view actually offers — so a continent resolves to what's on screen rather than
 * to every country the atlas knows.
 */
export function buildContinentIndex(countriesData, available = null) {
  const continentOf = new Map()
  const countriesIn = new Map()

  if (countriesData) {
    Object.entries(countriesData).forEach(([name, info]) => {
      if (!isCountryKey(name)) return
      const continent = info?.continent
      if (!continent) return
      if (available && !available.has(name)) return
      continentOf.set(name, continent)
      if (!countriesIn.has(continent)) countriesIn.set(continent, [])
      countriesIn.get(continent).push(name)
    })
  }

  return { continentOf, countriesIn, continents: [...countriesIn.keys()] }
}

/**
 * The selection as a flat Set of country names — the union of the named
 * countries and every country in the named continents.
 *
 * Filtering resolves to this once and then asks a plain `set.has`, so the two
 * dimensions cost the same as one and no call site has to know that continents
 * exist.
 */
export function resolveCountrySelection({ countries = [], continents = [] }, index) {
  const out = new Set(countries)
  continents.forEach(continent => {
    (index?.countriesIn?.get(continent) || []).forEach(name => out.add(name))
  })
  return out
}

/** Whether a selection is empty in both dimensions. */
export const isEmptySelection = ({ countries = [], continents = [] } = {}) =>
  countries.length === 0 && continents.length === 0

/** Films matching the selection; the whole list when nothing is selected. */
export function filterFilmsByCountrySelection(films, selection, index) {
  if (!films || isEmptySelection(selection)) return films
  const wanted = resolveCountrySelection(selection, index)
  if (wanted.size === 0) return []
  return films.filter(f => (f.countries || []).some(c => wanted.has(c)))
}
