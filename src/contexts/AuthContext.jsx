import { createContext, useContext, useEffect, useState } from 'react'
import { post, get } from '../lib/api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Restore session on app load
  useEffect(() => {
    async function restoreSession() {
      const token = localStorage.getItem('token')
      if (!token) {
        setLoading(false)
        return
      }

      const result = await get('/api/users/me')
      if (result.ok) {
        setUser(result.data)
      } else {
        // Token invalid or expired
        localStorage.removeItem('token')
      }
      setLoading(false)
    }

    restoreSession()
  }, [])

  // Register a new user
  const register = async ({ name, username, email, password }) => {
    const result = await post('/api/register', { name, username, email, password })
    return result
  }

  // Log in with username + password
  const login = async ({ username, password }) => {
    const result = await post('/api/login', { username, password })
    if (result.ok) {
      localStorage.setItem('token', result.data.token)
      setUser(result.data.user)
    }
    return result
  }

  // Log out
  const logout = () => {
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
