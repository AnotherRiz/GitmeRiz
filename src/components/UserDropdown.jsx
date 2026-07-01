import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

function UserDropdown() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

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

  // Generate initials for avatar
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'

  const handleLogout = () => {
    setOpen(false)
    logout()
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center justify-center w-9 h-9 rounded-full bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
        aria-haspopup="true"
        aria-expanded={open}
      >
        {initials}
      </button>

      <div
        className={`absolute right-0 mt-2 w-40 rounded-lg border border-light-card-border dark:border-dark-card-border bg-light-card dark:bg-dark-card shadow-lg overflow-hidden transition-all duration-200 origin-top-right ${
          open
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <div className="px-4 py-2 border-b border-light-card-border dark:border-dark-card-border">
          <p className="text-sm font-medium truncate">{user?.name}</p>
          <p className="text-xs opacity-60 truncate">{user?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full text-left px-4 py-2 text-sm hover:bg-light-input dark:hover:bg-dark-input transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  )
}

export default UserDropdown
