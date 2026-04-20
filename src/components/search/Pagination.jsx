export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  // Build page numbers with smart truncation
  const getPageNumbers = () => {
    const pages = []
    const window = 2 // pages around current

    // Always include page 1
    pages.push(1)

    // Left ellipsis
    if (currentPage - window > 2) {
      pages.push('...')
    }

    // Window around current page
    for (let i = Math.max(2, currentPage - window); i <= Math.min(totalPages - 1, currentPage + window); i++) {
      pages.push(i)
    }

    // Right ellipsis
    if (currentPage + window < totalPages - 1) {
      pages.push('...')
    }

    // Always include last page
    if (totalPages > 1) {
      pages.push(totalPages)
    }

    return pages
  }

  const pageNumbers = getPageNumbers()

  return (
    <div className="flex items-center justify-center gap-1.5">
      {/* Prev button */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`px-3 py-2 text-xs font-bold uppercase tracking-wide border-2 transition-all ${
          currentPage === 1
            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
            : 'bg-white text-black border-gray-300 hover:border-black'
        }`}
      >
        Prev
      </button>

      {/* Page numbers */}
      {pageNumbers.map((page, i) => {
        if (page === '...') {
          return (
            <span key={`ellipsis-${i}`} className="px-2 py-2 text-xs text-gray-400">
              ...
            </span>
          )
        }

        const isActive = page === currentPage
        return (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-9 h-9 text-xs font-bold border-2 transition-all ${
              isActive
                ? 'bg-black text-white border-black'
                : 'bg-white text-black border-gray-300 hover:border-black'
            }`}
          >
            {page}
          </button>
        )
      })}

      {/* Next button */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`px-3 py-2 text-xs font-bold uppercase tracking-wide border-2 transition-all ${
          currentPage === totalPages
            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
            : 'bg-white text-black border-gray-300 hover:border-black'
        }`}
      >
        Next
      </button>
    </div>
  )
}
