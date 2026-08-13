const LABELS = { films: 'Films', votes: 'Votes' }

/**
 * Films / Votes, governing every visualization on the page at once.
 *
 * `order` puts the page's default first: Countries leads with films (era-neutral
 * and intuitive), Directors with votes (films barely rank directors at all — two
 * thirds of them place exactly one). The control itself carries no explanation;
 * the effect is visible the moment it's pressed.
 */
export default function MetricToggle({ value, onChange, order = ['films', 'votes'] }) {
  return (
    <div className="grid grid-cols-2 gap-2 bg-white border-2 border-black p-1">
      {order.map(metric => (
        <button
          key={metric}
          type="button"
          onClick={() => onChange(metric)}
          aria-pressed={value === metric}
          className={`py-3 px-3 text-xs font-bold uppercase tracking-wide transition-all ${
            value === metric
              ? 'bg-black text-white border-2 border-black'
              : 'bg-white text-black border-2 border-gray-300 hover:border-black'
          }`}
        >
          {LABELS[metric]}
        </button>
      ))}
    </div>
  )
}
