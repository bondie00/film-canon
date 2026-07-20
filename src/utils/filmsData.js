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
