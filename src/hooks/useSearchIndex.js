import { useState, useRef, useCallback } from 'react'
import { loadFilms, loadCountries } from '../utils/filmsData'

// Lazy client-side search index for the global search bar. The heavy films.json
// isn't fetched until the user first focuses a search box (activate()), then the
// built index is cached at module scope and shared across every search box.
//
// Result entity types and where they navigate:
//   film     -> /film/:key                              (exists)
//   country  -> /visualizations/country/:name           (exists)
//   poll     -> /explore?poll=YYYY                       (exists)
//   director -> /explore?poll=all&director=…             (interim, until a director page exists)

const POLL_YEARS = [2022, 2012, 2002, 1992, 1982, 1972, 1962, 1952]

let indexCache = null

async function buildIndex() {
  if (indexCache) return indexCache
  const [films, countries] = await Promise.all([loadFilms(), loadCountries()])

  const directorSet = new Set()
  const filmEntries = films.map(f => {
    f.directors?.forEach(d => d && directorSet.add(d))
    return {
      key: f.key,
      title: f.FilmTitle || '',
      alt: f.AlternateTitle || '',
      year: f.Year,
      director: f.directors?.[0] || '',
    }
  })

  const countryList = Object.keys(countries).filter(c => !c.startsWith('_'))

  indexCache = {
    films: filmEntries,
    directors: Array.from(directorSet).sort(),
    countries: countryList.sort(),
  }
  return indexCache
}

const EMPTY = { films: [], directors: [], countries: [], polls: [] }

export function useSearchIndex() {
  const [ready, setReady] = useState(!!indexCache)
  const idxRef = useRef(indexCache)

  const activate = useCallback(() => {
    if (idxRef.current) return
    buildIndex().then(idx => {
      idxRef.current = idx
      setReady(true)
    })
  }, [])

  const search = useCallback((raw) => {
    const idx = idxRef.current
    const query = raw.trim().toLowerCase()
    if (!idx || !query) return EMPTY

    // Films — substring match on title or alternate title, prefix matches first.
    const films = []
    for (const f of idx.films) {
      const t = f.title.toLowerCase()
      const a = f.alt.toLowerCase()
      if (t.includes(query) || a.includes(query)) {
        films.push({ ...f, _starts: t.startsWith(query) })
      }
    }
    films.sort((x, y) => (y._starts - x._starts) || x.title.length - y.title.length)

    const rankName = (list) =>
      list
        .filter(n => n.toLowerCase().includes(query))
        .sort((a, b) => {
          const as = a.toLowerCase().startsWith(query)
          const bs = b.toLowerCase().startsWith(query)
          return (bs - as) || a.length - b.length
        })

    const polls = POLL_YEARS.map(String).filter(y => y.includes(query))

    return {
      films: films.slice(0, 6),
      directors: rankName(idx.directors).slice(0, 4),
      countries: rankName(idx.countries).slice(0, 4),
      polls: polls.slice(0, 4),
    }
  }, [])

  return { ready, activate, search }
}
