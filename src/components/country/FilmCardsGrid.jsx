import { useState, useMemo } from 'react'

export default function FilmCardsGrid({ films, selectedPoll, continentColor }) {
  const [sortBy, setSortBy] = useState('votes')
  const [showAll, setShowAll] = useState(false)

  // Sort films based on selected criteria
  const sortedFilms = useMemo(() => {
    const sorted = [...films]

    sorted.sort((a, b) => {
      if (sortBy === 'votes') {
        // Sort by votes in selected poll (or total votes if all polls)
        const getVotes = (film) => {
          if (selectedPoll === 'all') {
            return film.pollHistory.reduce((sum, p) => sum + (p.votes || 0), 0)
          }
          const pollData = film.pollHistory.find(p => p.year.toString() === selectedPoll)
          return pollData?.votes || 0
        }
        return getVotes(b) - getVotes(a)
      } else if (sortBy === 'year') {
        const yearA = parseInt(a.Year) || 0
        const yearB = parseInt(b.Year) || 0
        return yearB - yearA // Most recent first
      } else if (sortBy === 'title') {
        return a.FilmTitle.localeCompare(b.FilmTitle)
      } else if (sortBy === 'rank') {
        // Sort by rank (lower is better)
        const getRank = (film) => {
          if (selectedPoll === 'all') {
            // Get best rank across all polls
            const ranks = film.pollHistory
              .filter(p => p.rank !== null)
              .map(p => p.rank)
            return ranks.length > 0 ? Math.min(...ranks) : 9999
          }
          const pollData = film.pollHistory.find(p => p.year.toString() === selectedPoll)
          return pollData?.rank || 9999
        }
        return getRank(a) - getRank(b)
      }
      return 0
    })

    return sorted
  }, [films, sortBy, selectedPoll])

  // Display limited or all films
  const displayedFilms = showAll ? sortedFilms : sortedFilms.slice(0, 24)

  // Helper to get rank/votes for display
  const getFilmStats = (film) => {
    if (selectedPoll === 'all') {
      const totalVotes = film.pollHistory.reduce((sum, p) => sum + (p.votes || 0), 0)
      const ranks = film.pollHistory.filter(p => p.rank !== null).map(p => p.rank)
      const bestRank = ranks.length > 0 ? Math.min(...ranks) : null
      const pollAppearances = film.pollHistory.filter(p => p.votes > 0).length
      return { votes: totalVotes, rank: bestRank, pollAppearances }
    }

    const pollData = film.pollHistory.find(p => p.year.toString() === selectedPoll)
    return {
      votes: pollData?.votes || 0,
      rank: pollData?.rank || null,
      pollAppearances: null
    }
  }

  if (films.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No films to display
      </div>
    )
  }

  return (
    <div>
      {/* Sort Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b-2 border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold uppercase tracking-wide text-black">Sort by:</span>
          <div className="flex gap-1">
            {[
              { value: 'votes', label: 'Votes' },
              { value: 'rank', label: 'Rank' },
              { value: 'year', label: 'Year' },
              { value: 'title', label: 'Title' },
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setSortBy(option.value)}
                className={`px-3 py-1 text-sm font-bold uppercase tracking-wide transition-all border-2 ${
                  sortBy === option.value
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-gray-300 hover:border-black'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="text-sm text-gray-600 font-medium">
          Showing {displayedFilms.length} of {films.length} films
        </div>
      </div>

      {/* Films Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[800px] overflow-y-auto pr-2">
        {displayedFilms.map((film) => {
          const stats = getFilmStats(film)

          return (
            <div
              key={film.key}
              className="border-2 border-black p-4 bg-white hover:shadow-lg transition-shadow"
            >
              {/* Rank Badge */}
              {stats.rank && stats.rank <= 100 && (
                <div
                  className="inline-block px-2 py-1 text-xs font-black text-white mb-2"
                  style={{ backgroundColor: continentColor }}
                >
                  #{stats.rank}
                </div>
              )}

              {/* Film Title */}
              <h3 className="font-bold text-black text-lg leading-tight mb-1">
                {film.FilmTitle}
              </h3>

              {/* Year */}
              <div className="text-sm text-gray-600 font-medium mb-2">
                {film.Year}
              </div>

              {/* Director(s) */}
              <div className="text-sm text-black mb-3">
                <span className="font-semibold">Director: </span>
                {film.directors.join(', ')}
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <div className="text-sm">
                  <span className="font-bold text-black">{stats.votes}</span>
                  <span className="text-gray-600 ml-1">votes</span>
                </div>

                {stats.rank && (
                  <div className="text-sm">
                    <span className="text-gray-600">Rank: </span>
                    <span className="font-bold text-black">#{stats.rank}</span>
                  </div>
                )}

                {stats.pollAppearances && (
                  <div className="text-xs text-gray-500">
                    {stats.pollAppearances} poll{stats.pollAppearances > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Show More Button */}
      {films.length > 24 && !showAll && (
        <div className="text-center mt-6">
          <button
            onClick={() => setShowAll(true)}
            className="px-6 py-3 bg-black text-white font-bold uppercase tracking-wide hover:bg-gray-800 transition-colors"
          >
            Show All {films.length} Films
          </button>
        </div>
      )}

      {showAll && films.length > 24 && (
        <div className="text-center mt-6">
          <button
            onClick={() => setShowAll(false)}
            className="px-6 py-3 bg-gray-200 text-black font-bold uppercase tracking-wide hover:bg-gray-300 transition-colors"
          >
            Show Less
          </button>
        </div>
      )}
    </div>
  )
}
