export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12 mt-16">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-white font-bold mb-4">
              Sight & Sound Canon Explorer
            </h3>
            <p className="text-sm">
              A comprehensive visualization and database of every film voted for in
              the Sight & Sound Greatest Films polls (1952-2022).
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white">Visualizations</a></li>
              <li><a href="#" className="hover:text-white">Database</a></li>
              <li><a href="#" className="hover:text-white">Methodology</a></li>
              <li><a href="#" className="hover:text-white">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Data Source</h4>
            <p className="text-sm mb-2">
              All data from the official Sight & Sound Greatest Films polls.
            </p>
            <a
              href="https://www.bfi.org.uk/sight-and-sound"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              Learn more about Sight & Sound →
            </a>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
          <p>© 2025 Sight & Sound Canon Explorer. Data © British Film Institute.</p>
        </div>
      </div>
    </footer>
  )
}
