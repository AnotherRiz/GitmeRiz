import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'

function FloatingDock() {
  const { theme, toggleTheme } = useTheme()
  const { logout, user } = useAuth()
  const location = useLocation()

  // Do not show dock if user is logged out OR if we are on the Home page
  if (!user || location.pathname === '/') {
    return null
  }

  const isActive = (path) => location.pathname === path

  const linkClass = (path) => `
    p-3 rounded-full transition-all duration-200 ease-in-out hover:scale-110
    ${isActive(path) 
      ? 'bg-light-text text-light-body dark:bg-dark-text dark:text-dark-body shadow-md' 
      : 'hover:bg-black/5 dark:hover:bg-white/10 text-light-text/80 dark:text-dark-text/80'
    }
  `

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-full bg-light-navbar/95 dark:bg-dark-navbar/95 border border-light-navbar/30 dark:border-dark-navbar/30 backdrop-blur-md shadow-2xl transition-all duration-300">
      {/* Home */}
      <Link to="/" className={linkClass('/')} title="Home">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </Link>

      {/* Dashboard */}
      <Link to="/dashboard" className={linkClass('/dashboard')} title="Dashboard">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
        </svg>
      </Link>

      {/* Gallery */}
      <Link to="/gallery" className={linkClass('/gallery')} title="All Images">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </Link>

      {/* My Gallery */}
      <Link to="/my-gallery" className={linkClass('/my-gallery')} title="My Gallery">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </Link>

      {/* Divider */}
      <div className="w-px h-6 bg-light-navbar/20 dark:bg-dark-navbar/20 mx-1" />

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="p-3 rounded-full transition-all duration-200 ease-in-out hover:scale-110 hover:bg-black/5 dark:hover:bg-white/10 text-light-text/80 dark:text-dark-text/80"
        title="Toggle Theme"
      >
        {theme === 'dark' ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        )}
      </button>

      {/* Logout */}
      <button
        onClick={logout}
        className="p-3 rounded-full transition-all duration-200 ease-in-out hover:scale-110 hover:bg-red-500/10 text-red-500"
        title="Logout"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </button>
    </div>
  )
}

export default FloatingDock
