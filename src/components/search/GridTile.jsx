import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { landscapeImage } from '../../utils/filmImages'

const POLL_YEARS = [1952, 1962, 1972, 1982, 1992, 2002, 2012, 2022]

/**
 * Attach the active poll's rank/votes to a film for tile rendering.
 * For 'all', we show a votes badge (an aggregate rank like #2373 is meaningless
 * on a poster).
 */
export function withCurrent(film, poll) {
  const key = poll === 'all' ? 'all' : parseInt(poll, 10)
  const p = film.pollHistory.find(x => x.year === key) || { rank: null, votes: 0 }
  return { ...film, currentRank: poll === 'all' ? null : (p.rank ?? null), currentVotes: p.votes }
}

/** Rank across all eight polls (1952 → 2022); the active poll is highlighted. */
function PollRankStrip({ film, activePoll }) {
  return (
    <div className="flex border-b-2 border-black divide-x divide-gray-200 flex-shrink-0">
      {POLL_YEARS.map(year => {
        const poll = film.pollHistory.find(p => p.year === year)
        const appeared = poll && poll.votes > 0
        const isActive = String(year) === String(activePoll)
        const tip = appeared
          ? `${year}: rank #${poll.rank} · ${poll.votes} ${poll.votes === 1 ? 'vote' : 'votes'}`
          : `${year}: no votes`
        return (
          <div
            key={year}
            title={tip}
            className={`flex-1 py-1 text-center text-[9px] leading-none font-bold tabular-nums tracking-tighter ${
              isActive
                ? 'bg-black text-white'
                : appeared
                  ? 'bg-white text-black'
                  : 'bg-gray-50 text-gray-300'
            }`}
          >
            {appeared ? poll.rank : '·'}
          </div>
        )
      })}
    </div>
  )
}

/**
 * The square poster tile used by the /explore gallery and the director page.
 * `film` must already carry currentRank/currentVotes (see withCurrent).
 * square (default true) locks the tile to a 1:1 box for uniform galleries; pass
 * square={false} in tight grids (e.g. the country popovers) so the tile grows to
 * fit its title instead of clipping the second line.
 *
 * fade (default true) fades the tile in on mount. Pass fade={false} wherever the
 * container already animates the whole grid as a unit (Explore's poll change) or
 * remounts tiles constantly (the country panels, on every filter change) — there
 * the per-tile fade either speckles or just delays each tile for no reason.
 */
export default function GridTile({ film, activePoll, square = true, fade = true }) {
  // Tiles display at ~300px wide, so request the small MUBI still (w320) and a
  // small TMDB backdrop — far cheaper to composite while all tiles reflow at once.
  const img = landscapeImage(film, { mubiWidth: 320, tmdbBackdropSize: 'w300', posterSize: 'w342' })

  return (
    <motion.div
      initial={fade ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`bg-white border-2 border-black flex flex-col overflow-hidden hover:shadow-lg transition-shadow ${square ? 'aspect-square' : ''}`}
    >
      <Link to={`/film/${film.key}`} className="flex flex-col h-full min-h-0">
        {/* 16:9 image band — uncropped backdrop (poster fallback is blurred-cover so it fills without distortion) */}
        <div className="relative w-full aspect-video bg-black flex-shrink-0 overflow-hidden">
          {img.url ? (
            img.kind === 'backdrop' ? (
              <img
                src={img.url}
                alt={film.FilmTitle}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <>
                <img src={img.url} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover scale-110 blur-lg opacity-60" />
                <img src={img.url} alt={film.FilmTitle} loading="lazy" className="absolute inset-0 w-full h-full object-contain" />
              </>
            )
          ) : (
            <div className="absolute inset-0 flex items-center justify-center px-2 text-center text-white/70 text-xs font-bold uppercase tracking-wide">
              {film.FilmTitle}
            </div>
          )}
          {/* Rank badge (or votes when there's no meaningful rank — unranked films, or the all-polls aggregate) */}
          <span className="absolute top-0 left-0 bg-black text-white text-sm font-black px-2 py-1">
            {film.currentRank != null
              ? `#${film.currentRank}`
              : `${film.currentVotes} ${film.currentVotes === 1 ? 'vote' : 'votes'}`}
          </span>
        </div>

        <PollRankStrip film={film} activePoll={activePoll} />

        {/* Metadata fills the remainder of the tile, stacked tightly from the top */}
        <div className="flex flex-col flex-1 min-h-0 p-2.5">
          <div className="font-bold text-sm leading-tight line-clamp-2">{film.FilmTitle}</div>
          <div className="text-xs text-gray-600 truncate mt-0.5">
            {film.Year} · {film.directors[0]}
          </div>
          {(film.countries?.[0] || film.Country) && (
            <div className="text-xs text-gray-600 truncate">
              {film.countries?.[0] || film.Country}
            </div>
          )}
          <div className="mt-1 text-xs font-bold text-gray-500">
            {film.currentVotes} {film.currentVotes === 1 ? 'vote' : 'votes'}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
