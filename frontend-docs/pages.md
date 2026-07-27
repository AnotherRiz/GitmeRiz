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

- **Pin/unpin** → `PATCH /gallery/{id}` with `{ pinned: true/false }` (enforces the 8-pin limit client-side with modal feedback).
- **Reorder pins** → `PATCH /gallery/reorder-pins` (drag-and-drop via dedicated drag handle that appears on hover).
- **Rename** → opens `EditNameModal` (`PATCH /gallery/{id}` with `{ title }` via unified endpoint).
- **Toggle visibility** → `PATCH /gallery/{id}` with `{ visibility }` via unified endpoint.
- **Delete** → `DELETE /gallery/{id}` with `ConfirmModal`; **Shift+click skips confirmation** for power users.
- **Retry processing** → `POST /gallery/{id}/reprocess` for failed items.

### Modal dialogs

All user-facing alerts and confirmations use `ConfirmModal` instead of browser alerts for a consistent, branded experience:

- **Delete confirmation**: Shows image title and provides Shift+click skip tip
- **Pin limit**: Friendly message when trying to pin beyond 8 images
- **Generic alerts**: Operation failures (delete, pin, visibility, reprocess, reorder) with descriptive titles and messages
- **Download errors**: In `ImageModal`, download failures show modal alerts instead of browser alerts

### Other features

- **Upload**: `UploadModal` can be minimized to continue in the background.
- **Image viewing**: `?view={short_id}` query param drives `ImageModal`.
- **Status polling**: Monitors items in `processing` state across both pinned and unpinned lists.
- **Infinite scroll**: Loads more unpinned images as user scrolls down.

### URL-driven modal

Opening an image sets `?view={short_id}`; closing clears it. This makes the open image shareable/bookmarkable and integrates with browser navigation.

---

## Video — `/video`

**File:** `Video.jsx`

Public gallery of all videos with `visibility: public`.

- **Infinite scroll pagination**: Fetches `GET /video/public` with cursor-based pagination (20 items per page).
- **Auto-loading**: Uses `IntersectionObserver` to detect when user scrolls near the bottom and loads the next page automatically.
- **Masonry layout**: CSS columns with responsive breakpoints.
- **Video cards**: Display thumbnail, title, and visibility badge. Cards link to `/watch/{short_id}` to play the video.
- **Processing feedback**: Shows a spinning indicator for videos still being transcoded.
- **Loading and empty states**: Skeleton loaders during initial load and "Loading more..." spinner at the bottom.

---

## MyVideo — `/:username/video` (protected, owner-only)

**File:** `MyVideo.jsx`

The user's private video workspace for managing uploads and viewing all personal videos.

### Access control

- Loader while auth resolves; redirect to `/login` if unauthenticated.
- **Owner check:** if the `:username` param ≠ the logged-in user's username, a "Forbidden" screen is shown with a button back to the user's own videos.

### Data Sources

- **Pinned videos**: `GET /video/me/pinned` (max 4 items, ordered by `pin_order`)
- **All videos**: `GET /video/me` with cursor-based pagination, filtered to exclude pinned items

### Sections

1. **Pinned** — up to 4 pinned videos in a responsive grid.
2. **Videos** — all unpinned videos in a grid with infinite scroll loading.

### Per-video owner actions

Each video card displays owner-only actions via a hover-triggered dropdown menu (⋮ button, top-right):

- **Edit** → opens `EditVideoModal` to update title, description, and visibility. Submits `PATCH /video/{id}` with the three fields.
- **Delete** → shows `ConfirmModal` for confirmation, then calls `DELETE /video/{id}` to remove the video.
  - Deleted videos are removed from both pinned and main grids.

### Modal dialogs

- **EditVideoModal**: For editing video metadata (title, description, visibility). Shows thumbnail preview, title input, description textarea, and Private/Public toggle.
- **ConfirmModal**: For delete confirmation. Shows the video title and allows user to confirm or cancel.

### Other features

- **Upload**: `UploadVideoModal` can be minimized to continue in the background.
- **Status polling**: Monitors videos in `processing` state (transcoding) across both pinned and main lists. Polls every 4 seconds and updates progress.
- **Infinite scroll**: Loads more unpinned videos as user scrolls down.

---

## Watch — `/watch/:shortId`

**File:** `Watch.jsx`

Video player page for streaming and watching a single video.

- Fetches video metadata via `GET /video/info/{short_id}`.
- Uses [Plyr](https://plyr.io/) as the HTML5 video player.
- Streams the video via `GET /video/r/{short_id}` (supports HTTP 206 Range requests for scrubbing).
- Private videos require authentication (cookie/header auth handled by `api.js`).
- Plyr accent color is set to match the GitmeRiz violet theme via CSS variable `--plyr-color-main`.
### Page Layout

1. **Video player** — Plyr-based player with controls for play, scrubbing, fullscreen, download, etc.
2. **Title** — Display name with a 3-dot menu (owner-only, non-owner viewers see just the title).
3. **Owner actions** (owner-only) — 3-dot vertical menu with a single "Edit" item that opens `EditVideoModal` to update title, description, and visibility.
4. **Uploader info** (owner-only for now) — Avatar circle (initials fallback) + uploader name below the title. *Note: Non-owner viewing shows no byline unless the API embeds uploader info in the metadata response; this is a backend feature limitation.*
5. **Description** — Shows description text in a styled card with a date-created line (format: "27 July, 2026"), or "No description" placeholder if empty.
   - Date created is sourced from the `created_at` field on the video item (ISO 8601 format).

---

## MyAudio — `/:username/audio` (protected, owner-only)

**File:** `MyAudio.jsx`

The user's private audio workspace for managing uploads and viewing all personal audio items.

### Access control

- Loader while auth resolves; redirect to `/login` if unauthenticated.
- **Owner check:** if the `:username` param ≠ the logged-in user's username, a "Forbidden" screen is shown with a button back to the user's own audio.

### Data Sources

- **Pinned audio**: `GET /audio/me/pinned` (max 8 items, ordered by `pin_order`)
- **All audio**: `GET /audio` (fetches all items, filtered to current user and excludes pinned items)

### Sections

1. **Pinned** — up to 8 pinned audio items in a responsive grid. Always rendered: if empty, shows a dashed-border placeholder with message "No pinned audio. Click the Pin option on any audio card below to feature it here."
2. **Divider** — Always visible between Pinned and Audio sections. Uses `border-light-card-border dark:border-dark-card-border border-t-2 my-10` styling.
3. **Audio** — All unpinned audio items in a grid.

### Per-audio owner actions

Each audio card displays owner-only actions via a hover-triggered dropdown menu (⋮ button, top-right):

- **Edit** → opens `EditAudioModal` to update title, description, and visibility. Submits `PATCH /audio/{id}` with the three fields.
- **Delete** → shows `ConfirmModal` for confirmation, then calls `DELETE /audio/{id}` to remove the audio.
  - Deleted audio items are removed from both pinned and main grids.
- **Pin/Unpin** → `PATCH /audio/{id}` with `{ pinned: true/false }` (enforces the 8-pin limit client-side with modal feedback).
- **Reorder pins** → `PATCH /audio/reorder-pins` (drag-and-drop via drag handle on pinned items).

### Modal dialogs

- **EditAudioModal**: For editing audio metadata (title, description, visibility). Shows cover art (with music note placeholder if no thumbnail), title input, description textarea, and Private/Public toggle.
- **ConfirmModal**: For delete confirmation, pin limit warning, and generic alerts.

### Empty states

- **No audio at all** (both pinned and unpinned empty): Shows full "No audio yet" empty state with prompt to upload.
- **Only pinned audio**: Pinned section displays pinned items, divider shows, Audio section displays "No other audio." (not the full empty state).

### Other features

- **Upload**: `UploadAudioModal` can be minimized to continue in the background.

---

## Listen — `/listen/:shortId`

**File:** `Listen.jsx`

Audio player page for streaming and listening to a single audio track.

- Fetches audio metadata via `GET /audio/info/{short_id}`.
- Renders cover art (thumbnail) if available, else shows a music note placeholder.
- Audio player using native HTML5 `<audio>` element with full browser controls.
- Streams the audio via `GET /audio/download/{short_id}`.
- Private audio requires authentication (cookie/header auth handled by `api.js`).

### Page Layout

1. **Cover art** — Displays audio thumbnail (aspect square) with fallback placeholder.
   - **For owners** (multiple cover art): Shows an interactive carousel using `AudioCoverCarousel` component:
     - **Swipe/drag gestures**: Swipe left/right (or click-and-drag on desktop) to browse through cover art.
     - **Keyboard navigation**: Arrow keys (← / →) also work.
     - **Click-to-preview**: Click the current cover art image to open a full-size preview modal with zoom and pan support.
     - **Infinite loop**: Seamlessly wraps around at the start/end of the thumbnail list.
     - **No UI controls visible**: Arrows, slide counter, and dot indicators have been removed for a clean look. Interactions are gesture-driven and keyboard-friendly.
   - **For non-owners** (or single thumbnail): Shows a static single image (no carousel).
2. **Audio player** — Native HTML5 audio element with browser-default controls.
3. **Title** — Display name with a 3-dot menu (owner-only).
4. **Owner actions** (owner-only) — 3-dot vertical menu with a single "Edit" item that opens `EditAudioModal` to update title, description, and visibility.
5. **Uploader info** (owner-only for now) — Avatar circle (initials fallback) + uploader name below the title. *Note: Non-owner viewing shows no byline unless the API embeds uploader info in the metadata response; this is a backend feature limitation.*
6. **Description** — Shows description text in a styled card with a date-created line (format: "27 July, 2026"), or "No description" placeholder if empty.
   - Date created is sourced from the `created_at` field on the audio item (ISO 8601 format).
