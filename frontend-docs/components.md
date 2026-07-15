# Components

Reference for the reusable components in `src/components/`. All are functional components using hooks, one per file, exported as default.

---

## Navbar

**File:** `Navbar.jsx`

Top navigation bar shown when logged out or on the Home page.

- Brand link ("Riz") to `/`.
- `Home` link, plus two `NavDropdown` menus: **Media** (Gallery, Video, Audio) and **Workspace** (Blog, Notes, Clipboard).
- When authenticated, renders `UserDropdown`; otherwise a `Login` link.
- Theme toggle button (sun/moon icon) wired to `useTheme()`.

No props. Consumes `useAuth()` and `useTheme()`.

---

## FloatingDock

**File:** `FloatingDock.jsx`

A floating, centered bottom dock for authenticated navigation.

- **Hidden** when the user is logged out **or** on the Home page (`/`).
- Links: Home, Dashboard, Gallery, My Gallery (`/{username}/gallery`).
- Active route is highlighted via an `isActive(path)` helper (handles the dynamic My Gallery path).
- Includes a theme toggle and a logout button.

No props. Consumes `useAuth()`, `useTheme()`, and `useLocation()`.

---

## NavDropdown

**File:** `NavDropdown.jsx`

Generic hover/click dropdown used in the `Navbar`.

**Props:**

| Prop | Type | Description |
| --- | --- | --- |
| `label` | `string` | Trigger button text |
| `items` | `{ label, to }[]` | Menu links |

Behavior:

- Opens on hover (with a 120ms close delay) and toggles on click.
- Closes on outside click (`mousedown` listener + `useRef`).
- Animated with Tailwind (`opacity`/`scale`), uses `pointer-events-none` when closed.
- Accessible: `aria-haspopup`, `aria-expanded`.

---

## UserDropdown

**File:** `UserDropdown.jsx`

Avatar button showing the user's initials, opening a menu with name, email, and logout.

- Derives initials from `user.name` (first letters of up to two words).
- Closes on outside click.
- No props; consumes `useAuth()`.

---

## EditNameModal

**File:** `EditNameModal.jsx`

Modal for renaming a gallery image's title.

**Props:**

| Prop | Type | Description |
| --- | --- | --- |
| `isOpen` | `boolean` | Controls visibility |
| `onClose` | `() => void` | Close handler |
| `image` | `object` | The gallery item being edited |
| `onSuccess` | `(updatedImage) => void` | Called with the server's updated item |

Behavior:

- Pre-fills the input with `image.title` on open.
- Validates non-empty title; Save is disabled if unchanged or empty.
- Submits `PATCH /gallery/{id}` with `{ title }` using the unified update endpoint.
- Closes on Esc (when not saving) and on backdrop click.

---

## UploadModal

**File:** `UploadModal.jsx`

The image upload experience: multi-file selection, drag & drop, paste, per-file thumbnails, parallel upload with progress, and minimize-to-background.

**Props:**

| Prop | Type | Description |
| --- | --- | --- |
| `isOpen` | `boolean` | Whether the modal is open |
| `isMinimized` | `boolean` | Whether it's minimized during an active upload |
| `onClose` | `() => void` | Fully close the modal |
| `onSuccess` | `(itemOrItems) => void` | Called per successful upload with the created item(s) |
| `onMinimize` | `() => void` | Minimize while an upload runs in the background |

Highlights (see [Features](./features.md#upload-uploadmodal) for detail):

- Accepts up to 50 files, max 100MB each; validates extensions.
- Client-side thumbnail generation via a concurrency-limited queue (max 3).
- Uploads run in parallel with `XMLHttpRequest` progress events.
- Fade in/out animation mirroring `ImageModal`.
- **Paste-to-upload (Ctrl+V)** support with timestamped filenames.

---

## ImageModal

**File:** `ImageModal.jsx`

Full-screen image viewer with zoom, pan, download, and animated open/close.

**Props:**

| Prop | Type | Description |
| --- | --- | --- |
| `image` | `object` | Gallery item to display (needs `short_id`, `title`) |
| `onClose` | `() => void` | Close handler |

Highlights (see [Features](./features.md#image-viewer-imagemodal)):

- Loads the **preview** variant; verifies access with a `HEAD` request and shows friendly 401/403 screens.
- Zoom via buttons, mouse wheel, and double-click; grab-to-pan when zoomed with bounds clamping.
- **Download** button fetches the **raw** image (auth-aware) and triggers a browser download.
- Esc resets zoom first, then closes; body scroll is locked while open.

---

## ConfirmModal

**File:** `ConfirmModal.jsx`

Reusable modal dialog for confirmations and alerts with clean animations and keyboard support.

**Props:**

| Prop | Type | Description |
| --- | --- | --- |
| `isOpen` | `boolean` | Controls visibility |
| `onClose` | `() => void` | Close handler |
| `onConfirm` | `() => void` (optional) | Confirm handler; if omitted, modal acts as an alert (single button) |
| `title` | `string` | Modal title |
| `message` | `string` | Modal body text |
| `tip` | `string` (optional) | Optional tip text in smaller gray font |
| `confirmText` | `string` | Confirm button text (default: "Confirm") |
| `cancelText` | `string` | Cancel button text (default: "Cancel") |
| `variant` | `'default' \| 'danger'` | Button style variant (default: "default") |

**Features:**
- **Two modes**: Confirmation (two buttons) when `onConfirm` is provided, or Alert (single "Got it" button) when omitted
- **Keyboard support**: Esc to close, Enter to confirm (when applicable)
- **Animations**: Smooth fade + scale transitions (300ms) using opacity and transform
- **Backdrop click**: Closes on clicking outside the modal
- **Visual variants**: `default` (indigo) or `danger` (red) button styling
- **Auto-focus**: Confirm button is focused when modal opens

**Usage:**
```jsx
// Confirmation dialog
<ConfirmModal
  isOpen={isDeleteConfirmOpen}
  onClose={() => setIsDeleteConfirmOpen(false)}
  onConfirm={handleConfirmDelete}
  title="Delete Image"
  message={`Delete "${image.title}"?`}
  tip="Tip: Hold Shift while clicking delete to skip this confirmation."
  confirmText="Delete"
  cancelText="Cancel"
  variant="danger"
/>

// Alert dialog
<ConfirmModal
  isOpen={!!errorMessage}
  onClose={() => setErrorMessage(null)}
  title="Operation Failed"
  message={errorMessage}
  variant="default"
/>
```

---

## SortablePinnedCard

**File:** `SortablePinnedCard.jsx`

A single draggable card in the pinned Bento grid on `MyGallery`.

**Props:**

| Prop | Type | Description |
| --- | --- | --- |
| `img` | `object` | The pinned gallery item |
| `isVertical` | `boolean` | If `true`, the card spans two rows (`row-span-2`) |
| `getImageUrl` | `(img, type) => string` | Builds thumbnail/raw URLs |
| `onToggleVisibility` | `(img) => void` | Toggle public/private |
| `onOpenEdit` | `(img) => void` | Open the rename modal |
| `onTogglePin` | `(img) => void` | Unpin |
| `onDelete` | `(e, img) => void` | Delete with Shift+click skip support |
| `onOpenImage` | `(e, img) => void` | Open the image viewer |
| `onReprocess` | `(img) => void` | Retry failed processing |
| `onImageLoad` | `(e, id) => void` | Reports natural dimensions for orientation detection |

Behavior:

- Uses `useSortable` from `@dnd-kit/sortable`; drag listeners are attached to a dedicated handle (`setActivatorNodeRef`).
- **Drag Handle**: A hamburger icon (three horizontal lines) appears on hover at the top-left corner. Only this handle initiates drag operations.
- **Desktop**: MouseSensor with 6px activation distance allows quick drag from handle; plain clicks anywhere on card still open the image.
- **Mobile**: TouchSensor with 0ms delay and 5px tolerance; drag only from handle, rest of card remains scrollable and tappable.
- Visual feedback: Handle shows `cursor-grab` idle and `cursor-grabbing` when active.
- Hover reveals a bottom gradient with the title sliding up; hover also scales the card slightly.
- Renders processing spinner / failed-retry / active image based on `img.status`.
---

## VideoCard

**File:** `VideoCard.jsx`

Reusable video card component for displaying videos in grids (both public and private galleries).

**Props:**

| Prop | Type | Description |
| --- | --- | --- |
| `video` | `object` | The video object (`{ id, title, short_id, visibility, status, ... }`) |
| `showActions` | `boolean` | Default `false`. If `true`, displays owner action dropdown (Edit/Delete) |
| `onEdit` | `(video) => void` | Called when Edit is clicked (only if `showActions` is true) |
| `onDelete` | `(video) => void` | Called when Delete is clicked (only if `showActions` is true) |

Behavior:

- Displays a **thumbnail** using the WebP preview (`/video/t/{short_id}`).
- **Visibility badge** (top-left): Shows a lock icon for private videos, an eye icon for public videos.
- **Hover play overlay**: A centered play button appears on hover (non-processing videos only).
- **Three-dot (⋮) actions button** (top-right, owner actions only):
  - Only renders when `showActions` is `true` and the video is not processing.
  - Hover-only visibility (appears on card hover), but stays visible once the menu is opened.
  - Dropdown menu with Edit and Delete options; both close the menu on click.
  - Stops click propagation so the Link to `/watch/:short_id` does NOT navigate.
  - Closes on outside click or Esc key.
- **Processing state**: Shows a spinning gear icon with a progress percentage while transcoding; card is locked (`pointer-events-none`) and no actions render.
- Video title is displayed below the thumbnail, truncated if longer than 60 characters.

---

## EditVideoModal

**File:** `EditVideoModal.jsx`

Modal for editing video metadata (title, description, visibility). Reuses the design and layout of `EditNameModal`.

**Props:**

| Prop | Type | Description |
| --- | --- | --- |
| `isOpen` | `boolean` | Controls visibility |
| `onClose` | `() => void` | Close handler |
| `video` | `object` | The video being edited (`{ id, short_id, title, description, visibility, ... }`) |
| `onSuccess` | `(updatedVideo) => void` | Called with the server's updated video object |

Behavior:

- **Thumbnail preview** (read-only): Displays the video's WebP thumbnail (`/video/t/{short_id}`). Image load errors are silently ignored.
- **Video Title** (required): Text input pre-filled with `video.title`. Non-empty validation; Save is disabled if empty or unchanged.
- **Description** (optional): Textarea pre-filled with `video.description`. Supports multi-line input.
- **Visibility toggle**: Private/Public buttons (styled like those in `UploadVideoModal`). Pre-filled with `video.visibility`.
- **Form submission**: Sends `PATCH /video/{id}` with `{ title, description, visibility }` (the unified video update endpoint).
- Closes on Esc key (when not saving) and on backdrop click.
- Shows inline error messages if submission fails or title is empty.
- Save button disabled while submitting.

