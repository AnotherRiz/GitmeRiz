import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  validateName,
  validateUsername,
  validateEmail,
  validatePassword,
  passwordStrengthHint,
} from '../lib/validation'

function Register() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    // Clear errors when user edits
    if (error) setError('')
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Field-level validation using shared validators
    const errors = {}
    const nameError = validateName(form.name)
    const usernameError = validateUsername(form.username)
    const emailError = validateEmail(form.email)
    const passwordError = validatePassword(form.password)

    if (nameError) errors.name = nameError
    if (usernameError) errors.username = usernameError
    if (emailError) errors.email = emailError
    if (passwordError) errors.password = passwordError

    // Client-side password match check (confirmPassword never sent to API)
    if (form.password && form.confirmPassword && form.password !== form.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.'
    }
    if (!form.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password.'
    }

    // If any validation failed, show errors and do not call API
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setError('Please fix the errors below.')
      return
    }

    setFieldErrors({})
    setError('')
    setSubmitting(true)

    const result = await register({
      name: form.name,
      username: form.username,
      email: form.email,
      password: form.password,
    })
    setSubmitting(false)

    if (result.ok) {
      navigate('/login')
    } else {
      setError(result.error)
    }
  }

  const inputClass =
    'w-full rounded-lg bg-light-input dark:bg-dark-input border border-light-card-border dark:border-dark-card-border px-4 py-2.5 outline-none transition-all duration-200 focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500'

  const EyeIcon = ({ visible }) =>
    visible ? (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
      </svg>
    ) : (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    )

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-light-card-border dark:border-dark-card-border bg-light-card dark:bg-dark-card shadow-lg p-8">
        <h1 className="text-2xl font-semibold mb-6 text-center">Register</h1>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/40 text-red-500 text-sm px-4 py-2.5">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm mb-1.5">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              className={inputClass}
              placeholder="Name"
            />
            {fieldErrors.name && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>
            )}
          </div>

          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-sm mb-1.5">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              value={form.username}
              onChange={handleChange}
              className={inputClass}
              placeholder="Username"
            />
            {fieldErrors.username && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.username}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm mb-1.5">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              className={inputClass}
              placeholder="Email"
            />
            {fieldErrors.email && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange}
                className={`${inputClass} pr-11`}
                placeholder="Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 opacity-70 hover:opacity-100 transition-opacity"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <EyeIcon visible={showPassword} />
              </button>
            </div>
            {fieldErrors.password && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>
            )}
            {!fieldErrors.password && form.password && passwordStrengthHint(form.password) && (
              <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-1">
                {passwordStrengthHint(form.password)}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={handleChange}
                className={`${inputClass} pr-11`}
                placeholder="Confirm password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 opacity-70 hover:opacity-100 transition-opacity"
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                <EyeIcon visible={showConfirm} />
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          {/* Register button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 transition-all duration-200"
          >
            {submitting ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p className="text-sm text-center mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-500 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Register
