import { Link } from 'react-router-dom'
import { posterUrl } from '../../utils/filmImages'

/**
 * The leaders: one card per director, name first.
 *
 * The poster is a thumbnail, deliberately. It earns its place because a reader
 * who doesn't know the name "Chantal Akerman" recognises the Jeanne Dielman
 * poster on sight — so it's a recognition cue, and it names the film carrying the
 * director's total. But this page ranks DIRECTORS, and a full-bleed poster with
 * the name in a caption under it inverts that: the image is read first and the
 * name second. Sized down beside a large name, it supports rather than competes.
 *
 * Not blurred or dimmed behind overlaid text, which was the other way to demote
 * it. Blur removes exactly the detail that recognition depends on, and posters in
 * this set run from near-black to near-white, so guaranteeing 4.5:1 for overlaid
 * text across all of them needs a scrim heavy enough to erase the image anyway.
 * Both roads end at a muddy rectangle. Keeping the text on white costs nothing.
 *
 * Membership is rank <= 10, not the first ten rows, so a tie at the boundary
 * shows every director in it rather than an arbitrary one. Same rule the home
 * page's "top ten" shelves use, where a tie makes them 11 or 12 films long.
 */
export default function DirectorPodium({ rows, metric = 'votes', selectedPoll }) {
  const rankKey = metric === 'films' ? 'filmsRank' : 'votesRank'
  const valueKey = metric === 'films' ? 'films' : 'votes'

  const leaders = rows
    .filter(r => r[rankKey] <= 10)
    .sort((a, b) => b[valueKey] - a[valueKey] || a.name.localeCompare(b.name))

  if (!leaders.length) return null

  return (
    <div className="bg-white border-4 border-black p-6 mb-8">
      <div className="mb-4 border-b-2 border-gray-300 pb-3">
        <h2 className="text-3xl font-black text-black uppercase tracking-wide">
          The Top {leaders.length > 10 ? `${leaders.length} (tied)` : '10'}
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          By {metric === 'films' ? 'films in the canon' : 'votes'} in{' '}
          {selectedPoll === 'all' ? 'all polls combined' : `the ${selectedPoll} poll`} · fronted by their
          most-voted film
        </p>
      </div>

      {/* Two columns, five deep — a wide card gives the name room to sit at a
          readable size, which five narrow columns never did. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {leaders.map(row => (
          <PodiumCard key={row.name} row={row} rank={row[rankKey]} metric={metric} />
        ))}
      </div>
    </div>
  )
}

function PodiumCard({ row, rank, metric }) {
  const film = row.topFilm
  const poster = film ? posterUrl(film, 'w185') : null

  return (
    <Link
      to={`/director/${encodeURIComponent(row.name)}`}
      className="group flex items-stretch gap-3 border-2 border-black bg-white p-3 hover:shadow-[4px_4px_0_0_#000] transition-shadow"
    >
      {/* Recognition cue, sized to support the name rather than outshout it */}
      <div className="w-14 flex-shrink-0 aspect-[2/3] bg-gray-900 border border-black overflow-hidden">
        {poster ? (
          <img
            src={poster}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-1 text-center">
            <span className="text-white text-[8px] font-bold leading-tight line-clamp-4">
              {film?.FilmTitle}
            </span>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 flex flex-col justify-center">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-black tabular-nums text-gray-400 leading-none">{rank}</span>
          <h3
            className="text-lg font-black uppercase tracking-tight text-black leading-none truncate group-hover:underline decoration-2 underline-offset-4"
            title={row.name}
          >
            {row.name}
          </h3>
        </div>

        <p className="text-sm tabular-nums text-black mt-1.5">
          <span className="font-black">
            {metric === 'films'
              ? `${row.films} ${row.films === 1 ? 'film' : 'films'}`
              : `${row.votes.toLocaleString()} votes`}
          </span>
          <span className="text-gray-500">
            {' · '}
            {metric === 'films'
              ? `${row.votes.toLocaleString()} votes`
              : `${row.films} ${row.films === 1 ? 'film' : 'films'}`}
          </span>
        </p>

        <p className="text-xs text-gray-500 truncate mt-0.5" title={film?.FilmTitle}>
          <span className="italic">{film?.FilmTitle}</span>
          {row.yearFrom != null && (
            <span className="tabular-nums">
              {' · '}
              {row.yearFrom === row.yearTo ? row.yearFrom : `${row.yearFrom}–${row.yearTo}`}
            </span>
          )}
        </p>
      </div>
    </Link>
  )
}
