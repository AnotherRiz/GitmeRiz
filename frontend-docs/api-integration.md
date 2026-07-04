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

- `credentials: 'include'` — sends httpOnly cookies automatically (primary auth).
- `Authorization: Bearer <token>` — added from `localStorage` if a token exists (fallback for backward compatibility).

The backend is expected to prioritize the cookie over the header.

### Core Function

```js
export async function api(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`
  const headers = { 'Content-Type': 'application/json', ...options.headers }

  const token = localStorage.getItem('token')
  if (token) headers['Authorization'] = `Bearer ${token}`

  try {
    const res = await fetch(url, { ...options, headers, credentials: 'include' })
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

- `POST /register`, `POST /login`, `GET /users/me`, `GET /users`
- `GET /gallery/me`, `GET /gallery/public`
- `POST /gallery` (upload), `POST /gallery/status`, `POST /gallery/{id}/reprocess`
- `PATCH /gallery/{id}/title`, `/visibility`, `/pinned`
- `PATCH /gallery/reorder-pins`
- `DELETE /gallery/{id}`
