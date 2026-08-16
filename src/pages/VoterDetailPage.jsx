import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import DetailHeader, { Figure } from '../components/layout/DetailHeader'
import NotFound, { LoadingState } from '../components/layout/NotFound'
import { EXPLORE, filmUrl, voterUrl } from '../lib/routes'

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
    return (
      <PageShell width="narrow">
        <NotFound title="Couldn't load the ballots" body="Please try again." />
      </PageShell>
    )
  }

  if (!voters) {
    return (
      <PageShell width="narrow">
        <LoadingState />
      </PageShell>
    )
  }

  if (!voter) {
    return (
      <PageShell width="narrow">
        <NotFound
          title="Voter not found"
          body="No ballots in the record match this address."
        />
      </PageShell>
    )
  }

  // Most recent poll first — what they think now, before what they thought then.
  const ballots = [...voter.ballots].sort((a, b) => b.poll - a.poll)
  const span = voter.polls.length > 1
    ? `${Math.min(...voter.polls)}–${Math.max(...voter.polls)}`
    : String(voter.polls[0])

  return (
    <PageShell width="narrow">
      {/* This page had a hand-written copy of DetailHeader's markup — same
          crumb, same h1, same middot-joined facts line — which is how its crumb
          came to read "Explore" where every other page's reads "Back to X".
          Voters have no hub of their own, so Explore is the parent overview. */}
      <DetailHeader
        crumb={{ to: EXPLORE, label: 'Explore' }}
        title={voter.name}
        facts={[
          <Figure key="ballots" value={ballots.length}>
            {ballots.length === 1 ? 'ballot' : 'ballots'}
          </Figure>,
          <span key="span" className="tabular-nums">{span}</span>,
          voter.countries.length > 0 && (
            <span key="countries">{voter.countries.join(' / ')}</span>
          ),
        ]}
      />

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
                        to={voterUrl(slugify(n))}
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
                  to={filmUrl(pick.key)}
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
    </PageShell>
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

