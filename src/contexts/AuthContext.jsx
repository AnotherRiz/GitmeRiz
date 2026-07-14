import { createContext, useContext, useEffect, useState } from 'react'
import { post, get } from '../lib/api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Restore session on app load and handle auth events
  useEffect(() => {
    async function restoreSession() {
      // Cookies are sent automatically (credentials: 'include' in api.js).
      // validate-session is read-only and returns the user object directly.
      const result = await get('/validate-session')
      if (result.ok) {
        setUser(result.data) // data IS the user object
      } else {
        // No valid session: clear any stale fallback token
        localStorage.removeItem('token')
        setUser(null)
      }
      setLoading(false)
    }

    const handleLogout = () => {
      localStorage.removeItem('token')
      setUser(null)
    }

    const handleRefreshed = (e) => {
      if (e.detail && e.detail.user) {
        setUser(e.detail.user)
      }
    }

    window.addEventListener('auth-logout', handleLogout)
    window.addEventListener('auth-token-refreshed', handleRefreshed)

    restoreSession()

    return () => {
      window.removeEventListener('auth-logout', handleLogout)
      window.removeEventListener('auth-token-refreshed', handleRefreshed)
    }
  }, [])

  // Register a new user
  const register = async ({ name, username, email, password }) => {
    const result = await post('/register', { name, username, email, password })
    return result
  }

  // Log in with username + password
  const login = async ({ username, password }) => {
    const result = await post('/login', { username, password })
    if (result.ok) {
      localStorage.setItem('token', result.data.token)
      setUser(result.data.user)
    }
    return result
  }

  // Log out - clears server cookie and local state
  const logout = async () => {
    // Clear the server cookie (safe even without a valid session)
    await post('/logout', {})
    // Always clear local state even if the request fails
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
