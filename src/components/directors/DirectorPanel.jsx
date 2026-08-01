import { Link } from 'react-router-dom'
import GridTile, { withCurrent } from '../search/GridTile'

// Cap posters shown in the panel; the rest live on the Explore page.
const PANEL_FILM_CAP = 30

/**
 * The expanded director panel — the director-side twin of CountryPanel, shared by
 * the beeswarm and the ranking chart so opening a director from either gives the
 * same card.
 *
 * Absolutely positioned: the caller must render it inside a `relative` container
 * sized to the visualization it covers.
 */
export default function DirectorPanel({ row, metric = 'votes', selectedPoll, topTarget = null, onClose, panelRef }) {
  const films = row.filmList.map(x => x.film)
  const filmLabel = `${row.films.toLocaleString()} ${row.films === 1 ? 'film' : 'films'}`
  const voteLabel = `${row.votes.toLocaleString()} votes`

  const exploreParams = new URLSearchParams()
  if (selectedPoll) exploreParams.set('poll', selectedPoll)
  exploreParams.append('director', row.name)
  if (topTarget != null) exploreParams.set('top', String(topTarget))

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-4 pointer-events-none">
      <div className="absolute inset-0 bg-black bg-opacity-20 pointer-events-auto" onClick={onClose} />

      <div
        ref={panelRef}
        className="relative w-[calc(100%-32px)] max-h-[calc(28.44rem-32px)] max-w-full bg-white border-4 border-black pointer-events-auto flex flex-col shadow-xl"
      >
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 w-8 h-8 bg-white border-2 border-black text-black font-black text-lg hover:bg-black hover:text-white transition-colors flex items-center justify-center z-10"
          title="Close"
        >
          ×
        </button>

        <div className="px-4 py-3 bg-gray-50 border-b-2 border-gray-300 flex-shrink-0">
          <h4 className="font-black text-lg text-black uppercase tracking-wide">
            <Link
              to={`/director/${encodeURIComponent(row.name)}`}
              className="group inline-flex items-center gap-1.5 hover:underline decoration-2 underline-offset-2"
            >
              <span>{row.name}</span>
              <svg className="w-4 h-4 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M7 17L17 7M17 7H8M17 7v9" />
              </svg>
            </Link>
          </h4>
          <div className="flex gap-3 mt-1 items-end">
            <span className="text-base font-black text-black">
              {metric === 'films' ? filmLabel : voteLabel}
            </span>
            <span className="text-sm text-black font-medium">
              {metric === 'films' ? voteLabel : filmLabel}
            </span>
          </div>
          <p className="text-xs text-black font-medium mt-1">
            #{row.votesRank} of {row.totalDirectors.toLocaleString()} directors by votes
          </p>
          {/* Reported second and never as the headline: two thirds of directors
              place a single film, so this ranking is mostly ties. */}
          <p className="text-xs text-black font-medium">
            #{row.filmsRank} of {row.totalDirectors.toLocaleString()} directors by films
          </p>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {films.slice(0, PANEL_FILM_CAP).map(film => (
              <GridTile
                key={film.key}
                film={withCurrent(film, selectedPoll)}
                activePoll={selectedPoll}
                square={false}
                fade={false}
              />
            ))}
          </div>

          <Link
            to={`/explore?${exploreParams.toString()}`}
            className="mt-3 block w-full text-center px-4 py-2 bg-black text-white border-2 border-black font-bold text-sm uppercase tracking-wide hover:bg-gray-900 transition-colors"
          >
            {row.films > PANEL_FILM_CAP
              ? `View all ${row.films.toLocaleString()} films in Explore →`
              : 'Open in Explore →'}
          </Link>
        </div>
      </div>
    </div>
  )
}
