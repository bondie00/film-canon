import { Link } from 'react-router-dom'
import GridTile, { withCurrent } from '../search/GridTile'
import { exploreUrl } from '../../lib/exploreUrl'

// Cap posters shown in the panel; the rest live on the Explore page.
const PANEL_FILM_CAP = 30

/**
 * The expanded genre panel — the genre-side twin of CountryPanel and
 * DirectorPanel, shared by the ranked bar chart and the decade heatmap so
 * opening a genre from either gives the same card.
 *
 * The title is plain text: there is no /genres/:genre page (yet), so the way
 * out is the Explore link at the bottom, which carries the genre as a filter.
 *
 * Absolutely positioned: the caller must render it inside a `relative`
 * container sized to the visualization it covers.
 */
export default function GenrePanel({
  row, films, metric = 'votes', selectedPoll, topTarget = null,
  subtitle = null, yearRange = null, onClose, panelRef,
}) {
  const filmCount = films.length
  const votes = films.reduce((sum, f) => sum + (f.currentVotes || 0), 0)
  const filmLabel = `${filmCount.toLocaleString()} ${filmCount === 1 ? 'film' : 'films'}`
  const voteLabel = `${votes.toLocaleString()} votes`
  const family = row.isFormat ? 'formats' : 'genres'

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
          <h4 className="font-black text-lg text-black uppercase tracking-wide">{row.name}</h4>
          <div className="flex gap-3 mt-1 items-end">
            <span className="text-base font-black text-black">
              {metric === 'films' ? filmLabel : voteLabel}
            </span>
            <span className="text-sm text-black font-medium">
              {metric === 'films' ? voteLabel : filmLabel}
            </span>
            {subtitle && (
              <span className="text-sm font-bold text-white bg-black px-2 py-0.5 tracking-wide normal-case">
                {subtitle}
              </span>
            )}
          </div>
          {/* Standing is among the whole genre, whatever slice the panel shows. */}
          {row.votesRank != null && (
            <p className="text-xs text-black font-medium mt-1">
              #{row.votesRank} of {row.totalGenres} {family} by votes
            </p>
          )}
          {row.filmsRank != null && (
            <p className="text-xs text-black font-medium">
              #{row.filmsRank} of {row.totalGenres} {family} by films
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {films.slice(0, PANEL_FILM_CAP).map(film => (
              <GridTile
                key={film.key}
                film={film}
                activePoll={selectedPoll}
                square={false}
                fade={false}
              />
            ))}
          </div>

          {filmCount > 0 && (
            <Link
              to={exploreUrl({ poll: selectedPoll, genre: row.name, top: topTarget, yearRange })}
              className="mt-3 block w-full text-center px-4 py-2 bg-black text-white border-2 border-black font-bold text-sm uppercase tracking-wide hover:bg-gray-900 transition-colors"
            >
              {filmCount > PANEL_FILM_CAP
                ? `View all ${filmCount.toLocaleString()} films in Explore →`
                : 'Open in Explore →'}
            </Link>
          )}

          {filmCount === 0 && (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              No films found for current filters
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** The panel's film list: full film objects carrying the active poll's figures. */
export function panelFilms(row, selectedPoll, decade = null) {
  return row.filmList
    .filter(x => decade == null || decadeOfYear(x.film.Year) === decade)
    .map(x => withCurrent(x.film, selectedPoll))
}

export const decadeOfYear = (y) => {
  const n = parseInt(String(y ?? '').split(/[-–]/)[0], 10)
  return isNaN(n) ? null : String(Math.floor(n / 10) * 10)
}
