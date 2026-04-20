import { useState, useRef, useEffect, useMemo } from 'react'

export default function SearchSelect({
  placeholder,
  options,
  selected,
  onChange,
  maxResults = 50,
}) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  // Filter options by query, exclude already-selected
  const filteredOptions = useMemo(() => {
    if (!query.trim()) return []

    const q = query.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')

    return options
      .filter(opt => {
        if (selected.includes(opt)) return false
        const normalized = opt.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        return normalized.includes(q)
      })
      .slice(0, maxResults)
  }, [query, options, selected, maxResults])

  const handleSelect = (value) => {
    onChange([...selected, value])
    setQuery('')
    setIsOpen(false)
  }

  const handleRemove = (value) => {
    onChange(selected.filter(s => s !== value))
  }

  return (
    <div ref={containerRef}>
      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {selected.map(item => (
            <span
              key={item}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-black text-white text-xs font-medium max-w-full"
            >
              <span className="truncate">{item}</span>
              <button
                onClick={() => handleRemove(item)}
                className="flex-shrink-0 text-gray-400 hover:text-white font-bold"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => { if (query.trim()) setIsOpen(true) }}
          placeholder={placeholder}
          className="w-full px-2 py-1.5 border-2 border-black text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black"
        />

        {/* Dropdown */}
        {isOpen && filteredOptions.length > 0 && (
          <div className="absolute z-50 left-0 right-0 top-full bg-white border-2 border-black border-t-0 max-h-48 overflow-y-auto shadow-lg">
            {filteredOptions.map(opt => (
              <div
                key={opt}
                onClick={() => handleSelect(opt)}
                className="px-2 py-1.5 text-xs text-black cursor-pointer hover:bg-black hover:text-white truncate"
              >
                {opt}
              </div>
            ))}
          </div>
        )}

        {isOpen && query.trim() && filteredOptions.length === 0 && (
          <div className="absolute z-50 left-0 right-0 top-full bg-white border-2 border-black border-t-0 shadow-lg">
            <div className="px-2 py-2 text-xs text-gray-500">
              No matches found
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
