import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'

function NavDropdown({ label, items }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const closeTimer = useRef(null)

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleEnter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpen(true)
  }

  const handleLeave = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 120)
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1 hover:opacity-80 transition-opacity"
        aria-haspopup="true"
        aria-expanded={open}
      >
        {label}
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        className={`absolute right-0 mt-2 w-40 rounded-lg border border-light-card-border dark:border-dark-card-border bg-light-card dark:bg-dark-card shadow-lg overflow-hidden transition-all duration-200 origin-top ${
          open
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        {items.map((item) => (
          <Link
            key={item.label}
            to={item.to}
            className="block px-4 py-2 text-sm hover:bg-light-input dark:hover:bg-dark-input transition-colors"
            onClick={() => setOpen(false)}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

export default NavDropdown
