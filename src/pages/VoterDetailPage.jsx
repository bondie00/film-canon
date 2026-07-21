import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'

/**
 * One critic's ballots, poll by poll.
 *
 * Names are matched across polls upstream, in build_voter_ballots.py — variants
 * that could be corrected were fixed in the workbook, and the handful that
 * legitimately differ (a name change, a joint ballot) live in
 * data/voter_identities.json. Nothing is fuzzy-matched at runtime: a wrong merge
 * would attribute someone else's ballot to a real person.
 */
export default function VoterDetailPage() {
  const { slug } = useParams()
  const [voters, setVoters] = useState(null)
  const [error, setError] = useState(false)

  // Ballots carry their own title/year/director, so this page never loads
  // films.json.
  useEffect(() => {
    let alive = true
    fetch('/data/voters.json')
      .then(r => r.json())
      .then(v => { if (alive) setVoters(v) })
      .catch(() => { if (alive) setError(true) })
    return () => { alive = false }
  }, [])

  const voter = voters ? voters[slug] : null

  if (error) {
    return <Shell><Message title="Couldn't load the ballots" body="Please try again." /></Shell>
  }

  if (!voters) {
    return (
      <Shell>
        <div className="text-center py-20">
          <div className="inline-block w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-black font-medium">Loading…</p>
        </div>
      </Shell>
    )
  }

  if (!voter) {
    return (
      <Shell>
        <Message
          title="Voter not found"
          body="No ballots in the record match this address."
        />
      </Shell>
    )
  }

  // Most recent poll first — what they think now, before what they thought then.
  const ballots = [...voter.ballots].sort((a, b) => b.poll - a.poll)
  const span = voter.polls.length > 1
    ? `${Math.min(...voter.polls)}–${Math.max(...voter.polls)}`
    : String(voter.polls[0])

  return (
    <Shell>
      <div className="pt-2 pb-8">
        <Link
          to="/explore?poll=all"
          className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-black"
        >
          ← Explore
        </Link>
        <h1 className="mt-3 text-4xl sm:text-5xl font-black text-black uppercase tracking-tight leading-none">
          {voter.name}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-lg text-gray-600">
          <span className="font-bold text-black">
            {ballots.length} {ballots.length === 1 ? 'ballot' : 'ballots'}
          </span>
          <span className="text-gray-300">·</span>
          <span className="tabular-nums">{span}</span>
          {voter.countries.length > 0 && (
            <>
              <span className="text-gray-300">·</span>
              <span>{voter.countries.join(' / ')}</span>
            </>
          )}
        </div>
      </div>

      {ballots.map(ballot => (
        <section key={ballot.poll} className="mb-10">
          <div className="mb-3 border-b-2 border-black pb-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="text-xl font-black uppercase tracking-tight">
              {ballot.poll} poll
            </h2>
            <span className="text-xs text-gray-500">
              {ballot.films.length} {ballot.films.length === 1 ? 'film' : 'films'}
              {ballot.jointWith?.length > 0 && (
                <>
                  {' · submitted jointly with '}
                  {ballot.jointWith.map((n, i) => (
                    <span key={n}>
                      {i > 0 && ', '}
                      <Link
                        to={`/voter/${slugify(n)}`}
                        className="font-bold text-black underline decoration-gray-300 hover:decoration-black"
                      >
                        {n}
                      </Link>
                    </span>
                  ))}
                </>
              )}
            </span>
          </div>

          <ol className="border-2 border-black bg-white divide-y divide-gray-200">
            {ballot.films.map(pick => (
              <li key={pick.key}>
                <Link
                  to={`/film/${pick.key}`}
                  className="block px-4 py-2.5 hover:bg-gray-50 transition-colors"
                >
                  <span className="font-bold text-black">{pick.title}</span>
                  <span className="text-gray-600">
                    {' '}
                    ({[pick.director, pick.year].filter(Boolean).join(', ')})
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </Shell>
  )
}

/** Mirrors norm_name + slugify in build_voter_ballots.py, for jointWith links. */
function slugify(name) {
  return name
    .normalize('NFKD')
    .replace(/ł/g, 'l')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z ]+/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</div>
      <Footer />
    </div>
  )
}

function Message({ title, body }) {
  return (
    <div className="py-20 text-center">
      <h1 className="text-3xl font-black uppercase mb-3">{title}</h1>
      <p className="text-gray-600 mb-6">{body}</p>
      <Link
        to="/explore?poll=all"
        className="inline-block px-6 py-3 bg-black text-white font-bold uppercase tracking-wide text-sm hover:bg-gray-800"
      >
        ← Back to Explore
      </Link>
    </div>
  )
}
