const POLL_YEARS = ['all', '2022', '2012', '2002', '1992', '1982', '1972', '1962', '1952']

const POLL_LABELS = {
  all: 'All Films',
  2022: '2022',
  2012: '2012',
  2002: '2002',
  1992: '1992',
  1982: '1982',
  1972: '1972',
  1962: '1962',
  1952: '1952',
}

export default function PollSelector({ activePoll, onPollChange, filmCounts }) {
  return (
    <div className="flex flex-wrap gap-2">
      {POLL_YEARS.map(poll => {
        const isActive = activePoll === poll
        const count = filmCounts[poll] || 0

        return (
          <button
            key={poll}
            onClick={() => onPollChange(poll)}
            className={`px-3 py-2 text-xs font-bold uppercase tracking-wide border-2 transition-all ${
              isActive
                ? 'bg-black text-white border-black'
                : 'bg-white text-black border-gray-300 hover:border-black'
            }`}
          >
            {POLL_LABELS[poll]}
            <span className={`ml-1.5 ${isActive ? 'text-gray-300' : 'text-gray-500'}`}>
              ({count.toLocaleString()})
            </span>
          </button>
        )
      })}
    </div>
  )
}
