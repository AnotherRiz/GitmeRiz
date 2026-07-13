import { useState, useEffect, useRef } from 'react'
import { Navigate, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { get } from '../lib/api'
import { fetchVideoStatuses } from '../lib/videoPolling'
import VideoCard from '../components/VideoCard'

/**
 * User's personal video dashboard page.
 * Displays pinned videos (max 4) and a main feed with cursor-based pagination.
 * Polls for processing status updates on transcoding videos.
 */
function MyVideo() {
  const { username } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  // Pinned videos state
  const [pinnedVideos, setPinnedVideos] = useState([])

  // Main feed state
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [cursor, setCursor] = useState(null)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState('')

  const sentinelRef = useRef(null)
  const isMountedRef = useRef(true)

  // Fetch pinned videos
  const fetchPinnedVideos = async () => {
    try {
      const res = await get('/video/me/pinned')
      if (res.ok && isMountedRef.current) {
        setPinnedVideos(res.data || [])
      }
    } catch (err) {
      console.error('Error fetching pinned videos:', err)
    }
  }

  // Fetch main video feed with pagination
  const fetchMyVideos = async (isLoadMore = false) => {
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

      const res = await get(`/video/me?${params.toString()}`)

      if (!isMountedRef.current) return

      if (res.ok) {
        const { items, next_cursor } = res.data
        // Filter out pinned videos from the main feed
        const unpinnedItems = items.filter((v) => !v.pinned)

        setVideos((prev) => isLoadMore ? [...prev, ...unpinnedItems] : unpinnedItems)
        setCursor(next_cursor)
        setHasMore(next_cursor !== null)
        setError('')
      } else {
        setError(res.error || 'Failed to fetch your videos.')
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
      fetchMyVideos(true)
    }
  }

  // Load videos on mount
  useEffect(() => {
    if (authLoading || !user) return
    fetchMyVideos(false)
    fetchPinnedVideos()
  }, [authLoading, user])

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

  // Poll processing video statuses (every 4 seconds)
  useEffect(() => {
    const safePinned = Array.isArray(pinnedVideos) ? pinnedVideos : []
    const safeVideos = Array.isArray(videos) ? videos : []

    const allVideos = [...safePinned, ...safeVideos]
    const processingIds = allVideos
      .filter((v) => v.status === 'processing')
      .map((v) => v.id)

    if (processingIds.length === 0) return

    const intervalId = setInterval(async () => {
      // Pause polling when tab is hidden
      if (document.hidden) return

      if (!isMountedRef.current) {
        clearInterval(intervalId)
        return
      }

      const statusMap = await fetchVideoStatuses(processingIds)
      if (Object.keys(statusMap).length === 0) return

      if (!isMountedRef.current) return

      // Update pinned videos with new statuses
      setPinnedVideos((prev) =>
        prev.map((v) =>
          statusMap[v.id] && statusMap[v.id] !== v.status
            ? { ...v, status: statusMap[v.id] }
            : v
        )
      )

      // Update main feed videos with new statuses
      setVideos((prev) =>
        prev.map((v) =>
          statusMap[v.id] && statusMap[v.id] !== v.status
            ? { ...v, status: statusMap[v.id] }
            : v
        )
      )
    }, 4000)

    return () => {
      clearInterval(intervalId)
    }
  }, [videos, pinnedVideos])

  // Auth guard
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <p className="opacity-60">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Only the owner may view their own video page
  if (user.username !== username) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-3xl font-bold mb-4">Forbidden</h1>
        <p className="text-lg opacity-80 mb-8">You can only view your own videos.</p>
        <button
          onClick={() => navigate(`/${user.username}/video`)}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
        >
          Go to My Videos
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-24">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Videos</h1>
          <p className="text-sm opacity-60 mt-1">Manage your uploaded videos.</p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm px-4 py-3 rounded-xl mb-8">
          {error}
        </div>
      )}

      {/* Pinned Videos Section */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-violet-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5 5a2 2 0 012-2h6a2 2 0 012 2v2a2 2 0 01-2 2H7a2 2 0 01-2-2V5z" />
            <path d="M8 12h4v5l-2 2-2-2v-5z" />
          </svg>
          <h2 className="text-lg font-semibold">Pinned</h2>
          <span className="text-xs text-neutral-500">({pinnedVideos.length}/4)</span>
        </div>

        {pinnedVideos.length === 0 ? (
          <div className="bg-light-card dark:bg-dark-card border border-light-card-border dark:border-dark-card-border border-dashed rounded-2xl p-8 text-center">
            <svg className="w-8 h-8 text-neutral-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-neutral-500">Pin your favorite videos here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pinnedVideos.slice(0, 4).map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </div>

      {/* Main Video Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-video w-full rounded-xl bg-neutral-200 dark:bg-neutral-800" />
              <div className="mt-2 h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : videos.length === 0 && pinnedVideos.length === 0 ? (
        <div className="text-center py-20 bg-light-card dark:bg-dark-card border border-light-card-border dark:border-dark-card-border rounded-2xl p-8">
          <svg className="w-12 h-12 text-neutral-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <h3 className="font-semibold text-lg">No videos yet</h3>
          <p className="text-sm text-neutral-500 mt-1">Upload videos to get started.</p>
        </div>
      ) : videos.length > 0 ? (
        <>
          <h2 className="text-lg font-semibold mb-4">All Videos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </>
      ) : null}

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

export default MyVideo
