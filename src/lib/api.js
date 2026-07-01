const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000'

/**
 * Fetch helper that handles the API envelope { success, data, error }
 * Returns { ok: boolean, data?: any, error?: string }
 */
export async function api(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  // Add auth token if available
  const token = localStorage.getItem('token')
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    })

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
