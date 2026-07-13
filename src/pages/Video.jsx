import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { get } from '../lib/api'
import VideoCard from '../components/VideoCard'

/**
 * Public video feed page.
 * Fetches all public videos from GET /video/public with cursor-based pagination
 * and renders them in a responsive grid with infinite scroll.
 */
function Video() {
  const { loading: authLoading } = useAuth()
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [cursor, setCursor] = useState(null)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState('')
  const sentinelRef = useRef(null)
  const isMountedRef = useRef(true)

  const fetchVideos = async (isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMore(true)
    } else {
      setLoading(true)
      setVideos([])
      setCursor(null)
      setHasMore(true)
    }

    try {
      const params = new URLSearchParams()
      if (cursor && isLoadMore) params.set('cursor', cursor)
      params.set('limit', '20')

      const res = await get(`/video/public?${params.toString()}`)

      if (!isMountedRef.current) return

      if (res.ok) {
        const { items, next_cursor } = res.data

        setVideos((prev) => isLoadMore ? [...prev, ...items] : items)
        setCursor(next_cursor)
        setHasMore(next_cursor !== null)
        setError('')
      } else {
        setError(res.error || 'Failed to fetch videos.')
      }
    } catch (err) {
      console.error('Error fetching videos:', err)
      if (isMountedRef.current) {
        setError('Network error. Please try again.')
      }
    } finally {
      if (isMountedRef.current) {
        if (isLoadMore) {
          setLoadingMore(false)
        } else {
          setLoading(false)
        }
      }
    }
  }

  const loadNextPage = () => {
    if (!loadingMore && hasMore && cursor) {
      fetchVideos(true)
    }
  }

  // Initial fetch
  useEffect(() => {
    if (authLoading) return
    fetchVideos(false)
  }, [authLoading])

  // Cleanup: mark component as unmounted
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Infinite scroll with IntersectionObserver
  useEffect(() => {
    if (!hasMore || loading) return

    const el = sentinelRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && hasMore) {
          loadNextPage()
        }
      },
      { rootMargin: '200px' }
    )

    observer.observe(el)

    return () => {
      observer.disconnect()
    }
  }, [hasMore, loading, loadingMore, cursor])

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
          <h1 className="text-3xl font-bold">Videos</h1>
          <p className="text-sm opacity-60 mt-1">Explore all public videos on the platform.</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-video w-full rounded-xl bg-neutral-200 dark:bg-neutral-800" />
              <div className="mt-2 h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        /* Empty state */
        <div className="text-center py-20 bg-light-card dark:bg-dark-card border border-light-card-border dark:border-dark-card-border rounded-2xl p-8">
          <svg className="w-12 h-12 text-neutral-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <h3 className="font-semibold text-lg">No videos yet</h3>
          <p className="text-sm text-neutral-500 mt-1">Public videos will appear here once uploaded.</p>
        </div>
      ) : (
        /* Video grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-8">
          {loadingMore && (
            <div className="flex items-center gap-2 text-neutral-500">
              <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-sm">Loading more videos...</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Video
