# API Integration

All network communication goes through a single, thin client: `src/lib/api.js`. This keeps auth handling, the base URL, and the response format consistent across the app.

---

## The Client: `lib/api.js`

### Base URL

```js
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000'
```

Always sourced from the environment. Never hardcode a URL in a component.

### Response Envelope

The backend returns responses in the shape `{ success, data, error }`. The client normalizes every call into a predictable object:

```js
// Success
{ ok: true, data: <payload> }

// Failure (API error or network error)
{ ok: false, error: '<message>' }
```

This means callers **never** need `try/catch` or `.json()` — they just check `res.ok`.

### Authentication

Every request is sent with:

- `credentials: 'include'` — sends `httpOnly` cookies automatically (primary auth, e.g., `auth_token` and `refresh_token`).
- `Authorization: Bearer <token>` — added from `localStorage` if a token exists (fallback for clients/endpoints not utilizing cookies).

If a request returns `401 Unauthorized`, the client automatically attempts to perform a **silent token rotation** using `/refresh` before retrying the original request.

### Core Function

```js
let refreshPromise = null

export async function api(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  const token = localStorage.getItem('token')
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    })

    // Catch 401 and attempt silent refresh
    if (res.status === 401 && endpoint !== '/refresh' && endpoint !== '/login' && endpoint !== '/logout') {
      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
            const refreshUrl = `${BASE_URL}/refresh`
            const refreshRes = await fetch(refreshUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
            })
            const refreshJson = await refreshRes.json()
            if (refreshJson.success) {
              localStorage.setItem('token', refreshJson.data.token)
              window.dispatchEvent(new CustomEvent('auth-token-refreshed', { detail: refreshJson.data }))
              return { ok: true, token: refreshJson.data.token }
            }
            return { ok: false }
          } catch {
            return { ok: false }
          } finally {
            refreshPromise = null
          }
        })()
      }

      const refreshResult = await refreshPromise

      if (refreshResult.ok) {
        headers['Authorization'] = `Bearer ${refreshResult.token}`
        const retryRes = await fetch(url, { ...options, headers, credentials: 'include' })
        const retryJson = await retryRes.json()
        return retryJson.success
          ? { ok: true, data: retryJson.data }
          : { ok: false, error: retryJson.error || 'Something went wrong' }
      } else {
        window.dispatchEvent(new Event('auth-logout'))
        return { ok: false, error: 'Session expired. Please log in again.' }
      }
    }

    const json = await res.json()
    return json.success
      ? { ok: true, data: json.data }
      : { ok: false, error: json.error || 'Something went wrong' }
  } catch {
    return { ok: false, error: 'Network error. Please try again.' }
  }
}
```

### Helpers

```js
import { get, post, api } from '../lib/api'

// GET
const res = await get('/gallery/me')

// POST (body is JSON.stringified for you)
const res = await post('/login', { username, password })

// Other methods (PATCH, DELETE, ...) use api() directly
const res = await api(`/gallery/${id}/pinned`, {
  method: 'PATCH',
  body: JSON.stringify({ pinned: true }),
})

const res = await api(`/gallery/${id}`, { method: 'DELETE' })
```

### Standard Usage Pattern

```js
const res = await get('/gallery/me')
if (res.ok) {
  setImages(res.data)
} else {
  setError(res.error)
}
```

---

## Gallery Endpoints with Cursor-Based Pagination

Gallery listing endpoints (`GET /gallery/public` and `GET /gallery/me`) now use cursor-based pagination for better performance with large datasets.

### Response Envelope

Instead of returning a plain array, these endpoints return a paginated envelope:

```json
{
  "success": true,
  "data": {
    "items": [ /* GalleryItem[] */ ],
    "next_cursor": 450,
    "limit": 50
  }
}
```

### Query Parameters

- `cursor` (optional): The `id` of the last item from the previous page. Omit on the first request.
- `limit` (optional): Items per page (default `50`, max `100`).

### Infinite Scroll Usage

```js
// First page
const params = new URLSearchParams()
params.set('limit', '50')
const res = await get(`/gallery/public?${params.toString()}`)

// Subsequent pages
if (res.data.next_cursor) {
  params.set('cursor', res.data.next_cursor)
  const nextRes = await get(`/gallery/public?${params.toString()}`)
  // Append res.data.items to existing list
}
```

Results are ordered by `id DESC` (newest first). When `next_cursor` is `null`, you've reached the end.

### Pinned Images Endpoint

`GET /gallery/me/pinned` returns the current user's pinned images (max 8) without pagination, ordered by `pin_order ASC, updated_at DESC`.

---

## Unified Gallery Updates: `PATCH /gallery/{id}`

All gallery item updates (title, visibility, pinned status) now use a single endpoint instead of separate endpoints.

### Request

Send only the fields you want to change:

```js
// Update title only
const res = await api('/gallery/123', {
  method: 'PATCH',
  body: JSON.stringify({ title: 'New Title' }),
})

// Update multiple fields at once
const res = await api('/gallery/123', {
  method: 'PATCH', 
  body: JSON.stringify({
    title: 'Updated Photo',
    visibility: 'public',
    pinned: true
  }),
})
```

### Validation

- `title`: Must not be empty or whitespace
- `visibility`: Must be `public` or `private` (case-insensitive)
- `pinned`: Enforces 8-pin limit when setting to `true`

The response returns the fully updated gallery item with computed fields like `pin_order`.

---

## Download Endpoint

`GET /gallery/d/{id}` serves images with `Content-Disposition: attachment`, forcing a download with the original filename.

### Usage

```js
// Public images: direct link
const downloadUrl = `${BASE_URL}/gallery/d/${image.id}`
window.open(downloadUrl) // or create <a> element

// Private images: fetch with auth, then trigger download
const response = await fetch(downloadUrl, {
  credentials: 'include',
  headers: { Authorization: `Bearer ${token}` }
})
const blob = await response.blob()
// ... create object URL and download
```

---

## Auth Validation: `lib/validation.js`

Pure validation functions used by auth forms (Register, Login). All return `null` on success or an error string on failure.

### Functions

```js
validateUsername(username)
// → null | "Username is required." | "Username must be 3-20 characters." | etc.

validateName(name)
// → null | "Name is required." | "Name must be 2-50 characters."

validateEmail(email)
// → null | "Email is required." | "Email must be at most 255 characters." | "Please enter a valid email address."

validatePassword(password)
// → null | "Password is required." | "Password must be at least 8 characters."

passwordStrengthHint(password)
// → null | "Tip: use at least 1 uppercase letter and 1 digit for a stronger password."
// Non-blocking hint (does not prevent submission)
```

### Usage in Register Form

```js
import { validateName, validateUsername, validateEmail, validatePassword } from '../lib/validation'

const errors = {}
const nameError = validateName(form.name)
const usernameError = validateUsername(form.username)
const emailError = validateEmail(form.email)
const passwordError = validatePassword(form.password)

if (nameError) errors.name = nameError
if (usernameError) errors.username = usernameError
// ...

if (Object.keys(errors).length > 0) {
  setFieldErrors(errors)
  return
}

// Proceed with API call
```

The Register page displays per-field errors beneath each input and a password strength hint when applicable.

---

## Status Polling: `lib/pollStatus.js`

Used by uploads that are processed asynchronously on the backend. It batch-checks the status of many items in a single request.

```js
import { fetchStatuses } from '../lib/pollStatus'

// ids: number[] of items currently "processing"
const statusMap = await fetchStatuses(ids)
// → { "12": "active", "13": "processing", "14": "failed_processing" }
```

- Returns `{}` when `ids` is empty or on failure (caller retries on the next tick).
- Backed by `POST /gallery/status` with `{ ids }`.

See [Features → Background Upload Processing](./features.md#background-upload-processing--status-polling) for how this is consumed.

---

## Short IDs: `lib/shortId.js`

The backend assigns each gallery image a unique 8-character `short_id`. Image byte endpoints are keyed by this value.

```js
import { getShortId } from '../lib/shortId'

const shortId = getShortId(galleryItem) // → item.short_id || null
```

### Image Byte URLs

Images are served by the backend at three size variants, all keyed by `short_id`:

| Type | Path | Use |
| --- | --- | --- |
| Thumbnail | `/gallery/t/{short_id}` | Grid/card previews |
| Preview | `/gallery/p/{short_id}` | Image modal (faster than raw) |
| Raw | `/gallery/r/{short_id}` | Full-quality download / original |

A common helper appears in gallery pages:

```js
const getImageUrl = (img, type = 't') =>
  `${BASE_URL}/gallery/${type}/${getShortId(img)}`
```

> These are plain URLs without a token in the query string; the backend authorizes via cookie/header. For endpoints that need an auth header on the image request itself (e.g. downloading a private raw image), the code uses `fetch` with the `Authorization` header and converts the response to a blob. See [Features → Image Viewer](./features.md#image-viewer-imagemodal).

---

## Backend Reference

Full endpoint documentation (request/response shapes, error codes) lives in [`../api-docs.md`](../api-docs.md). Notable endpoints used by the frontend:

- `POST /register`, `POST /login`, `POST /logout`, `GET /users/me`, `GET /users`
- `GET /gallery/public`, `GET /gallery/me`, `GET /gallery/me/pinned` with cursor-based pagination
- `POST /gallery` (upload), `POST /gallery/status`, `POST /gallery/{id}/reprocess`
- `GET /gallery/r/{short_id}`, `GET /gallery/t/{short_id}`, `GET /gallery/p/{short_id}` (raw, thumbnail, preview)
- `GET /gallery/d/{id}` (force download with original filename)
- `PATCH /gallery/{id}` (unified updates: title, visibility, pinned)
- `PATCH /gallery/reorder-pins`
- `DELETE /gallery/{id}`
