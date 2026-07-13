import { post } from './api'

/**
 * Custom hook logic for polling video processing status.
 * Finds all videos with status === "processing" and polls
 * POST /video/status every 4 seconds until they transition to "active".
 *
 * @param {number[]} ids - IDs of videos currently in "processing".
 * @returns {Promise<Record<number, string>>} map of { id: status }, or {} on failure.
 */
export async function fetchVideoStatuses(ids) {
  if (!ids || ids.length === 0) return {}

  const res = await post('/video/status', { ids })
  if (res.ok && res.data) {
    return res.data // e.g. { "12": "active", "13": "processing" }
  }
  return {}
}
