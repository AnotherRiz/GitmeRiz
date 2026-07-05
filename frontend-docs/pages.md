# Pages

Route-level components in `src/pages/`. Each maps to a route declared in `App.jsx`.

---

## Home — `/`

**File:** `Home.jsx`

Static landing/hero page. No data fetching. The standard `Navbar` is shown here even for authenticated users.

---

## Blog — `/blog`

**File:** `Blog.jsx`

Public content page.

---

## Login — `/login`

**File:** `Login.jsx`

Controlled login form.

- Fields: `username`, `password` (with show/hide toggle).
- Client-side validation requires both fields (non-empty, whitespace trimmed from username).
- Calls `login()` from `AuthContext`; on success navigates to `/dashboard`, otherwise shows the API error in a banner with a fallback message if none is provided.
- Submit button shows "Logging in..." and is disabled while submitting.
- Link to `/register`.

---

## Register — `/register`

**File:** `Register.jsx`

Controlled registration form with field-level validation.

- Fields: `name`, `username`, `email`, `password`, `confirmPassword` (both password fields have show/hide toggles).
- **Field-level validation** using shared helpers from `lib/validation.js`:
  - `name`: 2-50 characters
  - `username`: 3-20 characters, alphanumeric + underscore only
  - `email`: valid email format, max 255 characters
  - `password`: minimum 8 characters
  - `confirmPassword`: must match password (client-side only, not sent to API)
- Per-field error messages appear beneath each input on validation failure.
- Password field includes a non-blocking strength hint (suggests uppercase + digit if missing).
- Calls `register()`; on success navigates to `/login`.
- Link to `/login`.

---

## Dashboard — `/dashboard` (protected)

**File:** `Dashboard.jsx`

Displays the logged-in user's account details.

- Protection pattern: shows a loader while `loading`, redirects to `/login` if `!user`.
- Renders name, username, email, and role from the `user` object.

---

## Gallery — `/gallery`

**File:** `Gallery.jsx`

Public gallery of all images with `visibility: public`.

- **Infinite scroll pagination**: Fetches `GET /gallery/public` with cursor-based pagination (50 items per page).
- **Auto-loading**: Uses `IntersectionObserver` to detect when user scrolls near the bottom and loads the next page automatically.
- **User mapping**: If the current user is a **superuser**, also fetches `GET /users` to map `user_id` → uploader name.
- **Masonry layout**: CSS columns (`columns-1 sm:columns-2 md:columns-3 lg:columns-4`) with responsive breakpoints.
- **Image cards**: Show visibility badge, thumbnail (`/gallery/t/{short_id}`), title, and uploader name.
- **Image modal**: Clicking a card opens `ImageModal` with the preview image.
- **Loading states**: Initial skeleton loading and "Loading more..." spinner at the bottom during pagination.
- **Empty state**: Shown when no public images are available.

---

## MyGallery — `/:username/gallery` (protected, owner-only)

**File:** `MyGallery.jsx`

The user's private workspace for managing their uploads. This is the most feature-rich page.

### Access control

- Loader while auth resolves; redirect to `/login` if unauthenticated.
- **Owner check:** if the `:username` param ≠ the logged-in user's username, a "Forbidden" screen is shown with a button back to the user's own gallery.

### Data Sources

- **Pinned images**: `GET /gallery/me/pinned` (dedicated endpoint, max 8 items, ordered by `pin_order`)
- **Unpinned images**: `GET /gallery/me` with cursor-based pagination, filtered to exclude pinned items

### Sections

1. **Pinned (Bento grid)** — up to 8 pinned images in a responsive grid; vertical images span two rows; drag-and-drop reordering persisted to the backend. See [Features → Pinned Bento Grid](./features.md#pinned-bento-grid).
2. **Images (masonry with infinite scroll)** — unpinned images in a CSS-columns masonry layout with infinite scroll loading.

### Per-item actions

- **Pin/unpin** → `PATCH /gallery/{id}` with `{ pinned: true/false }` (enforces the 8-pin limit client-side).
- **Reorder pins** → `PATCH /gallery/reorder-pins` (drag-and-drop).
- **Rename** → opens `EditNameModal` (`PATCH /gallery/{id}` with `{ title }` via unified endpoint).
- **Toggle visibility** → `PATCH /gallery/{id}` with `{ visibility }` via unified endpoint.
- **Delete** → `DELETE /gallery/{id}` (with confirmation).
- **Retry processing** → `POST /gallery/{id}/reprocess` for failed items.

### Other features

- **Upload**: `UploadModal` can be minimized to continue in the background.
- **Image viewing**: `?view={short_id}` query param drives `ImageModal`.
- **Status polling**: Monitors items in `processing` state across both pinned and unpinned lists.
- **Infinite scroll**: Loads more unpinned images as user scrolls down.

### URL-driven modal

Opening an image sets `?view={short_id}`; closing clears it. This makes the open image shareable/bookmarkable and integrates with browser navigation.
