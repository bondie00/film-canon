import { Link } from 'react-router-dom'
import { EXPLORE } from '../../lib/routes'

/**
 * The "this address matches nothing" state, shared by every detail page.
 *
 * There were four hand-written copies of this — film, director, voter (twice) —
 * identical apart from the sentence in the middle, and they had already drifted
 * on the button's text size.
 *
 * The action here is a BUTTON, not a Crumb, and that is the one place the site
 * shows two ways back. It's deliberate: a crumb is a quiet marker you ignore
 * while you read the page, and on this page there is nothing to read. Nothing
 * else on screen competes with it, so it can be the loud thing.
 *
 * It points at the same parent overview the page's crumb would have, since the
 * page you asked for would have been a member of it — the natural next move
 * after a missing director is the list of directors that exist.
 */
export default function NotFound({ title, body, action }) {
  const { to = EXPLORE, label = 'Back to Explore' } = action || {}
  return (
    <div className="py-20 text-center">
      <h1 className="text-3xl font-black uppercase mb-3">{title}</h1>
      {body && <p className="text-gray-600 mb-6">{body}</p>}
      <Link
        to={to}
        className="inline-block px-6 py-3 bg-black text-white font-bold uppercase tracking-wide text-sm hover:bg-gray-800 transition-colors"
      >
        ← {label}
      </Link>
    </div>
  )
}

/** The spinner every page shows while films.json is in flight. */
export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="text-center py-20">
      <div className="inline-block w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-black font-medium">{label}</p>
    </div>
  )
}
