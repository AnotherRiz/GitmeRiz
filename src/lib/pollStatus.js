import { post } from './api'

/**
 * Batch-check the status of the given gallery item IDs.
 * @param {number[]} ids - IDs of items currently in "processing".
 * @returns {Promise<Record<number, string>>} map of { id: status }, or {} on failure.
 */
export async function fetchStatuses(ids) {
  if (!ids || ids.length === 0) return {}

  const res = await post('/gallery/status', { ids })
  if (res.ok && res.data) {
    return res.data // e.g. { "12": "active", "13": "processing" }
  }
  return {}
}
