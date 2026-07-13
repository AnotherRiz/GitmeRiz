import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Plyr from 'plyr'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000'

/**
 * Video player page using Plyr.
 * Streams the video from GET /video/r/{short_id} which supports
 * HTTP 206 Partial Content for native scrubbing.
 */
function Watch() {
  const { shortId } = useParams()
  const navigate = useNavigate()
  const { loading: authLoading } = useAuth()
  const videoRef = useRef(null)
  const playerRef = useRef(null)
  const [videoTitle, setVideoTitle] = useState('')
  const [error, setError] = useState(false)

  // Video source URL (backend supports range requests)
  const videoSrc = `${BASE_URL}/video/r/${shortId}`
  const thumbnailSrc = `${BASE_URL}/video/t/${shortId}`

  // Initialize Plyr player
  useEffect(() => {
    let player = null
    let timer = null

    if (videoRef.current && !authLoading) {
      // Small delay to ensure DOM is fully ready and settled after React's render/mount cycle
      timer = setTimeout(() => {
        if (!videoRef.current) return

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
            'fullscreen',
          ],
          settings: ['quality', 'speed'],
          speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
          keyboard: { focused: true, global: true },
          tooltips: { controls: true, seek: true },
        })

        playerRef.current = player

        // Handle player errors
        player.on('error', () => {
          setError(true)
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
  }, [shortId, authLoading])

  // Set page title from shortId (simple approach)
  useEffect(() => {
    setVideoTitle(shortId)
  }, [shortId])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <p className="opacity-60">Loading...</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-neutral-500 hover:text-light-text dark:hover:text-dark-text transition-colors mb-6"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* Error state */}
      {error && (
        <div className="text-center py-20 bg-light-card dark:bg-dark-card border border-light-card-border dark:border-dark-card-border rounded-2xl p-8 mb-6">
          <svg className="w-12 h-12 text-red-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="font-semibold text-lg">Unable to play video</h3>
          <p className="text-sm text-neutral-500 mt-1">
            The video may be private, still processing, or unavailable.
          </p>
        </div>
      )}

      {/* Video player container */}
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
        <h1 className="text-xl font-bold text-light-text dark:text-dark-text">
          {videoTitle}
        </h1>
      </div>
    </div>
  )
}

export default Watch
