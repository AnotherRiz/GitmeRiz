import { useState, useEffect, useRef } from 'react'
import { Navigate, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { get, api } from '../lib/api'
import { fetchVideoStatuses } from '../lib/videoPolling'
import VideoCard from '../components/VideoCard'
import UploadVideoModal from '../components/UploadVideoModal'
import EditVideoModal from '../components/EditVideoModal'
import ConfirmModal from '../components/ConfirmModal'

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
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isUploadMinimized, setIsUploadMinimized] = useState(false)
  const [editingVideo, setEditingVideo] = useState(null)
  const [deletingVideo, setDeletingVideo] = useState(null)

  const sentinelRef = useRef(null)
  const isMountedRef = useRef(true)

  // Listen for reopen upload modal event
  useEffect(() => {
    const handleReopenUpload = () => {
      setIsUploadOpen(true)
      setIsUploadMinimized(false)
    }
    window.addEventListener('reopenUploadVideoModal', handleReopenUpload)
    return () => window.removeEventListener('reopenUploadVideoModal', handleReopenUpload)
  }, [])

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

  // Handle edit success - update video in both lists
  const handleEditSuccess = (updated) => {
    setVideos((prev) => prev.map((v) => (v.id === updated.id ? { ...v, ...updated } : v)))
    setPinnedVideos((prev) => prev.map((v) => (v.id === updated.id ? { ...v, ...updated } : v)))
  }

  // Handle delete confirm
  const handleConfirmDelete = async () => {
    if (!deletingVideo) return
    const res = await api(`/video/${deletingVideo.id}`, { method: 'DELETE' })
    if (res.ok) {
      setVideos((prev) => prev.filter((v) => v.id !== deletingVideo.id))
      setPinnedVideos((prev) => prev.filter((v) => v.id !== deletingVideo.id))
      setDeletingVideo(null)
    } else {
      setError(res.error || 'Failed to delete video.')
      setDeletingVideo(null)
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
      .filter((v) => v.status === 'processing' || v.status.startsWith('processing:'))
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
        prev.map((v) => {
          if (statusMap[v.id] && statusMap[v.id] !== v.status) {
            const nextStatus = statusMap[v.id];
            const nextProgress = nextStatus.startsWith('processing:')
              ? parseInt(nextStatus.split(':')[1])
              : (nextStatus === 'active' ? 100 : v.processing_progress);
            return { ...v, status: nextStatus, processing_progress: nextProgress };
          }
          return v;
        })
      )

      // Update main feed videos with new statuses
      setVideos((prev) =>
        prev.map((v) => {
          if (statusMap[v.id] && statusMap[v.id] !== v.status) {
            const nextStatus = statusMap[v.id];
            const nextProgress = nextStatus.startsWith('processing:')
              ? parseInt(nextStatus.split(':')[1])
              : (nextStatus === 'active' ? 100 : v.processing_progress);
            return { ...v, status: nextStatus, processing_progress: nextProgress };
          }
          return v;
        })
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Videos</h1>
          <p className="text-sm opacity-60 mt-1">Manage and organize your private uploads.</p>
        </div>
        <button
          onClick={() => {
            setIsUploadOpen(true)
            setIsUploadMinimized(false)
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold shadow-md transition-colors text-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Upload Video
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm px-4 py-3 rounded-xl mb-8">
          {error}
        </div>
      )}

      {videos.length === 0 && pinnedVideos.length === 0 && !loading ? (
        <div className="text-center py-20 bg-light-card dark:bg-dark-card border border-light-card-border dark:border-dark-card-border rounded-2xl p-8">
          <svg className="w-12 h-12 text-neutral-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <h3 className="font-semibold text-lg">No videos yet</h3>
          <p className="text-sm text-neutral-500 mt-1">Upload videos to get started.</p>
        </div>
      ) : (
        <>
          {/* Pinned Videos Section */}
          <div className="mb-10">
            <h2 className="text-lg font-bold mb-4">
              Pinned
            </h2>

            {pinnedVideos.length === 0 ? (
              <div className="border border-dashed border-light-navbar/30 dark:border-dark-navbar/30 rounded-2xl p-8 text-center text-sm text-neutral-500">
                No pinned videos. Click the Love icon on any video card below to feature it here.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {pinnedVideos.slice(0, 4).map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    showActions
                    onEdit={(v) => setEditingVideo(v)}
                    onDelete={(v) => setDeletingVideo(v)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Visual Divider */}
          <hr className="my-10 border-light-card-border dark:border-dark-card-border border-t-2" />

          {/* Main Video Grid */}
          <div>
            <h2 className="text-lg font-bold mb-6">Videos</h2>
            
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-x-4 gap-y-8">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-video w-full rounded-xl bg-neutral-200 dark:bg-neutral-800" />
                    <div className="mt-2 h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-3/4" />
                  </div>
                ))}
              </div>
            ) : videos.length === 0 ? (
              <div className="text-center py-10 text-sm text-neutral-500">
                No other videos.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-x-4 gap-y-8">
                {videos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    showActions
                    onEdit={(v) => setEditingVideo(v)}
                    onDelete={(v) => setDeletingVideo(v)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
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

      {/* Video Upload Modal */}
      <UploadVideoModal
        isOpen={isUploadOpen}
        isMinimized={isUploadMinimized}
        onClose={() => {
          setIsUploadOpen(false)
          setIsUploadMinimized(false)
        }}
        onMinimize={() => {
          setIsUploadOpen(false)
          setIsUploadMinimized(true)
        }}
        onSuccess={(newVideo) => {
          // Prepend newly uploaded processing video to the list
          setVideos((prev) => {
            if (prev.some((v) => v.id === newVideo.id)) return prev
            return [newVideo, ...prev]
          })
        }}
      />

      {/* Edit Video Modal */}
      <EditVideoModal
        isOpen={!!editingVideo}
        video={editingVideo}
        onClose={() => setEditingVideo(null)}
        onSuccess={handleEditSuccess}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingVideo}
        onClose={() => setDeletingVideo(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Video"
        message={deletingVideo ? `Delete "${deletingVideo.title || 'this video'}"? This cannot be undone.` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  )
}

export default MyVideo
