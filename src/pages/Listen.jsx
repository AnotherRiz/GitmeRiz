import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { get } from '../lib/api'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000'

/**
 * Audio player page.
 * Displays cover art, audio player, title, and description.
 */
function Listen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [audio, setAudio] = useState(null)
  const [errorType, setErrorType] = useState(null) // null, '401', '403', 'generic'
  const [loadingMetadata, setLoadingMetadata] = useState(true)
  const audioRef = useRef(null)
  const isMountedRef = useRef(true)

  // Get the cover art URL
  const getThumbnailUrl = () => {
    if (audio?.thumbnail_path) {
      return `${BASE_URL}/audio/${id}/thumbnail`
    }
    return null
  }

  // Get the audio stream URL
  const getAudioUrl = () => {
    return `${BASE_URL}/audio/${id}/download`
  }

  // Fetch audio metadata
  useEffect(() => {
    let active = true

    async function loadAudioDetails() {
      setLoadingMetadata(true)
      setErrorType(null)

      try {
        const res = await get(`/audio/${id}`)

        if (!active) return

        if (res.ok && res.data) {
          setAudio(res.data)
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
  }, [id, authLoading, user])

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
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
          {/* Cover art */}
          <div className="rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mb-8 aspect-square max-w-md mx-auto">
            {getThumbnailUrl() ? (
              <img
                src={getThumbnailUrl()}
                alt={audio.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <svg className="w-24 h-24 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-light-text dark:text-dark-text mb-4 text-center">
            {audio.title}
          </h1>

          {/* Audio player */}
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

          {/* Description */}
          {audio.description && (
            <div className="bg-light-card dark:bg-dark-card border border-light-card-border dark:border-dark-card-border p-4 rounded-xl">
              <h2 className="font-semibold text-light-text dark:text-dark-text mb-2">Description</h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 whitespace-pre-wrap">
                {audio.description}
              </p>
            </div>
          )}
        </div>
      )}
    </>
  )
}

export default Listen
