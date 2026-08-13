/**
 * The one-line summary under every page title: what's on screen, and under what
 * filters. Deliberately a single strip of text rather than a stat grid — the
 * numbers are context for the visualizations below, not the subject.
 *
 *   lead      the headline count, bold and uppercase
 *   aside     the inactive metric, greyed, in parentheses
 *   items     pipe-separated facts after it; a string, or { text, title }
 *   chip      an optional coloured tag before the lead (a continent, say)
 *   accent    an optional colour for the thicker left border
 */
export default function InfoBanner({ lead, aside, items = [], chip = null, accent = null }) {
  const facts = items.filter(Boolean).map(item => (typeof item === 'string' ? { text: item } : item))

  return (
    <div
      className="bg-white border-2 border-black px-4 py-3 mb-8"
      style={accent ? { borderLeftWidth: '4px', borderLeftColor: accent } : undefined}
    >
      <div className="text-sm text-black">
        {chip && (
          <span
            className="inline-block px-2 py-1 text-white text-xs font-bold uppercase tracking-wide mr-3"
            style={{ backgroundColor: chip.color }}
          >
            {chip.label}
          </span>
        )}
        <span className="font-bold uppercase tracking-wide">{lead}</span>
        {aside && <span className="text-gray-500 font-medium normal-case ml-2">({aside})</span>}
        {facts.map(fact => (
          <span key={fact.text}>
            <span className="mx-2 text-black">|</span>
            <span className="font-medium" title={fact.title}>{fact.text}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
