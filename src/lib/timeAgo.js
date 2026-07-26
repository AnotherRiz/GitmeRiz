/**
 * Convert a timestamp to a relative "time ago" string.
 * @param {string|number|Date} dateInput - ISO 8601 string, Unix timestamp (ms or s), or Date object
 * @returns {string} Relative time string (e.g., "3 hours ago", "just now")
 */
export function formatTimeAgo(dateInput) {
  if (!dateInput) return ''

  let date
  if (dateInput instanceof Date) {
    date = dateInput
  } else if (typeof dateInput === 'string') {
    date = new Date(dateInput)
  } else if (typeof dateInput === 'number') {
    // Assume milliseconds if > 10 billion, else seconds
    date = new Date(dateInput > 10000000000 ? dateInput : dateInput * 1000)
  } else {
    return ''
  }

  if (isNaN(date.getTime())) {
    return ''
  }

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffMonths / 12)

  if (diffSecs < 60) {
    return 'just now'
  } else if (diffMins < 60) {
    return diffMins === 1 ? '1 minute ago' : `${diffMins} minutes ago`
  } else if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`
  } else if (diffDays < 30) {
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`
  } else if (diffMonths < 12) {
    return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`
  } else {
    return diffYears === 1 ? '1 year ago' : `${diffYears} years ago`
  }
}
