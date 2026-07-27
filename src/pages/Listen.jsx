import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { get } from '../lib/api'
import EditAudioModal from '../components/EditAudioModal'
import AudioCoverCarousel from '../components/AudioCoverCarousel'
import { formatFullDate } from '../lib/timeAgo'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000'

/**
 * Audio player page.
 * Displays cover art (carousel if multiple), audio player, title with edit button, and description.
 * Uses short_id-based endpoints matching the Watch page pattern.
 */
function Listen() {
  const { shortId } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [audio, setAudio] = useState(null)
  const [errorType, setErrorType] = useState(null) // null, '401', '403', 'generic'
  const [loadingMetadata, setLoadingMetadata] = useState(true)
  const [editingAudio, setEditingAudio] = useState(null)
  const [thumbnails, setThumbnails] = useState([]) // Array of thumbnail objects with id
  const audioRef = useRef(null)
  const isMountedRef = useRef(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  // Get the audio stream URL (short_id endpoint)
  const getAudioUrl = () => {
    return `${BASE_URL}/audio/download/${shortId}`
  }

  // Fetch thumbnails for owner-only (for carousel display)
  const fetchThumbnails = async (audioId) => {
    const res = await get(`/audio/${audioId}/thumbnails`)

    if (res.ok && Array.isArray(res.data)) {
      setThumbnails(res.data)
    } else {
      setThumbnails([])
    }
  }

  // Close menu when clicking outside / on Esc
  useEffect(() => {
    // Close menu when clicking outside
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

  // Fetch audio metadata using short_id endpoint
  useEffect(() => {
    let active = true

    async function loadAudioDetails() {
      setLoadingMetadata(true)
      setErrorType(null)

      try {
        const res = await get(`/audio/info/${shortId}`)

        if (!active) return

        if (res.ok && res.data) {
          setAudio(res.data)
          // If user is the owner, fetch thumbnails for carousel
          if (user && res.data.user_id === user.id) {
            fetchThumbnails(res.data.id)
          }
        } else if (res.error?.includes('401')) {
          setErrorType('401')
        } else if (res.error?.includes('403')) {
          setErrorType('403')
        } else {
          setErrorType('generic')
        }
      } catch (_err) {
        if (!active) return
        setErrorType('generic')
      } finally {
        if (active) {
          setLoadingMetadata(false)
        }
      }
    }

    if (!authLoading) {
      loadAudioDetails()
    }

    return () => {
      active = false
    }
  }, [shortId, authLoading, user])

  // Cleanup ref
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Show loading screen
  if (authLoading || loadingMetadata) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <p className="opacity-60">Loading...</p>
      </div>
    )
  }

  return (
    <>
      {/* Error state: 401 Unauthorized */}
      {errorType === '401' && (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-light-body dark:bg-dark-body text-light-text dark:text-dark-text px-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-center">
            401 | Unauthorized Access
          </h1>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2.5 bg-light-navbar dark:bg-dark-navbar hover:opacity-80 text-light-text dark:text-dark-text rounded-lg font-semibold shadow-md transition-opacity text-sm"
          >
            Back to Home
          </button>
        </div>
      )}

      {/* Error state: 403 Forbidden */}
      {errorType === '403' && (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-light-body dark:bg-dark-body text-light-text dark:text-dark-text px-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-center">
            403 | Access Denied
          </h1>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2.5 bg-light-navbar dark:bg-dark-navbar hover:opacity-80 text-light-text dark:text-dark-text rounded-lg font-semibold shadow-md transition-opacity text-sm"
          >
            Back to Home
          </button>
        </div>
      )}

      {/* Error state: Generic / Not Found */}
      {errorType === 'generic' && (
        <div className="min-h-screen flex flex-col items-center justify-center bg-light-body dark:bg-dark-body">
          <div className="text-center py-20 bg-light-card dark:bg-dark-card border border-light-card-border dark:border-dark-card-border rounded-2xl p-8 max-w-md shadow-md">
            <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="font-bold text-2xl mb-2 text-light-text dark:text-dark-text">Unable to play audio</h2>
            <p className="text-sm text-neutral-500 mb-6">
              The audio may be private, unavailable, or doesn't exist.
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2.5 bg-neutral-600 hover:bg-neutral-700 text-white rounded-xl font-medium transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      )}

      {/* Audio player & metadata */}
      {!errorType && audio && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
          {/* Cover art (1st in order) */}
          {/* For owner: show infinite-loop carousel if multiple thumbnails, otherwise show primary or fallback */}
          {/* For non-owner: show single primary thumbnail or fallback */}
          {user && audio.user_id === user.id && thumbnails.length > 0 ? (
            <AudioCoverCarousel audioId={audio.id} thumbnails={thumbnails} />
          ) : (
            <div className="rounded-2xl overflow-hidden bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center mb-8 aspect-square max-w-md mx-auto">
              <img
                src={`${BASE_URL}/audio/t/${shortId}`}
                alt={audio.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none'
                }}
              />
              {/* Fallback icon if image doesn't load */}
              <svg className="w-24 h-24 text-neutral-500 dark:text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
          )}

          {/* Audio player (2nd in order) */}
          <div className="mb-8 bg-light-card dark:bg-dark-card border border-light-card-border dark:border-dark-card-border rounded-2xl p-6">
            <audio
              ref={audioRef}
              controls
              className="w-full"
              src={getAudioUrl()}
            >
              Your browser does not support the audio element.
            </audio>
          </div>

          {/* Title with 3-dot menu (3rd in order) */}
          <div className="mb-6 flex items-start justify-between gap-3">
            <h1 className="text-3xl font-bold text-light-text dark:text-dark-text">
              {audio.title}
            </h1>
            {user && audio.user_id === user.id && (
              <div className="relative flex-shrink-0" ref={menuRef}>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setMenuOpen((prev) => !prev)
                  }}
                  className="p-2 rounded-lg hover:bg-light-navbar dark:hover:bg-dark-navbar transition-colors"
                  title="Audio options"
                  aria-label="Audio options"
                >
                  <svg className="w-5 h-5 text-light-text dark:text-dark-text" fill="currentColor" viewBox="0 0 24 24">
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
                        setEditingAudio(audio)
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-light-body dark:hover:bg-dark-body transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Avatar + Name row */}
          {user && audio.user_id === user.id && (
            <div className="mb-6 flex items-center gap-2.5">
              {/* Avatar circle with initials fallback */}
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                {user.name
                  ? user.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)
                  : '?'}
              </div>
              <span className="text-sm font-medium text-light-text dark:text-dark-text">
                {user.name}
              </span>
            </div>
          )}

          {/* Description block (4th in order) */}
          <div className="bg-light-card dark:bg-dark-card border border-light-card-border dark:border-dark-card-border p-4 rounded-xl">
            {/* Date created line */}
            {audio.created_at && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                {formatFullDate(audio.created_at)}
              </p>
            )}
            {/* Description text */}
            {audio.description ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400 whitespace-pre-wrap">
                {audio.description}
              </p>
            ) : (
              <p className="text-sm text-neutral-500 dark:text-neutral-400 italic opacity-70">
                No description
              </p>
            )}
          </div>
        </div>
      )}

      {/* Edit Audio Modal */}
      <EditAudioModal
        isOpen={!!editingAudio}
        onClose={() => setEditingAudio(null)}
        audio={editingAudio}
        onSuccess={(updated) => {
          setAudio((prev) => ({ ...prev, ...updated }))
          setEditingAudio(null)
        }}
      />
    </>
  )
}

export default Listen
