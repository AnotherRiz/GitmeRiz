/**
 * Short ID helpers.
 *
 * The backend provides a unique 8-character `short_id` for every gallery image.
 * These helpers are kept for potential future client-side ID transformations,
 * but currently we use the backend's short_id directly.
 */

/**
 * Returns the short_id from a gallery item.
 * The backend generates this; we just pass it through.
 */
export function getShortId(galleryItem) {
  return galleryItem?.short_id || null
}
