import { Link } from 'react-router-dom'

/**
 * The page's name, and above it the trail back to its hub. One component so a
 * country page and a director page open identically.
 *
 * `crumb` is optional — the hub pages themselves have nothing above them.
 */
export default function PageTitle({ children, crumb }) {
  return (
    <>
      {crumb && (
        <div className="text-sm text-black mb-2 uppercase tracking-wide">
          <Link to={crumb.to} className="hover:underline font-bold">{crumb.label}</Link>
          <span> / </span>
          <span className="font-bold">{children}</span>
        </div>
      )}
      <h1 className="text-6xl font-black text-black mb-6 uppercase tracking-tight border-b-4 border-black pb-4">
        {children}
      </h1>
    </>
  )
}
