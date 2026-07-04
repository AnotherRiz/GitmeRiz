# Architecture

This document describes how the application is wired together: the folder layout, the entry point, the provider tree, and routing.

## Folder Structure

```
src/
├── components/          # Reusable UI components
│   ├── EditNameModal.jsx
│   ├── FloatingDock.jsx
│   ├── ImageModal.jsx
│   ├── Navbar.jsx
│   ├── NavDropdown.jsx
│   ├── SecureImage.jsx
│   ├── SortablePinnedCard.jsx
│   ├── UploadModal.jsx
│   └── UserDropdown.jsx
├── contexts/            # React contexts (global state)
│   ├── AuthContext.jsx
│   └── ThemeContext.jsx
├── lib/                 # Framework-agnostic helpers
│   ├── api.js           # Fetch wrapper + response envelope
│   ├── pollStatus.js    # Batch status polling for uploads
│   └── shortId.js       # short_id accessor
├── pages/               # Route-level components
│   ├── Blog.jsx
│   ├── Dashboard.jsx
│   ├── Gallery.jsx
│   ├── Home.jsx
│   ├── Login.jsx
│   ├── MyGallery.jsx
│   └── Register.jsx
├── assets/              # Static images (hero, logos)
├── App.jsx              # Providers + routing
├── main.jsx             # React entry point
├── index.css            # Tailwind directives + global styles
└── App.css              # Component-scoped global styles
```

## Entry Point

`src/main.jsx` mounts the app into the `#root` element inside React `StrictMode`:

```jsx
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

## Provider Tree

`src/App.jsx` composes the global providers and the router. Order matters — theme and auth wrap the router so every route can consume them:

```
<ThemeProvider>
  <AuthProvider>
    <Router>
      <AppContent />   // Navbar + FloatingDock + <Routes>
    </Router>
  </AuthProvider>
</ThemeProvider>
```

- **ThemeProvider** — light/dark theme state (see [State Management](./state-management.md)).
- **AuthProvider** — current user + auth actions.
- **Router** — `BrowserRouter` from React Router DOM.

### AppContent and chrome visibility

`AppContent` decides which navigation chrome to show:

- The top **`Navbar`** renders only when the user is logged out **or** is on the Home page (`/`).
- The **`FloatingDock`** renders its own visibility internally — it hides when logged out or on Home.

```jsx
const showNavbar = !user || location.pathname === '/'
```

## Routing

All routes are declared in `App.jsx`:

| Path | Component | Access | Notes |
| --- | --- | --- | --- |
| `/` | `Home` | Public | Landing/hero page |
| `/blog` | `Blog` | Public | |
| `/login` | `Login` | Public | Redirects to `/dashboard` on success |
| `/register` | `Register` | Public | Redirects to `/login` on success |
| `/dashboard` | `Dashboard` | Protected | Redirects to `/login` if unauthenticated |
| `/gallery` | `Gallery` | Public | Lists all public images |
| `/:username/gallery` | `MyGallery` | Protected + owner-only | Private uploads workspace |

### Route Protection Pattern

There is no route-guard wrapper component. Protection is handled inside each page using the auth state:

```jsx
function ProtectedPage() {
  const { user, loading } = useAuth()
  if (loading) return <div>Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  return <ProtectedContent />
}
```

`MyGallery` adds an **owner check** on top of this — if the `:username` route param does not match the logged-in user's username, it shows a "Forbidden" screen instead of the gallery.

## Data Flow Summary

1. On load, `AuthProvider` reads the token from `localStorage` and calls `GET /users/me` to restore the session.
2. Pages call helpers from `lib/api.js`, which returns a normalized `{ ok, data, error }` object.
3. Components render based on `loading` / `error` / `data` states.
4. Global concerns (current user, theme) come from context via `useAuth()` / `useTheme()`.
