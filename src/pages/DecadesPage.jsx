import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import DecadeLineChart from '../components/country/DecadeLineChart'

const POLL_YEARS = ['1952', '1962', '1972', '1982', '1992', '2002', '2012', '2022']
const POLL_OPTIONS = ['all', ...POLL_YEARS]

// Bar-chart accent per poll (matches DecadeLineChart's line colors); 'all' uses the line view.
const POLL_COLORS = {
  '1952': '#94a3b8',
  '1962': '#a1a1aa',
  '1972': '#f97316',
  '1982': '#eab308',
  '1992': '#22c55e',
  '2002': '#06b6d4',
  '2012': '#8b5cf6',
  '2022': '#ec4899',
}

export default function DecadesPage() {
  const [films, setFilms] = useState(null)
  const [loading, setLoading] = useState(true)

  const [searchParams] = useSearchParams()
  const [selectedPoll, setSelectedPoll] = useState(() => {
    const p = searchParams.get('poll')
    return p && POLL_OPTIONS.includes(p) ? p : 'all'
  })

  useEffect(() => {
    fetch('/data/films.json')
      .then(r => r.json())
      .then(data => {
        setFilms(data)
        setLoading(false)
      })
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-6xl font-black text-black mb-2 uppercase tracking-tight">
          Decades &amp; Age
        </h1>
        <p className="text-gray-600 mb-6 max-w-2xl">
          Which eras of filmmaking each poll drew from. Pick a single poll to see its decade breakdown, or “All Polls” to compare how the canon’s center of gravity has shifted over seventy years.
        </p>

        <PollPicker selectedPoll={selectedPoll} onChange={setSelectedPoll} />

        <section className="mt-6 border-2 border-black bg-white p-6">
          <div className="mb-4 border-b-2 border-black pb-2">
            <div className="text-xs font-bold uppercase tracking-widest text-gray-500">
              {selectedPoll === 'all' ? 'All polls · % of each poll’s films' : `${selectedPoll} poll · films by decade`}
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight">Decade Distribution</h2>
          </div>

          {loading ? (
            <div className="h-[25rem] flex items-center justify-center">
              <div className="inline-block w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <DecadeLineChart
              films={films}
              selectedPoll={selectedPoll}
              continentColor={POLL_COLORS[selectedPoll] || '#8b5cf6'}
            />
          )}
        </section>
      </div>
      <Footer />
    </div>
  )
}

function PollPicker({ selectedPoll, onChange }) {
  return (
    <div className="border-2 border-black bg-white p-4">
      <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
        Choose a poll
      </div>
      <div className="grid grid-cols-3 md:grid-cols-9 gap-2">
        {POLL_OPTIONS.map(poll => {
          const active = poll === selectedPoll
          return (
            <button
              key={poll}
              onClick={() => onChange(poll)}
              className={`py-4 font-black border-2 border-black transition-colors ${
                poll === 'all' ? 'text-sm uppercase tracking-wide' : 'text-xl'
              } ${active ? 'bg-black text-white' : 'bg-white text-black hover:bg-black hover:text-white'}`}
            >
              {poll === 'all' ? 'All' : poll}
            </button>
          )
        })}
      </div>
    </div>
  )
}
