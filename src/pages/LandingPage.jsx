import { useState, useEffect, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import GlobalSearch from '../components/search/GlobalSearch'
import { loadFilms } from '../utils/filmsData'
import { posterUrl, landscapeImage } from '../utils/filmImages'
import { filmUrl } from '../lib/routes'
import { PUBLIC_MODE } from '../lib/siteMode'

const POLL_YEARS = [2022, 2012, 2002, 1992, 1982, 1972, 1962, 1952]
const SHELF_MAX = 12 // top ~10, a little slack for ties at rank 10

// Countries, Directors and Genres lead, in that order: they're the entity
// sections — hubs the header also carries at top level (Genres has no detail
// pages yet). The other two are single visualizations.
const VIZ_CARDS = [
  { to: '/countries', title: 'Countries', blurb: 'Where the canon comes from — a world map of 117 countries.' },
  { to: '/directors', title: 'Directors', blurb: 'Whose films the critics keep choosing, and how deep each filmography runs.' },
  { to: '/genres', title: 'Genres', blurb: 'What kinds of film make the canon, and the one film each genre leans on.' },
  { to: '/visualizations/decades', title: 'Decades & Age', blurb: 'Which eras the critics keep returning to.' },
  { to: '/visualizations/evolution', title: 'Canon Evolution', blurb: 'How films climbed and fell across seven decades of polls.' },
]

export default function LandingPage() {
  const [films, setFilms] = useState(null)

  useEffect(() => {
    let cancelled = false
    loadFilms().then(data => { if (!cancelled) setFilms(data) })
    return () => { cancelled = true }
  }, [])

  // Top ~10 films for each poll, in rank order.
  const shelves = useMemo(() => {
    if (!films) return []
    return POLL_YEARS.map(year => {
      const ranked = films
        .map(f => {
          const p = f.pollHistory.find(x => x.year === year)
          return p && p.rank != null && p.rank <= 10 ? { ...f, _rank: p.rank, _votes: p.votes } : null
        })
        .filter(Boolean)
        .sort((a, b) => a._rank - b._rank)
        .slice(0, SHELF_MAX)
      return { year, films: ranked }
    })
  }, [films])

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* HERO */}
      <section className="border-b-2 border-black bg-white">
        <div className="max-w-7xl 3xl:max-w-wide mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <h1 className="text-5xl md:text-7xl font-black text-black uppercase tracking-tight leading-[0.95]">
            Every film<br />the critics chose.
          </h1>
          <p className="mt-5 text-lg text-gray-600 max-w-2xl">
            Seven decades of Sight &amp; Sound Greatest Films polls, gathered in one place for the
            first time, tracing how the film canon has been made and remade.
          </p>

          {/* Two co-equal ways in: search the canon, or jump straight to Explore. */}
          <div className="mt-8 flex flex-col sm:flex-row sm:items-stretch gap-3">
            <GlobalSearch variant="hero" />
            <span className="self-center text-sm font-bold uppercase tracking-widest text-gray-400">or</span>
            <Link
              to="/explore"
              className="flex items-center justify-center gap-2 border-2 border-black bg-black px-8 py-4 text-lg font-black uppercase tracking-wide text-white hover:bg-white hover:text-black transition-colors whitespace-nowrap"
            >
              Explore the polls
              <span aria-hidden="true">→</span>
            </Link>
          </div>

        </div>
      </section>

      {/* POLL SHELVES. At 4xl the column widens past the page cap so every
          shelf fits in one row (see tailwind.config.js). */}
      <div className="max-w-7xl 3xl:max-w-wide 4xl:max-w-[2040px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!films ? (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-black font-medium">Loading the canon…</p>
          </div>
        ) : (
          shelves.map(shelf => <PollShelf key={shelf.year} shelf={shelf} />)
        )}
      </div>

      {/* VISUALIZATION GATEWAY — full build only; the public cut has nowhere for these to go. */}
      {!PUBLIC_MODE && (
      <section className="border-t-2 border-black bg-white">
        <div className="max-w-7xl 3xl:max-w-wide mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-3xl font-black text-black uppercase tracking-tight mb-6">Dig deeper</h2>
          {/* All five across at lg — a 4-column grid left the fifth card alone
              on a second row looking like an afterthought. */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {VIZ_CARDS.map(card => (
              <Link
                key={card.to}
                to={card.to}
                className="group border-2 border-black bg-white p-6 hover:bg-black hover:text-white transition-colors"
              >
                <div className="text-xl font-black uppercase tracking-tight">{card.title}</div>
                <p className="mt-2 text-sm text-gray-600 group-hover:text-gray-300">{card.blurb}</p>
                <div className="mt-4 text-xs font-bold uppercase tracking-wide">Open →</div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      )}

      <Footer />
    </div>
  )
}

function PollShelf({ shelf }) {
  const { year, films } = shelf
  const scrollRef = useRef(null)
  const scrollBy = (dir) => scrollRef.current?.scrollBy({ left: dir * 640, behavior: 'smooth' })

  if (!films.length) return null

  return (
    <section className="mb-12">
      <div className="flex items-end justify-between gap-4 mb-3 border-b-2 border-black pb-2">
        <div className="min-w-0">
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-black text-black tabular-nums leading-none">{year}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => scrollBy(-1)}
            aria-label={`Scroll ${year} left`}
            className="hidden sm:flex 4xl:hidden w-8 h-8 items-center justify-center border-2 border-black bg-white hover:bg-black hover:text-white font-black transition-colors"
          >
            ‹
          </button>
          <button
            onClick={() => scrollBy(1)}
            aria-label={`Scroll ${year} right`}
            className="hidden sm:flex 4xl:hidden w-8 h-8 items-center justify-center border-2 border-black bg-white hover:bg-black hover:text-white font-black transition-colors"
          >
            ›
          </button>
          <Link
            to={`/explore?poll=${year}`}
            className="px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-wide hover:bg-gray-800 transition-colors whitespace-nowrap"
          >
            Explore {year} →
          </Link>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 snap-x 4xl:overflow-visible 4xl:justify-center"
        style={{ scrollbarWidth: 'thin' }}
      >
        {films.map(film => <PosterCard key={film.key} film={film} />)}
        <ExploreCap year={year} />
      </div>
    </section>
  )
}

function PosterCard({ film }) {
  const poster = posterUrl(film, 'w342')
  // Poster gap → fall back to a blurred backdrop fill, then a title card.
  const backdrop = poster ? null : landscapeImage(film, { mubiWidth: 320, tmdbBackdropSize: 'w300' }).url

  return (
    <Link to={filmUrl(film.key)} className="group flex-shrink-0 w-[140px] snap-start">
      <div className="relative aspect-[2/3] bg-black border-2 border-black overflow-hidden">
        {poster ? (
          <img src={poster} alt={film.FilmTitle} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
        ) : backdrop ? (
          <>
            <img src={backdrop} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover scale-125 blur-md opacity-60" />
            <div className="absolute inset-0 flex items-center justify-center px-2 text-center text-white text-xs font-bold leading-tight">
              {film.FilmTitle}
            </div>
          </>
        ) : (
          /* No image at all: the site's hatch, so the gap reads as a surface
             rather than a load that failed. */
          <div className="absolute inset-0 surface-hatch flex items-center justify-center px-2 text-center text-black text-xs font-bold uppercase tracking-wide">
            {film.FilmTitle}
          </div>
        )}
        <span className="absolute top-0 left-0 bg-black text-white text-xs font-black px-1.5 py-0.5">
          #{film._rank}
        </span>
      </div>
      <div className="mt-1.5 text-xs font-bold text-black leading-tight line-clamp-2">{film.FilmTitle}</div>
      <div className="text-[11px] text-gray-500 truncate">{film.Year} · {film.directors?.[0]}</div>
    </Link>
  )
}

function ExploreCap({ year }) {
  return (
    <Link
      to={`/explore?poll=${year}`}
      className="group flex-shrink-0 w-[140px] snap-start"
    >
      <div className="aspect-[2/3] border-2 border-black bg-white flex flex-col items-center justify-center text-center px-3 hover:bg-black hover:text-white transition-colors">
        <div className="text-3xl font-black leading-none mb-2">→</div>
        <div className="text-xs font-bold uppercase tracking-wide">Explore the<br />{year} poll</div>
      </div>
    </Link>
  )
}
