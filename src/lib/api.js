const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000'

/**
 * Fetch helper that handles the API envelope { success, data, error }
 * Returns { ok: boolean, data?: any, error?: string }
 * 
 * Uses cookie-based authentication:
 * - credentials: 'include' sends httpOnly cookies automatically
 * - No manual Authorization header needed (backend reads from cookie)
 * - Fallback: still supports Bearer token from localStorage for backward compatibility
 */
let refreshPromise = null

export async function api(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  // Fallback: Add auth token if available (for backward compatibility)
  // Backend should prioritize cookie over header
  const token = localStorage.getItem('token')
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Important! Send cookies with every request
    })

    // If unauthorized, attempt to silent refresh (unless we are already refreshing/logging in/logging out)
    if (res.status === 401 && endpoint !== '/refresh' && endpoint !== '/login' && endpoint !== '/logout') {
      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
            const refreshUrl = `${BASE_URL}/refresh`
            const refreshRes = await fetch(refreshUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
            })
            const refreshJson = await refreshRes.json()
            if (refreshJson.success) {
              localStorage.setItem('token', refreshJson.data.token)
              window.dispatchEvent(new CustomEvent('auth-token-refreshed', { detail: refreshJson.data }))
              return { ok: true, token: refreshJson.data.token }
            }
            return { ok: false }
          } catch (e) {
            return { ok: false }
          } finally {
            refreshPromise = null
          }
        })()
      }

      const refreshResult = await refreshPromise

      if (refreshResult.ok) {
        // Retry the original request with the new token
        headers['Authorization'] = `Bearer ${refreshResult.token}`
        const retryRes = await fetch(url, {
          ...options,
          headers,
          credentials: 'include',
        })
        const retryJson = await retryRes.json()
        if (retryJson.success) {
          return { ok: true, data: retryJson.data }
        } else {
          return { ok: false, error: retryJson.error || 'Something went wrong' }
        }
      } else {
        // Refresh failed (refresh token expired/invalid/revoked) -> force logout
        window.dispatchEvent(new Event('auth-logout'))
        return { ok: false, error: 'Session expired. Please log in again.' }
      }
    }

    const json = await res.json()

    if (json.success) {
      return { ok: true, data: json.data }
    } else {
      return { ok: false, error: json.error || 'Something went wrong' }
    }
  } catch (err) {
    return { ok: false, error: 'Network error. Please try again.' }
  }
}

/**
 * POST request helper
 */
export function post(endpoint, body) {
  return api(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/**
 * GET request helper
 */
export function get(endpoint) {
  return api(endpoint, {
    method: 'GET',
  })
}
