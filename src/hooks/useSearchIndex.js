import { useState, useRef, useCallback } from 'react'
import { loadFilms, loadCountries, loadVoterSlugs } from '../utils/filmsData'

// Lazy client-side search index for the global search bar. The heavy films.json
// isn't fetched until the user first focuses a search box (activate()), then the
// built index is cached at module scope and shared across every search box.
//
// Result entity types and where they navigate:
//   film     -> /film/:key                              (exists)
//   country  -> /countries/:name                         (exists)
//   poll     -> /explore?poll=YYYY                       (exists)
//   director -> /director/:name                         (exists)
//   voter    -> /voter/:slug                            (exists)

const POLL_YEARS = [2022, 2012, 2002, 1992, 1982, 1972, 1962, 1952]

let indexCache = null

async function buildIndex() {
  if (indexCache) return indexCache
  const [films, countries, voterSlugs] = await Promise.all([
    loadFilms(), loadCountries(), loadVoterSlugs(),
  ])

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

  // One entry per voter, keyed by slug so a joint ballot ("Dan and Edna
  // Fainaru") contributes to both people rather than becoming its own result.
  // Every raw spelling is kept as a searchable alias, so looking up a name as it
  // was recorded in an older poll still finds the person's page.
  const bySlug = new Map()
  Object.entries(voterSlugs).forEach(([raw, people]) => {
    people.forEach(p => {
      let entry = bySlug.get(p.slug)
      if (!entry) {
        entry = { name: p.name, slug: p.slug, aliases: new Set([p.name.toLowerCase()]) }
        bySlug.set(p.slug, entry)
      }
      entry.aliases.add(raw.toLowerCase())
    })
  })
  const voterList = Array.from(bySlug.values())
    .map(v => ({ name: v.name, slug: v.slug, aliases: Array.from(v.aliases) }))
    .sort((a, b) => a.name.localeCompare(b.name))

  indexCache = {
    films: filmEntries,
    directors: Array.from(directorSet).sort(),
    countries: countryList.sort(),
    voters: voterList,
  }
  return indexCache
}

const EMPTY = { films: [], directors: [], countries: [], polls: [], voters: [] }

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

    // Voters match on their own name or any spelling their ballots were filed
    // under; a name that starts with the query outranks one that merely contains it.
    const voters = idx.voters
      .filter(v => v.aliases.some(a => a.includes(query)))
      .sort((a, b) => {
        const as = a.name.toLowerCase().startsWith(query)
        const bs = b.name.toLowerCase().startsWith(query)
        return (bs - as) || a.name.length - b.name.length
      })

    return {
      films: films.slice(0, 6),
      directors: rankName(idx.directors).slice(0, 4),
      voters: voters.slice(0, 4),
      countries: rankName(idx.countries).slice(0, 4),
      polls: polls.slice(0, 4),
    }
  }, [])

  return { ready, activate, search }
}
