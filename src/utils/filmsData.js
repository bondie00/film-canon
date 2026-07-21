// Module-level promise caches so films.json (~8.5MB) and countries.json are
// fetched at most once per page load and shared by every consumer that opts in
// (the landing-page shelves and the global search index today).

let filmsPromise = null
export function loadFilms() {
  if (!filmsPromise) filmsPromise = fetch('/data/films.json').then(r => r.json())
  return filmsPromise
}

let countriesPromise = null
export function loadCountries() {
  if (!countriesPromise) countriesPromise = fetch('/data/countries.json').then(r => r.json())
  return countriesPromise
}

// Raw ballot spelling -> the voter page(s) it belongs to. ~170KB, and enough to
// search voters by name without touching the 3MB voters.json.
let voterSlugsPromise = null
export function loadVoterSlugs() {
  if (!voterSlugsPromise) voterSlugsPromise = fetch('/data/voter-slugs.json').then(r => r.json())
  return voterSlugsPromise
}
