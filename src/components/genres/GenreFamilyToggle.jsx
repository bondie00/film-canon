/**
 * Genres / Formats — which family of tags a chart draws.
 *
 * The two are never mixed in one ranking: "Short" is not an alternative to
 * "Western", a work is both (see lib/genres.js). So instead of a Continents-style
 * fold, each genre chart offers the other family as a second view. Styled like
 * the Countries chart's view toggle, since it does the same job on that page.
 */
export default function GenreFamilyToggle({ value, onChange }) {
  return (
    <div className="bg-white border-2 border-black p-1 flex-shrink-0 inline-flex">
      {[['content', 'Genres'], ['formats', 'Formats']].map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          aria-pressed={value === key}
          className={`py-2 px-3 text-sm font-bold uppercase tracking-wide transition-all border-2 border-black ${
            value === key ? 'bg-black text-white' : 'bg-white text-black hover:bg-black hover:text-white'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
