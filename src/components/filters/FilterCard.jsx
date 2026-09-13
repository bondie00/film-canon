import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * The sticky filter rail. Every page that filters uses this shell, so the pane
 * is in the same place, at the same weight, with the same heading and the same
 * scrolling behaviour throughout the site.
 *
 * Sections inside it are separated by <FilterSection>, which owns the rules
 * between controls — the dividers were previously hand-written on each control
 * and drifted out of step (some ruled above, some below, some not at all).
 *
 * `action` sits opposite the heading (Explore's "Clear all").
 *
 * ## A rail taller than the window
 *
 * It sticks on every page, and on a short enough window any rail runs past the
 * bottom — /explore's already does on a laptop. A sticky element taller than the
 * viewport never scrolls into view, so the rail is capped at the viewport and
 * scrolls internally, with the poll grid at its top.
 *
 * The scrollbar is HIDDEN. A visible one was a second scrollbar on the page, and
 * on Windows it takes width, so every control shifted sideways when it appeared.
 * Wheel, trackpad, touch and Tab all still scroll it. What the scrollbar used to
 * signal is carried by edge fades instead: one at the bottom while there's more
 * below, one at the top once you've scrolled.
 *
 * Because the rail scrolls, the dropdowns inside it (Title, Director, Country, Genre)
 * open in flow and push the controls below them down, rather than floating —
 * a floating dropdown would be clipped at the rail's edge.
 *
 * The rail must be a direct child of the column it sticks within: a wrapper as
 * tall as the rail leaves it no room to stick.
 */
export default function FilterCard({ children, action = null }) {
  const scrollRef = useRef(null)
  const contentRef = useRef(null)
  const [fade, setFade] = useState({ top: false, bottom: false })

  const measure = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const top = el.scrollTop > 1
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 1
    setFade(prev => (prev.top === top && prev.bottom === bottom ? prev : { top, bottom }))
  }, [])

  useEffect(() => {
    measure()
    // The overflow changes without a scroll: window resizes, and the content
    // grows when chips are added or a dropdown opens.
    const observer = new ResizeObserver(measure)
    observer.observe(scrollRef.current)
    observer.observe(contentRef.current)
    return () => observer.disconnect()
  }, [measure])

  return (
    <div className="relative bg-white border-4 border-black lg:sticky lg:top-8">
      <div
        ref={scrollRef}
        onScroll={measure}
        className="lg:max-h-[calc(100vh-4rem)] overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div ref={contentRef} className="p-5">
          <div className="flex items-baseline justify-between gap-3 mb-4">
            <h2 className="text-2xl font-bold text-black uppercase tracking-wider">Filters</h2>
            {action}
          </div>
          {children}
        </div>
      </div>

      <EdgeFade side="top" visible={fade.top} />
      <EdgeFade side="bottom" visible={fade.bottom} />
    </div>
  )
}

function EdgeFade({ side, visible }) {
  const position = side === 'top' ? 'top-0 bg-gradient-to-b' : 'bottom-0 bg-gradient-to-t'
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 h-12 from-white to-transparent transition-opacity duration-150 ${position} ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    />
  )
}

/**
 * One control in the rail. `first` drops the leading rule, so the top control
 * sits flush under the heading.
 */
export function FilterSection({ label, action = null, first = false, children }) {
  return (
    <div className={first ? '' : 'mt-4 pt-4 border-t-2 border-gray-300'}>
      {label && (
        <div className="flex items-center justify-between mb-2">
          <FilterLabel>{label}</FilterLabel>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

/**
 * The per-control "Clear (n)" beside a label. Every multi-select in a rail shows
 * it once something is picked, so the way to undo a selection is always in the
 * same place. Renders nothing at zero.
 */
export function ClearButton({ count, onClick }) {
  if (!count) return null
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs font-bold text-red-600 hover:text-red-800 uppercase tracking-wide"
    >
      Clear ({count})
    </button>
  )
}

/**
 * The label style for a rail control. Exported for controls that carry their
 * own label row (Country and Director put a Clear button beside it).
 */
export function FilterLabel({ children, className = '' }) {
  return (
    <label className={`block text-sm font-semibold text-black uppercase tracking-wide ${className}`}>
      {children}
    </label>
  )
}
