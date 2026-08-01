import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import RankDepthFilter from '../components/RankDepthFilter'
import DirectorPodium from '../components/directors/DirectorPodium'
import DirectorRankedList from '../components/directors/DirectorRankedList'
import useDirectorAggregates from '../hooks/useDirectorAggregates'
import { buildRankIndex, resolveTarget, describeDepth, EMPTY_RANK_INDEX } from '../lib/rankDepth'

const VALID_POLLS = ['all', '1952', '1962', '1972', '1982', '1992', '2002', '2012', '2022']

// The podium takes every director inside this rank, ties included; the list picks
// up after it.
const PODIUM_RANKS = 10

export default function DirectorsMain() {
  // Poll and rank depth live in the URL under the same names and with the same
  // meanings as /explore and /countries, so links between the pages carry the
  // filters intact.
  const [searchParams, setSearchParams] = useSearchParams()
  const rawPoll = searchParams.get('poll')
  const selectedPoll = VALID_POLLS.includes(rawPoll) ? rawPoll : '2022'
  const rawTop = searchParams.get('top')
  const topTarget = rawTop && /^\d+$/.test(rawTop) ? parseInt(rawTop, 10) : null

  const setParam = useCallback((key, value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (value == null) next.delete(key)
      else next.set(key, String(value))
      return next
    }, { replace: true })
  }, [setSearchParams])

  const setSelectedPoll = useCallback(poll => setParam('poll', poll), [setParam])
  const setTopTarget = useCallback(target => setParam('top', target), [setParam])

  // Votes is the default here, inverting the Countries page.
  //
  // Films is the era-neutral choice for countries, but it barely ranks directors:
  // two thirds of them place exactly one film in any given poll, and at tight
  // depths it's worse — every one of the eleven directors inside 2022's top ten
  // has exactly one film there. Across the whole 2022 poll there are 21 distinct
  // film counts against 106 distinct vote totals. Ranking by films would print
  // most of the chart as a wall of ties. directorStandings.js reached the same
  // conclusion for the standing chart on the director pages.
  const [metric, setMetric] = useState('votes')
  const [filmsData, setFilmsData] = useState(null)

  useEffect(() => {
    fetch('/data/films.json')
      .then(r => r.json())
      .then(setFilmsData)
      .catch(error => console.error('Error loading data:', error))
  }, [])

  const rankIndex = useMemo(
    () => (filmsData ? buildRankIndex(filmsData, selectedPoll) : EMPTY_RANK_INDEX),
    [filmsData, selectedPoll]
  )
  const { cutoffRank, filmCount: depthFilmCount, minVotes: depthMinVotes } = useMemo(
    () => resolveTarget(rankIndex, topTarget),
    [rankIndex, topTarget]
  )

  const aggregates = useDirectorAggregates(filmsData, selectedPoll, cutoffRank)

  const filterText = `${selectedPoll === 'all' ? 'All Polls Combined' : `${selectedPoll} Poll`} • ${describeDepth(topTarget, depthFilmCount, depthMinVotes)}`

  // The long tail, as a headline figure: how much of the field is one film deep.
  const soloShare = useMemo(() => {
    if (!aggregates?.rows.length) return null
    return aggregates.rows.filter(r => r.films === 1).length / aggregates.rows.length
  }, [aggregates])

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-12 gap-8">

          {/* LEFT SIDEBAR — same filters, same URL params, as the Countries page */}
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-white border-4 border-black p-6 lg:sticky lg:top-8">
              <h2 className="text-3xl font-bold text-black mb-6 uppercase tracking-wider">Filters</h2>

              <div className="mb-6 pb-6 border-b-2 border-gray-300">
                <label className="block text-sm font-semibold text-black mb-3 uppercase tracking-wide">
                  Poll Selection
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {['all', 1952, 1962, 1972, 1982, 1992, 2002, 2012, 2022].map(opt => {
                    const value = String(opt)
                    const active = value === String(selectedPoll)
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setSelectedPoll(value)}
                        className={`py-2 text-sm font-black border-2 transition-colors ${
                          active
                            ? 'border-black bg-black text-white'
                            : 'border-black bg-white text-black hover:bg-black hover:text-white'
                        }`}
                      >
                        {opt === 'all' ? 'All' : opt}
                      </button>
                    )
                  })}
                </div>
              </div>

              <RankDepthFilter index={rankIndex} target={topTarget} onChange={setTopTarget} />

              <div className="mt-6 pt-6 border-t-2 border-gray-300">
                <label className="block text-sm font-semibold text-black mb-3 uppercase tracking-wide">
                  Metric
                </label>
                <div className="grid grid-cols-2 gap-2 bg-white border-2 border-black p-1">
                  {[['votes', 'Votes'], ['films', 'Films']].map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setMetric(value)}
                      className={`py-3 px-3 text-xs font-bold uppercase tracking-wide transition-all ${
                        metric === value
                          ? 'bg-black text-white border-2 border-black'
                          : 'bg-white text-black border-2 border-gray-300 hover:border-black'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs text-gray-500 leading-snug">
                  {metric === 'votes'
                    ? 'Votes rank directors; films mostly ties them. Read votes within a single poll — the electorate grew about 35× between 1952 and 2022.'
                    : 'Two thirds of directors have exactly one film in the canon, so this ranking is largely ties. Useful for breadth, not for standing.'}
                </p>
              </div>
            </div>
          </div>

          {/* MAIN CONTENT */}
          <div className="col-span-12 lg:col-span-9">
            <h1 className="text-6xl font-black text-black mb-6 uppercase tracking-tight border-b-4 border-black pb-4">
              Directors
            </h1>

            <div className="bg-white border-2 border-black px-4 py-3 mb-8">
              <div className="text-sm text-black">
                <span className="font-bold uppercase tracking-wide">
                  {(aggregates?.totals.directors ?? 0).toLocaleString()} directors •{' '}
                  {metric === 'votes'
                    ? `${(aggregates?.totals.votes ?? 0).toLocaleString()} votes`
                    : `${(aggregates?.totals.films ?? 0).toLocaleString()} films`}
                </span>
                <span className="text-gray-500 font-medium ml-2">
                  ({metric === 'votes'
                    ? `${(aggregates?.totals.films ?? 0).toLocaleString()} films`
                    : `${(aggregates?.totals.votes ?? 0).toLocaleString()} votes`})
                </span>
                <span className="mx-2 text-black">|</span>
                <span className="font-medium">{filterText}</span>
                {soloShare != null && (
                  <>
                    <span className="mx-2 text-black">|</span>
                    <span className="font-medium">
                      {Math.round(soloShare * 100)}% with one film
                    </span>
                  </>
                )}
              </div>
            </div>

            {!aggregates && (
              <div className="bg-white border-4 border-black p-6 text-center text-black font-medium py-16">
                Loading director data…
              </div>
            )}

            {/* HERO — the leaders, with posters. The page's question is who
                stands highest among directors. */}
            {aggregates && (
              <DirectorPodium
                rows={aggregates.rows}
                metric={metric}
                selectedPoll={selectedPoll}
              />
            )}

            {/* The rest of the ranked field, ending where the ties begin */}
            {aggregates && (
              <DirectorRankedList
                rows={aggregates.rows}
                metric={metric}
                selectedPoll={selectedPoll}
                topTarget={topTarget}
                skipRanks={PODIUM_RANKS}
              />
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
