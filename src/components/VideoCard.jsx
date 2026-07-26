import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { formatTimeAgo } from '../lib/timeAgo'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000'

/**
 * Reusable video card component for video grids.
 * Displays a thumbnail, duration badge, visibility icon, hover play overlay,
 * and a processing skeleton when the video is still being transcoded.
 *
 * Props:
 *   - video: The video object
 *   - showActions (default false): Whether to show the edit/delete/pin dropdown menu
 *   - onEdit: Callback when Edit is clicked (only if showActions is true)
 *   - onDelete: Callback when Delete is clicked (only if showActions is true)
 *   - onTogglePin: Callback when Pin/Unpin is clicked (only if showActions is true)
 *   - disableLink (default false): When true, skip wrapping in <Link> for sortable contexts
 */
function VideoCard({ video, showActions = false, onEdit, onDelete, onTogglePin, disableLink = false }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const isProcessing = video.status === 'processing' || video.status.startsWith('processing:')
  const progress = video.status.startsWith('processing:')
    ? parseInt(video.status.split(':')[1])
    : (video.processing_progress !== undefined ? video.processing_progress : 0);
  const isPrivate = video.visibility === 'private'
  const displayTitle = video.title || video.original_filename || 'Untitled Video'

  const thumbnailUrl = `${BASE_URL}/video/t/${video.short_id}`

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
      {/* Thumbnail container */}
      <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-900 relative">
        {/* Thumbnail image */}
        {!isProcessing && (
          <img
            src={thumbnailUrl}
            alt={displayTitle}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              e.target.style.display = 'none'
            }}
          />
        )}

        {/* Processing overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center z-20">
            <div className="relative w-10 h-10 mb-3">
              {/* Spinning gear icon */}
              <svg
                className="w-10 h-10 text-violet-400 animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <span className="text-xs text-violet-300 font-medium">
              Transcoding video... {progress > 0 ? `${progress}%` : ''}
            </span>
          </div>
        )}

        {/* Visibility badge (top-left) */}
        {!isProcessing && (
          <div
            className="absolute top-2 left-2 z-10 p-1.5 rounded-lg bg-black/60 text-white shadow-md"
            title={isPrivate ? "Private Video" : "Public Video"}
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

        {/* Hover play button overlay (only for active videos) */}
        {!isProcessing && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div className="backdrop-blur-md bg-white/20 p-3.5 rounded-full transform scale-75 group-hover:scale-100 transition-transform duration-300">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Video title and actions row */}
      <div className="mt-2 px-0.5 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3
            className="text-sm font-medium text-light-text dark:text-dark-text line-clamp-2"
            title={video.title || video.original_filename}
          >
            {displayTitle}
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            {formatTimeAgo(video.created_at)}
          </p>
        </div>

        {/* Actions dropdown button (always visible in title row for owner actions) */}
        {!isProcessing && showActions && (
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
              title="Video options"
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
                    onEdit?.(video)
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
                    onTogglePin?.(video)
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-light-body dark:hover:bg-dark-body transition-colors"
                  title={video.pinned ? 'Unpin video' : 'Pin video'}
                >
                  {video.pinned ? 'Unpin' : 'Pin'}
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setMenuOpen(false)
                    onDelete?.(e, video)
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

  // If processing, don't wrap in a link (card is locked)
  if (isProcessing) {
    return (
      <div className="pointer-events-none opacity-80">
        {cardContent}
      </div>
    )
  }

  // When disableLink is true, return cardContent directly (no <Link> wrapper)
  // This is used by SortableVideoCard to handle click navigation itself
  if (disableLink) {
    return cardContent
  }

  return (
    <Link to={`/watch/${video.short_id}`} className="block">
      {cardContent}
    </Link>
  )
}

export default VideoCard
