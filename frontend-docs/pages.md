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
- Client-side validation requires both fields.
- Calls `login()` from `AuthContext`; on success navigates to `/dashboard`, otherwise shows the API error in a banner.
- Submit button shows "Logging in..." and is disabled while submitting.
- Link to `/register`.

---

## Register — `/register`

**File:** `Register.jsx`

Controlled registration form.

- Fields: `name`, `username`, `email`, `password`, `confirmPassword` (both password fields have show/hide toggles).
- Validates all fields present and that passwords match. `confirmPassword` is client-side only and not sent to the API.
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

- Fetches `GET /gallery/public`.
- If the current user is a **superuser**, also fetches `GET /users` to map `user_id` → uploader name.
- Masonry layout using CSS columns (`columns-1 sm:columns-2 md:columns-3 lg:columns-4`).
- Each card shows a visibility badge, thumbnail (`/gallery/t/{short_id}`), title, and uploader name.
- Clicking a card opens `ImageModal`.
- Loading skeletons and an empty state are provided.

---

## MyGallery — `/:username/gallery` (protected, owner-only)

**File:** `MyGallery.jsx`

The user's private workspace for managing their uploads. This is the most feature-rich page.

### Access control

- Loader while auth resolves; redirect to `/login` if unauthenticated.
- **Owner check:** if the `:username` param ≠ the logged-in user's username, a "Forbidden" screen is shown with a button back to the user's own gallery.

### Sections

1. **Pinned (Bento grid)** — up to 8 pinned images in a responsive grid; vertical images span two rows; drag-and-drop reordering persisted to the backend. See [Features → Pinned Bento Grid](./features.md#pinned-bento-grid).
2. **Images (masonry)** — all unpinned images in a CSS-columns masonry layout with hover actions.

### Data & actions

- Loads `GET /gallery/me`; filters to the current user's items and splits into pinned/unpinned.
- Per-item actions:
  - **Pin/unpin** → `PATCH /gallery/{id}/pinned` (enforces the 8-pin limit client-side).
  - **Reorder pins** → `PATCH /gallery/reorder-pins` (drag-and-drop).
  - **Rename** → opens `EditNameModal` (`PATCH /gallery/{id}/title`).
  - **Toggle visibility** → `PATCH /gallery/{id}/visibility`.
  - **Delete** → `DELETE /gallery/{id}` (with confirm).
  - **Retry processing** → `POST /gallery/{id}/reprocess` for failed items.
- **Upload** via `UploadModal`, which can be minimized to continue in the background.
- **Image viewing** via a `?view={short_id}` query param that drives `ImageModal`.
- **Status polling** for items in `processing` state (see [Features](./features.md#background-upload-processing--status-polling)).

### URL-driven modal

Opening an image sets `?view={short_id}`; closing clears it. This makes the open image shareable/bookmarkable and integrates with browser navigation.
