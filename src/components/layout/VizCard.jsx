/**
 * A visualization in its frame: heavy black box, a ruled heading, then the chart.
 *
 * The heading is the only text the card carries. Explanatory subtitles were
 * removed deliberately — the charts label their own axes, and a paragraph above
 * every one of them turned the page into reading rather than looking. Anything a
 * reader genuinely needs mid-chart belongs in a tooltip.
 *
 * `controls` are the chart's own filters (quick-select buttons and the like) and
 * sit inside the ruled heading block, so they read as part of the chart's frame.
 */
export default function VizCard({ title, controls = null, level = 2, children }) {
  const Heading = `h${level}`

  return (
    <div className="bg-white border-4 border-black p-6 mb-8">
      <div className="mb-4 border-b-2 border-gray-300 pb-3">
        <Heading className={`text-3xl font-black text-black uppercase tracking-wide ${controls ? 'mb-4' : ''}`}>
          {title}
        </Heading>
        {controls}
      </div>
      {children}
    </div>
  )
}
