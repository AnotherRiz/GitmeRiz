import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Plyr from 'plyr'
import { useAuth } from '../contexts/AuthContext'
import { get } from '../lib/api'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000'

/**
 * Video player page using Plyr.
 * Streams the video from GET /video/r/{short_id} which supports
 * HTTP 206 Partial Content for native scrubbing.
 */
function Watch() {
  const { shortId } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const videoRef = useRef(null)
  const playerRef = useRef(null)
  const [video, setVideo] = useState(null)
  const [errorType, setErrorType] = useState(null) // null, '401', '403', 'generic'
  const [loadingMetadata, setLoadingMetadata] = useState(true)

  // Video source URL (backend supports range requests)
  const videoSrc = `${BASE_URL}/video/r/${shortId}`
  const thumbnailSrc = `${BASE_URL}/video/t/${shortId}`

  // Check access permissions and fetch video metadata
  useEffect(() => {
    let active = true

    async function loadVideoDetails() {
      setLoadingMetadata(true)
      setErrorType(null)

      // 1. Perform a lightweight HTTP check on the stream endpoint to check permissions
      try {
        const token = localStorage.getItem('token')
        const headers = {
          'Range': 'bytes=0-0',
        }
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }

        const checkRes = await fetch(`${BASE_URL}/video/r/${shortId}`, {
          method: 'GET',
          headers,
        })

        if (!active) return

        if (checkRes.status === 401) {
          setErrorType('401')
          setLoadingMetadata(false)
          return
        } else if (checkRes.status === 403) {
          setErrorType('403')
          setLoadingMetadata(false)
          return
        } else if (!checkRes.ok && checkRes.status !== 206 && checkRes.status !== 200) {
          setErrorType('generic')
          setLoadingMetadata(false)
          return
        }
      } catch (err) {
        if (!active) return
        setErrorType('generic')
        setLoadingMetadata(false)
        return
      }

      // 2. Fetch metadata from the new info endpoint
      try {
        const res = await get(`/video/info/${shortId}`)
        if (!active) return

        if (res.ok && res.data) {
          setVideo(res.data)
        } else {
          // Fallback if not found
          setVideo({
            title: shortId,
            description: '',
            short_id: shortId,
          })
        }
      } catch (err) {
        if (!active) return
        // Fallback on metadata fetch failure
        setVideo({
          title: shortId,
          description: '',
          short_id: shortId,
        })
      } finally {
        if (active) {
          setLoadingMetadata(false)
        }
      }
    }

    if (!authLoading) {
      loadVideoDetails()
    }

    return () => {
      active = false
    }
  }, [shortId, authLoading, user])

  // Initialize Plyr player
  useEffect(() => {
    let player = null
    let timer = null

    if (videoRef.current && !authLoading && !loadingMetadata && !errorType) {
      // Small delay to ensure DOM is fully ready and settled after React's render/mount cycle
      timer = setTimeout(() => {
        if (!videoRef.current) return

        const downloadUrl = `${BASE_URL}/video/download/${shortId}`

        player = new Plyr(videoRef.current, {
          controls: [
            'play-large',
            'play',
            'progress',
            'current-time',
            'duration',
            'mute',
            'volume',
            'settings',
            'pip',
            'airplay',
            'download',
            'fullscreen',
          ],
          urls: {
            download: downloadUrl,
          },
          settings: ['quality', 'speed'],
          speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
          keyboard: { focused: true, global: true },
          tooltips: { controls: true, seek: true },
        })

        playerRef.current = player

        // Force download button to download in the current window instead of opening a new tab
        player.on('ready', () => {
          const downloadBtn = videoRef.current?.closest('.plyr')?.querySelector('a[data-plyr="download"]')
          if (downloadBtn) {
            downloadBtn.removeAttribute('target')
            downloadBtn.setAttribute('download', '')
          }
        })

        // Handle player errors
        player.on('error', () => {
          setErrorType('generic')
        })
      }, 50)
    }

    return () => {
      if (timer) clearTimeout(timer)
      if (player) {
        player.destroy()
      }
      playerRef.current = null
    }
  }, [shortId, authLoading, loadingMetadata, errorType, video])

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
            <h2 className="font-bold text-2xl mb-2 text-light-text dark:text-dark-text">Unable to play video</h2>
            <p className="text-sm text-neutral-500 mb-6">
              The video may be private, still processing, or unavailable.
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

      {/* Video player & metadata */}
      {!errorType && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
          <div className="rounded-2xl overflow-hidden bg-black shadow-2xl">
            <video
              ref={videoRef}
              className="w-full"
              playsInline
              crossOrigin="use-credentials"
              poster={thumbnailSrc}
            >
              <source src={videoSrc} type="video/mp4" />
              Your browser does not support the video element.
            </video>
          </div>

          {/* Video info */}
          <div className="mt-6">
            <h1 className="text-2xl font-bold text-light-text dark:text-dark-text">
              {video?.title || shortId}
            </h1>
            {video?.description && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-3 whitespace-pre-wrap bg-light-card dark:bg-dark-card border border-light-card-border dark:border-dark-card-border p-4 rounded-xl">
                {video.description}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default Watch

