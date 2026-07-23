import { useState, useEffect, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import GlobalSearch from '../components/search/GlobalSearch'
import { loadFilms } from '../utils/filmsData'
import { posterUrl, landscapeImage } from '../utils/filmImages'

const POLL_YEARS = [2022, 2012, 2002, 1992, 1982, 1972, 1962, 1952]
const SHELF_MAX = 12 // top ~10, a little slack for ties at rank 10

const VIZ_CARDS = [
  { to: '/countries', title: 'Countries', blurb: 'Where the canon comes from — a world map of 117 countries.' },
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

  // Top ~10 films for each poll, in rank order, plus that poll's #1 for the header.
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
      return { year, films: ranked, topFilm: ranked[0] || null }
    })
  }, [films])

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* HERO */}
      <section className="border-b-2 border-black bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <h1 className="text-5xl md:text-7xl font-black text-black uppercase tracking-tight leading-[0.95]">
            Every film<br />the critics chose.
          </h1>
          <p className="mt-5 text-lg text-gray-600 max-w-2xl">
            Seventy years of Sight &amp; Sound's Greatest Films poll — all{' '}
            <span className="font-bold text-black">{films ? films.length.toLocaleString() : '4,800+'}</span>{' '}
            films that ever received a vote, from 1952 to 2022. Search them, map them, watch the canon change.
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

          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <Stat value={films ? films.length.toLocaleString() : '—'} label="Films" />
            <Stat value="8" label="Polls" />
            <Stat value="1952–2022" label="Seven decades" />
            <Stat value="117" label="Countries" />
          </div>
        </div>
      </section>

      {/* POLL SHELVES */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-black text-black uppercase tracking-tight">The canon, poll by poll</h2>
          <p className="text-gray-600 mt-1">The top ten of every poll. Click a film for its full history, or open a poll to see every ranked film.</p>
        </div>

        {!films ? (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-black font-medium">Loading the canon…</p>
          </div>
        ) : (
          shelves.map(shelf => <PollShelf key={shelf.year} shelf={shelf} />)
        )}
      </div>

      {/* VISUALIZATION GATEWAY */}
      <section className="border-t-2 border-black bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-3xl font-black text-black uppercase tracking-tight mb-6">Dig deeper</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      <Footer />
    </div>
  )
}

function Stat({ value, label }) {
  return (
    <div>
      <div className="text-2xl font-black text-black tabular-nums leading-none">{value}</div>
      <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mt-1">{label}</div>
    </div>
  )
}

function PollShelf({ shelf }) {
  const { year, films, topFilm } = shelf
  const scrollRef = useRef(null)
  const scrollBy = (dir) => scrollRef.current?.scrollBy({ left: dir * 640, behavior: 'smooth' })

  if (!films.length) return null

  return (
    <section className="mb-12">
      <div className="flex items-end justify-between gap-4 mb-3 border-b-2 border-black pb-2">
        <div className="min-w-0">
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-black text-black tabular-nums leading-none">{year}</span>
            {topFilm && (
              <span className="text-sm text-gray-500 truncate">
                Topped by <span className="font-bold text-black">{topFilm.FilmTitle}</span>
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => scrollBy(-1)}
            aria-label={`Scroll ${year} left`}
            className="hidden sm:flex w-8 h-8 items-center justify-center border-2 border-black bg-white hover:bg-black hover:text-white font-black transition-colors"
          >
            ‹
          </button>
          <button
            onClick={() => scrollBy(1)}
            aria-label={`Scroll ${year} right`}
            className="hidden sm:flex w-8 h-8 items-center justify-center border-2 border-black bg-white hover:bg-black hover:text-white font-black transition-colors"
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
        className="flex gap-3 overflow-x-auto pb-2 snap-x"
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
    <Link to={`/film/${film.key}`} className="group flex-shrink-0 w-[140px] snap-start">
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
          <div className="absolute inset-0 flex items-center justify-center px-2 text-center text-white/80 text-xs font-bold uppercase tracking-wide">
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
