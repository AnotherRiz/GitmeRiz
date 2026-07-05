# Features (Deep Dives)

Detailed explanations of the more involved features. For component props, see [Components](./components.md).

---

## Infinite Scroll Pagination

**Where:** `Gallery.jsx` and `MyGallery.jsx`

Both gallery pages use cursor-based pagination with infinite scroll to handle large datasets efficiently.

### Cursor-Based Pagination

The backend returns paginated responses with a cursor for the next page:

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

- Results are ordered by `id DESC` (newest first)
- `cursor` represents the ID of the last item on the current page
- When `next_cursor` is `null`, there are no more pages

### IntersectionObserver Implementation

A sentinel element is placed at the bottom of the image grid:

```jsx
// Infinite scroll sentinel
{hasMore && (
  <div ref={sentinelRef} className="flex justify-center py-8">
    {loadingMore && <LoadingSpinner />}
  </div>
)}
```

The observer triggers when the sentinel enters the viewport:

```js
useEffect(() => {
  if (!hasMore || loading) return
  
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && !loadingMore && hasMore) {
        loadNextPage()
      }
    },
    { rootMargin: '200px' } // Trigger 200px before sentinel is visible
  )

  observer.observe(sentinelRef.current)
  return () => observer.disconnect()
}, [hasMore, loading, loadingMore, cursor])
```

### State Management

Each page maintains:
- `images`: Current list of items
- `cursor`: Next page cursor from the last response  
- `hasMore`: Whether more pages are available
- `loading`: Initial page loading
- `loadingMore`: Next page loading

Items are appended using functional updates to avoid stale closures:

```js
setImages((prev) => isLoadMore ? [...prev, ...items] : items)
```

### MyGallery Specifics

MyGallery has two separate data sources:
- **Pinned images**: `GET /gallery/me/pinned` (no pagination, max 8 items)  
- **Unpinned images**: `GET /gallery/me` with pagination (filtered to exclude pinned items)

---

## Pinned Bento Grid

**Where:** `MyGallery.jsx` + `SortablePinnedCard.jsx`

A responsive, drag-reorderable grid of up to 8 pinned images.

### Layout

- CSS grid: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`, `auto-rows-[11rem]`, `grid-flow-row-dense`.
- **Vertical images span two rows** (`row-span-2`), producing the Bento effect.

### Orientation detection

The backend does not expose image dimensions, so orientation is detected client-side. Each thumbnail's `onLoad` reports natural dimensions:

```js
const handleImageLoad = (e, imgId) => {
  const isVertical = e.target.naturalHeight > e.target.naturalWidth
  setImageOrientation((prev) => ({ ...prev, [imgId]: isVertical }))
}
```

`isVertical` is passed to `SortablePinnedCard`, which conditionally applies `row-span-2`.

### 8-pin limit

Enforced client-side before calling the API:

```js
if (!img.pinned) {
  const pinnedCount = images.filter((i) => i.pinned).length
  if (pinnedCount >= 8) { alert('You can pin up to 8 images. Unpin one first.'); return }
}
```

The backend also enforces this (returns `400` on the 9th pin).

### Drag-and-drop reordering

Built with `@dnd-kit`:

- `DndContext` uses `closestCenter` collision detection and the `restrictToParentElement` modifier (from `@dnd-kit/modifiers`) to keep the dragged card inside the grid and **prevent horizontal viewport expansion**.
- Sensors: `PointerSensor` (6px activation distance so clicks still open the image), `TouchSensor` (150ms delay), and `KeyboardSensor`.
- `SortableContext` with `rectSortingStrategy`.

Order is tracked in a `pinnedOrder` state array of ids:

- Seeded from the backend's `pin_order` field (sorted ascending) whenever images change.
- On drag end, `arrayMove` computes the new order, state updates optimistically, and the order is persisted:

```js
const res = await api('/gallery/reorder-pins', {
  method: 'PATCH',
  body: JSON.stringify({ ordered_ids: newOrder }),
})
if (!res.ok) { setPinnedOrder(previousOrder) /* revert */ }
```

### Hover interactions

Each card scales slightly and lifts its shadow on hover; a bottom gradient fades in and the title slides up. Grab cursor is `grab` idle and `grabbing` while dragging.

---

## Upload (UploadModal)

**Where:** `UploadModal.jsx`

### Selection methods

Three ways to add files, all funneling into `handleAddFiles`:

1. **Browse** — hidden file input triggered by clicking the drop zone.
2. **Drag & drop** — dashed drop zone with an active highlight state.
3. **Paste (Ctrl+V)** — see [Paste-to-Upload](#paste-to-upload-ctrlv).

### Validation

- Max **50** files per batch.
- Max **100MB** per file.
- Allowed extensions: `jpg, jpeg, png, gif, webp, heic, heif, svg, raw, cr2, nef, dng`.

### Thumbnail generation (performance)

Thumbnails are generated client-side for instant previews, using a concurrency-limited queue to avoid CPU spikes on bulk uploads:

- `generateThumbnail(file)` uses `URL.createObjectURL` (not `FileReader`/Base64), draws to a canvas resized to max 200×200, and exports JPEG at 70% quality.
- A `ThumbnailQueue` class caps generation at **3 concurrent** tasks.
- Object URLs are revoked after use and on component unmount to prevent memory leaks.

### Parallel upload with progress

- Each file uploads via its own `XMLHttpRequest` so `upload.progress` events can drive per-file and aggregate progress bars.
- All uploads run in parallel via `Promise.allSettled`.
- Per-file status: `pending` → `uploading` → `success` / `error`.
- Accepts both `201` (sync) and `202` (async processing) responses.

### Minimize to background

While uploading, closing the modal **minimizes** it (instead of aborting): a compact progress widget appears bottom-right and uploads continue. A custom `reopenUploadModal` window event restores the full modal.

### Fade animation

Mirrors `ImageModal`: `modalIsOpen` / `isClosing` state flags drive `transition-opacity` (backdrop) and `transition-all` scale (panel) over 300ms.

### Paste-to-Upload (Ctrl+V)

A `paste` listener is attached to `window` while the modal is open (and not minimized):

1. **Ignore text fields** — if the active element is an `input`, `textarea`, or `contentEditable`, do nothing so normal text paste works (e.g. the title field).
2. **Filter image items** — iterate `e.clipboardData.items`, keep only `item.kind === 'file'` with `item.type` starting `image/`.
3. **Name the blob** — screenshots arrive without a filename, so a timestamped name is generated with millisecond precision for uniqueness:
   `image_YYYYMMDDHHMMSSmmm.<ext>` (extension derived from the MIME type, `jpeg`→`jpg`).
4. **Wrap as File** — `new File([blob], fileName, { type: blob.type })`, then hand off to `handleAddFiles([file])`.

> **Stale-closure note:** `handleAddFiles` appends with a functional state update (`setSelectedFiles(prev => [...prev, ...processed])`). This is required so rapid successive pastes don't overwrite each other by reading a stale `selectedFiles`.

---

## Image Viewer (ImageModal)

**Where:** `ImageModal.jsx`

### Access-checked loading

On open it issues a `HEAD` request to the **preview** URL (`/gallery/p/{short_id}`) with the auth header to detect access before rendering:

- `200` → display the preview image.
- `401` / `403` → friendly "Unauthorized" screen with a "Back to Home" button.
- other/failure → generic error.

### Zoom & pan

- **Zoom:** buttons (`+` / `-` / reset), mouse **wheel**, and **double-click** (toggles 1× ↔ 2×). Range is clamped to 1×–4×.
- **Pan:** grab-to-drag is enabled only when zoomed in (`scale > 1`). An anchor point (kept in a ref) computes the new position; movement is clamped to computed bounds so the image can't be dragged off-screen.
- Cursor reflects state: `default` at 1×, `grab` when zoomed, `grabbing` while dragging.

### Download (via dedicated endpoint)

A download button sits at the top of the zoom controls (above `+`). Uses the dedicated download endpoint `GET /gallery/d/{id}` which serves images with `Content-Disposition: attachment` for proper filename handling.

For **public images**, uses a direct link:
```js
const downloadUrl = `${BASE_URL}/gallery/d/${image.id}`
const a = document.createElement('a')
a.href = downloadUrl
a.download = '' // Browser uses original filename from Content-Disposition
```

For **private images**, downloads via authenticated fetch:
```js
const response = await fetch(downloadUrl, {
  credentials: 'include',
  headers: { Authorization: `Bearer ${token}` }
})
const blob = await response.blob()
// Create temp <a> with object URL, click, cleanup
```

- Preserves the original filename from the server's `Content-Disposition` header
- Shows a spinner while downloading; cleans up the object URL afterward
- Respects image visibility (auth required for private images)

### Open/close & UX

- Animated open/close (fade + scale) via `isOpen` / `isClosing`.
- **Esc** resets zoom first if zoomed in, otherwise closes.
- Clicking the backdrop (not the image) closes.
- Body scroll is locked while the modal is open and restored on unmount.

---

## Background Upload Processing & Status Polling

**Where:** `MyGallery.jsx` + `lib/pollStatus.js`

Uploads may return items in a `processing` state (`202 Accepted`) while the backend generates thumbnail/preview variants. The gallery polls for completion.

### Polling loop

An effect starts an interval when any item is `processing`:

```js
useEffect(() => {
  const processingIds = images.filter(i => i.status === 'processing').map(i => i.id)
  if (processingIds.length === 0) return

  const intervalId = setInterval(async () => {
    if (document.hidden) return                 // pause when tab is hidden
    const statusMap = await fetchStatuses(processingIds)  // batched: 1 request
    if (Object.keys(statusMap).length === 0) return       // retry next tick
    setImages(prev => prev.map(img =>
      statusMap[img.id] && statusMap[img.id] !== img.status
        ? { ...img, status: statusMap[img.id] } : img))
  }, 2000)

  return () => clearInterval(intervalId)
}, [images])
```

Key properties:

- **Batched:** one `POST /gallery/status` per tick for all processing items.
- **Bandwidth-friendly:** skips work while `document.hidden`.
- **Self-terminating:** the interval is torn down once nothing is processing.

### Status-based UI

Each gallery card renders by `img.status`:

- `processing` → spinner + "Processing..."
- `failed_processing` → error state with a **Retry** button (`POST /gallery/{id}/reprocess`, optimistically sets the item back to `processing`).
- otherwise (`active`) → the thumbnail, clickable to open the viewer.
