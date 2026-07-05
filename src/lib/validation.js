/**
 * Shared validation helpers for auth forms.
 * 
 * All functions are pure (no side effects) and return:
 * - A string (error message) if validation fails
 * - null if validation passes
 * 
 * Rules match the backend API requirements (see api-docs/users.md)
 */

export function validateUsername(username) {
  if (!username) return 'Username is required.'
  if (username.length < 3 || username.length > 20)
    return 'Username must be 3-20 characters.'
  if (!/^[a-zA-Z0-9_]+$/.test(username))
    return 'Username may only contain letters, numbers, and underscore.'
  return null
}

export function validateName(name) {
  if (!name) return 'Name is required.'
  if (name.length < 2 || name.length > 50)
    return 'Name must be 2-50 characters.'
  return null
}

export function validateEmail(email) {
  if (!email) return 'Email is required.'
  if (email.length > 255) return 'Email must be at most 255 characters.'
  // Simple, permissive email check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return 'Please enter a valid email address.'
  return null
}

export function validatePassword(password) {
  if (!password) return 'Password is required.'
  if (password.length < 8) return 'Password must be at least 8 characters.'
  return null
}

/**
 * Optional non-blocking strength hint (used only for the recommendation message).
 * Returns a hint string if the password is weak, null otherwise.
 */
export function passwordStrengthHint(password) {
  if (!password) return null
  const hasUpper = /[A-Z]/.test(password)
  const hasDigit = /[0-9]/.test(password)
  if (!hasUpper || !hasDigit)
    return 'Tip: use at least 1 uppercase letter and 1 digit for a stronger password.'
  return null
}
