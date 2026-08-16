import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import GridTile, { withCurrent } from '../search/GridTile'
import { pollKeyOf, pollEntryOf } from '../../lib/rankDepth'
import { exploreUrl } from '../../lib/exploreUrl'
import { countryUrl } from '../../lib/routes'
import EntityTitleLink from '../layout/EntityTitleLink'

// Cap posters shown in the panel; the rest live on the Explore page.
const PANEL_FILM_CAP = 30

/**
 * The expanded country panel: a dimming overlay plus a centred card of poster tiles.
 * Absolutely positioned, so the caller must render it inside a `relative` container
 * sized to the visualization it covers (and give that container a min-height while
 * open, so a short chart doesn't clip the panel).
 *
 * Shared by the bar chart and the decade heatmap so opening a country from either
 * gives exactly the same panel.
 *
 * `subtitle` / `yearRange` carry a narrower scope than the whole country — the
 * heatmap uses them when you open a specific decade's cell, so the panel, its
 * counts and its Explore link all describe that decade.
 */
export default function CountryPanel({
  name,
  films,
  metric = 'films',
  selectedPoll,
  topTarget = null,
  filmsRank,
  votesRank,
  totalCountries,
  subtitle = null,
  yearRange = null,
  onClose,
  panelRef,
}) {
  const filmCount = films.length
  // Summed from the list rather than passed in, so the header can never disagree
  // with the posters below it — including when the list is scoped to one decade.
  const votes = useMemo(() => {
    const pollKey = pollKeyOf(selectedPoll)
    return films.reduce((sum, f) => sum + (pollEntryOf(f, pollKey)?.votes || 0), 0)
  }, [films, selectedPoll])
  const filmLabel = `${filmCount.toLocaleString()} ${filmCount === 1 ? 'film' : 'films'}`
  const voteLabel = `${votes.toLocaleString()} votes`

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-4 pointer-events-none">
      {/* Semi-transparent overlay to dim the visualization behind it */}
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

        {/* Country header — active metric bold, the other as a secondary detail */}
        <div className="px-4 py-3 bg-gray-50 border-b-2 border-gray-300 flex-shrink-0">
          <h4 className="font-black text-lg text-black uppercase tracking-wide">
            {/* Carries the poll and depth through, so the country page opens on
                the same selection the panel is showing. */}
            <EntityTitleLink
              to={countryUrl(name, { poll: selectedPoll, top: topTarget })}
              name={name}
            />
          </h4>
          <div className="flex gap-3 mt-1 items-end">
            <span className="text-base font-black text-black">
              {metric === 'votes' ? voteLabel : filmLabel}
            </span>
            <span className="text-sm text-black font-medium">
              {metric === 'votes' ? filmLabel : voteLabel}
            </span>
            {/* normal-case: a decade's trailing "s" must stay lowercase, and this
                header is uppercase by default. */}
            {subtitle && (
              <span className="text-sm font-bold text-white bg-black px-2 py-0.5 tracking-wide normal-case">
                {subtitle}
              </span>
            )}
          </div>
          {filmsRank != null && (
            <p className="text-xs text-black font-medium mt-1">
              #{filmsRank} of {totalCountries} countries by films
            </p>
          )}
          {votesRank != null && (
            <p className="text-xs text-black font-medium">
              #{votesRank} of {totalCountries} countries by votes
            </p>
          )}
        </div>

        {/* Scrollable poster grid — wraps onto new rows, panel scrolls vertically */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {films.slice(0, PANEL_FILM_CAP).map((film) => (
              <GridTile
                key={film.key}
                film={withCurrent(film, selectedPoll)}
                activePoll={selectedPoll}
                square={false}
                fade={false}
              />
            ))}
          </div>

          {filmCount > 0 && (
            <Link
              to={exploreUrl({ poll: selectedPoll, country: name, top: topTarget, yearRange })}
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
