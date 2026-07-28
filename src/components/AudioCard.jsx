import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { formatTimeAgo } from '../lib/timeAgo'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000'

/**
 * Reusable audio card component for audio grids.
 * Displays a thumbnail, title, and optionally a 3-dot actions menu.
 *
 * Props:
 *   - audio: The audio object
 *   - showActions (default false): Whether to show the edit/delete/pin dropdown menu
 *   - onEdit: Callback when Edit is clicked (only if showActions is true)
 *   - onDelete: Callback when Delete is clicked (only if showActions is true)
 *   - onTogglePin: Callback when Pin/Unpin is clicked (only if showActions is true)
 *   - disableLink (default false): When true, skip wrapping in <Link> for sortable contexts
 */
function AudioCard({ audio, showActions = false, onEdit, onDelete, onTogglePin, disableLink = false }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const isPrivate = audio.visibility === 'private'

  const getThumbnailUrl = () => {
    if (audio.thumbnail_path && audio.short_id) {
      return `${BASE_URL}/audio/t/${audio.short_id}`
    }
    return null
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }

    // Close menu on Esc key
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && menuOpen) {
        setMenuOpen(false)
      }
    }

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [menuOpen])

  const cardContent = (
    <div className="group relative">
      {/* Thumbnail or placeholder */}
      <div className="w-full aspect-square rounded-xl bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center mb-3 overflow-hidden relative">
        {getThumbnailUrl() ? (
          <img
            src={getThumbnailUrl()}
            alt={audio.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <svg className="w-12 h-12 text-neutral-500 dark:text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        )}

        {/* Visibility badge (top-left) */}
        {!showActions && (
          <div
            className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/60 text-white shadow-md"
            title={isPrivate ? "Private Audio" : "Public Audio"}
          >
            {isPrivate ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </div>
        )}

        {/* Hover play button overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="backdrop-blur-md bg-white/20 p-3.5 rounded-full transform scale-75 group-hover:scale-100 transition-transform duration-300">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Audio title and actions row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3
            className="font-semibold text-sm text-light-text dark:text-dark-text line-clamp-2"
            title={audio.title}
          >
            {audio.title}
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            {formatTimeAgo(audio.created_at)}
          </p>
        </div>

        {/* Actions dropdown button (always visible in title row for owner actions) */}
        {showActions && (
          <div
            className="relative flex-shrink-0"
            ref={menuRef}
          >
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setMenuOpen((prev) => !prev)
              }}
              className="p-1.5 rounded-lg hover:bg-light-navbar dark:hover:bg-dark-navbar text-light-text dark:text-dark-text transition-colors"
              title="Audio options"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>

            {/* Dropdown menu */}
            {menuOpen && (
              <div
                className="absolute top-10 right-0 z-30 bg-light-navbar dark:bg-dark-navbar border border-light-card-border dark:border-dark-card-border rounded-xl shadow-2xl py-1 min-w-[100px] text-light-text dark:text-dark-text"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
              >
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setMenuOpen(false)
                    onEdit?.(audio)
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-light-body dark:hover:bg-dark-body transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setMenuOpen(false)
                    onTogglePin?.(audio)
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-light-body dark:hover:bg-dark-body transition-colors"
                  title={audio.pinned ? 'Unpin audio' : 'Pin audio'}
                >
                  {audio.pinned ? 'Unpin' : 'Pin'}
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setMenuOpen(false)
                    onDelete?.(e, audio)
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-light-body dark:hover:bg-dark-body transition-colors"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )

  // When disableLink is true, return cardContent directly (no <Link> wrapper)
  // This is used by SortableAudioCard to handle click navigation itself
  if (disableLink) {
    return cardContent
  }

  return (
    <Link
      to={`/listen/${audio.short_id}`}
      className="block"
    >
      {cardContent}
    </Link>
  )
}

export default AudioCard
