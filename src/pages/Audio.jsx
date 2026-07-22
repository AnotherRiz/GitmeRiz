import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { get } from '../lib/api'
import AudioCard from '../components/AudioCard'

/**
 * Public audio feed page.
 * Fetches all public audio items from GET /audio/public and renders them in a grid.
 */
function Audio() {
  const { loading: authLoading } = useAuth()
  const [audioItems, setAudioItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const isMountedRef = useRef(true)

  const fetchAudio = async () => {
    setLoading(true)
    try {
      const res = await get('/audio/public')

      if (!isMountedRef.current) return

      if (res.ok) {
        // Handle both array and paginated responses
        const items = Array.isArray(res.data) ? res.data : res.data.items || []
        setAudioItems(items)
        setError('')
      } else {
        setError(res.error || 'Failed to fetch audio.')
      }
    } catch (err) {
      console.error('Error fetching audio:', err)
      if (isMountedRef.current) {
        setError('Network error. Please try again.')
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }

  // Initial fetch
  useEffect(() => {
    if (authLoading) return
    fetchAudio()
  }, [authLoading])

  // Cleanup: mark component as unmounted
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <p className="opacity-60">Loading...</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-24">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Audio</h1>
          <p className="text-sm opacity-60 mt-1">Explore all public audio on the platform.</p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm px-4 py-3 rounded-xl mb-8">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square w-full rounded-xl bg-neutral-200 dark:bg-neutral-800" />
              <div className="mt-2 h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : audioItems.length === 0 ? (
        /* Empty state */
        <div className="text-center py-20 bg-light-card dark:bg-dark-card border border-light-card-border dark:border-dark-card-border rounded-2xl p-8">
          <svg className="w-12 h-12 text-neutral-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <h3 className="font-semibold text-lg">No audio yet</h3>
          <p className="text-sm text-neutral-500 mt-1">Public audio will appear here once uploaded.</p>
        </div>
      ) : (
        /* Audio grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {audioItems.map((audio) => (
            <AudioCard key={audio.id} audio={audio} />
          ))}
        </div>
      )}
    </div>
  )
}

export default Audio
