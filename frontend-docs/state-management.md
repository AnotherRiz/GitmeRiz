# State Management

Global state is handled with React Context. There are two contexts: `AuthContext` and `ThemeContext`. Component-local state uses `useState` directly.

---

## AuthContext

**File:** `src/contexts/AuthContext.jsx`

Manages the authenticated user and exposes auth actions. Wrap the app in `<AuthProvider>` (done in `App.jsx`) and consume it with the `useAuth()` hook.

### Provided Value

| Key | Type | Description |
| --- | --- | --- |
| `user` | `object \| null` | The current user (`{ id, name, username, email, role, ... }`) or `null` when logged out |
| `loading` | `boolean` | `true` while the session is being restored on app load |
| `register` | `(fields) => Promise<{ok, data, error}>` | Register a new account |
| `login` | `({ username, password }) => Promise<{ok, data, error}>` | Log in and store the token |
| `logout` | `() => Promise<void>` | Clear server cookie via `POST /logout`, then remove token and user from local state |

### Session Restore

On mount, the provider calls `GET /validate-session` to restore the session using the `refresh_token` HttpOnly cookie (sent automatically by the browser). This is a read-only endpoint that does not rotate tokens.

- **Success** (`200`) → sets `user` from the returned object (which is the user object directly in `data`, not nested).
- **Failure** (`401` or network error) → clears any stale fallback token from `localStorage` and sets `user` to `null`.

This approach works whether or not a token exists in `localStorage`, ensuring users with valid HttpOnly cookies remain logged in across page refreshes.

`loading` stays `true` until this completes, so protected pages can show a spinner instead of prematurely redirecting.

### Auth Actions

```js
// Register — does NOT auto-login; the Register page navigates to /login on success
const result = await register({ name, username, email, password })

// Login — on success, stores result.data.token in localStorage and sets user
const result = await login({ username, password })

// Logout — calls POST /logout to clear server cookie, then removes token and clears user
await logout()
```

### Usage

```jsx
import { useAuth } from '../contexts/AuthContext'

function Profile() {
  const { user, loading, logout } = useAuth()
  if (loading) return <div>Loading...</div>
  if (!user) return <div>Please log in</div>
  return (
    <div>
      Hello {user.name}
      <button onClick={logout}>Log out</button>
    </div>
  )
}
```

> `useAuth()` throws if used outside `<AuthProvider>`.

### Token Storage Note

The JWT is stored in `localStorage` under the key `token` as a fallback for the `Authorization: Bearer <token>` header. **HttpOnly cookies are the primary authentication mechanism** and are sent automatically with every request via `credentials: 'include'` in the API client (`src/lib/api.js`). The `api.js` client also relies on cookie-based auth and sends the bearer token from localStorage as a fallback for backward compatibility. See [API Integration](./api-integration.md).

---

## ThemeContext

**File:** `src/contexts/ThemeContext.jsx`

Manages light/dark theme with persistence and system-preference detection.

### Provided Value

| Key | Type | Description |
| --- | --- | --- |
| `theme` | `'light' \| 'dark'` | The active theme |
| `toggleTheme` | `() => void` | Switch between light and dark |

### Initial Theme Resolution

1. Use the value saved in `localStorage` under `theme`, if any.
2. Otherwise, use the OS preference via `window.matchMedia('(prefers-color-scheme: dark)')`.
3. Default to `light`.

### Applying the Theme

An effect keeps the DOM in sync whenever `theme` changes:

- Toggles the `light` / `dark` class on `<html>` (Tailwind's `darkMode: 'class'` depends on this).
- Persists the choice to `localStorage`.
- Sets inline `backgroundColor` / `color` on `<html>` to match the palette, reinforcing the flash-prevention script in `index.html`.

### Usage

```jsx
import { useTheme } from '../contexts/ThemeContext'

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  return (
    <button onClick={toggleTheme}>
      {theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
    </button>
  )
}
```

> `useTheme()` throws if used outside `<ThemeProvider>`.

### Flash Prevention

`index.html` includes an inline script that applies the saved/system theme to `<html>` **before** React mounts, avoiding a flash of the wrong theme on first paint.
