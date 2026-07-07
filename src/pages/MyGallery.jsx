import { useState, useEffect, useRef } from 'react'
import { Navigate, useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { restrictToParentElement } from '@dnd-kit/modifiers'
import { useAuth } from '../contexts/AuthContext'
import { get, api, post } from '../lib/api'
import { getShortId } from '../lib/shortId'
import { fetchStatuses } from '../lib/pollStatus'
import UploadModal from '../components/UploadModal'
import EditNameModal from '../components/EditNameModal'
import ImageModal from '../components/ImageModal'
import SortablePinnedCard from '../components/SortablePinnedCard'
import ConfirmModal from '../components/ConfirmModal'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000'

function MyGallery() {
  const { username } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const [images, setImages] = useState([])
  const [pinnedImages, setPinnedImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [cursor, setCursor] = useState(null)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState('')
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isUploadMinimized, setIsUploadMinimized] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editImage, setEditImage] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  
  // Modal states for confirmations and alerts
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [alertState, setAlertState] = useState(null) // { title, message }
  const [pinLimitModalOpen, setPinLimitModalOpen] = useState(false)
  
  // Track orientation (portrait/landscape) for Bento grid spanning
  // Map of { imageId: isVertical }
  const [imageOrientation, setImageOrientation] = useState({})

  // Pinned order from backend (pin_order field). User can drag-and-drop to reorder.
  const [pinnedOrder, setPinnedOrder] = useState([])
  const sentinelRef = useRef(null)
  const isMountedRef = useRef(true)

  // Drag sensors: separate for desktop and mobile
  // Desktop (MouseSensor): 8px distance activation for click vs drag distinction
  // Mobile (TouchSensor): 250ms delay to allow scrolling, small tolerance
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Helper: Backend API URL for image bytes. type = 't' (thumbnail) or 'r' (raw).
  // Always returns clean URL without token.
  // Backend will check authentication via cookie/header.
  // If user doesn't have access → 401 Unauthorized.
  const getImageUrl = (img, type = 't') => {
    const shortId = getShortId(img)
    return `${BASE_URL}/gallery/${type}/${shortId}`
  }

  // Check if we should show modal based on query param
  const viewImageId = searchParams.get('view')

  useEffect(() => {
    if (viewImageId && ((images && images.length > 0) || (pinnedImages && pinnedImages.length > 0))) {
      // Ensure both are actually arrays before spreading
      const safeImages = Array.isArray(images) ? images : []
      const safePinnedImages = Array.isArray(pinnedImages) ? pinnedImages : []
      
      const allImages = [...safePinnedImages, ...safeImages]
      const imageToView = allImages.find(img => getShortId(img) === viewImageId)
      if (imageToView) {
        setSelectedImage(imageToView)
      }
    } else {
      setSelectedImage(null)
    }
  }, [viewImageId, images, pinnedImages])

  // Listen for reopen upload modal event
  useEffect(() => {
    const handleReopenUpload = () => {
      setIsUploadOpen(true)
      setIsUploadMinimized(false)
    }
    window.addEventListener('reopenUploadModal', handleReopenUpload)
    return () => window.removeEventListener('reopenUploadModal', handleReopenUpload)
  }, [])

  // Fetch user's images with pagination
  const fetchMyImages = async (isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMore(true)
    } else {
      setLoading(true)
      setImages([])
      setCursor(null)
      setHasMore(true)
    }

    try {
      const params = new URLSearchParams()
      if (cursor && isLoadMore) params.set('cursor', cursor)
      params.set('limit', '50')
      
      const res = await get(`/gallery/me?${params.toString()}`)
      
      // Only update state if component is still mounted
      if (!isMountedRef.current) return
      
      if (res.ok) {
        const { items, next_cursor } = res.data
        // Filter only unpinned images for the main gallery (pinned handled separately)
        const unpinnedItems = items.filter(img => !img.pinned)
        
        setImages((prev) => isLoadMore ? [...prev, ...unpinnedItems] : unpinnedItems)
        setCursor(next_cursor)
        setHasMore(next_cursor !== null)
        setError('')
      } else {
        setError(res.error || 'Failed to fetch your gallery images.')
      }
    } catch (err) {
      console.error('Error fetching images:', err)
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

  // Fetch pinned images separately
  const fetchPinnedImages = async () => {
    try {
      const res = await get('/gallery/me/pinned')
      if (res.ok && isMountedRef.current) {
        setPinnedImages(res.data)
        // Update the pinned order based on pin_order from backend
        const orderedIds = res.data
          .sort((a, b) => (a.pin_order || 0) - (b.pin_order || 0))
          .map(img => img.id)
        setPinnedOrder(orderedIds)
      }
    } catch (err) {
      console.error('Error fetching pinned images:', err)
    }
  }

  const loadNextPage = () => {
    if (!loadingMore && hasMore && cursor) {
      fetchMyImages(true)
    }
  }

  // Load images on mount
  useEffect(() => {
    if (authLoading || !user) return
    fetchMyImages(false)
    fetchPinnedImages()
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
    
    // Cleanup: disconnect observer when component unmounts or dependencies change
    return () => {
      observer.disconnect()
    }
  }, [hasMore, loading, loadingMore, cursor])

  // Poll processing items status
  useEffect(() => {
    // Ensure both arrays are actually arrays before spreading
    const safeImages = Array.isArray(images) ? images : []
    const safePinnedImages = Array.isArray(pinnedImages) ? pinnedImages : []
    
    const allImages = [...safePinnedImages, ...safeImages]
    const processingIds = allImages
      .filter((img) => img.status === 'processing')
      .map((img) => img.id)

    if (processingIds.length === 0) return

    const intervalId = setInterval(async () => {
      // Pause polling when tab is hidden (save bandwidth)
      if (document.hidden) return
      
      // Stop polling if component unmounted
      if (!isMountedRef.current) {
        clearInterval(intervalId)
        return
      }

      const statusMap = await fetchStatuses(processingIds)
      if (Object.keys(statusMap).length === 0) return // retry next tick
      
      // Only update state if still mounted
      if (!isMountedRef.current) return

      // Update both pinned and unpinned images with new statuses
      setPinnedImages((prev) =>
        prev.map((img) =>
          statusMap[img.id] && statusMap[img.id] !== img.status
            ? { ...img, status: statusMap[img.id] }
            : img
        )
      )

      setImages((prev) =>
        prev.map((img) =>
          statusMap[img.id] && statusMap[img.id] !== img.status
            ? { ...img, status: statusMap[img.id] }
            : img
        )
      )
    }, 2000)

    // CRITICAL: Cleanup interval on unmount or when dependencies change
    return () => {
      clearInterval(intervalId)
    }
  }, [images, pinnedImages])

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

  // Only the owner may view their own gallery
  if (user.username !== username) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-3xl font-bold mb-4">Forbidden</h1>
        <p className="text-lg opacity-80 mb-8">You can only view your own gallery.</p>
        <button
          onClick={() => navigate(`/${user.username}/gallery`)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Go to My Gallery
        </button>
      </div>
    )
  }

  // Safety check: ensure arrays are initialized before filtering
  if (!Array.isArray(images) || !Array.isArray(pinnedImages)) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <p className="opacity-60">Loading gallery...</p>
      </div>
    )
  }

  // Open an image: update query param to show modal.
  // The URL becomes /:username/gallery?view={short_id}
  const handleOpenImage = (e, img) => {
    e.preventDefault()
    const shortId = getShortId(img)
    if (shortId) {
      setSearchParams({ view: shortId })
    }
  }

  const handleCloseModal = () => {
    setSearchParams({})
    setSelectedImage(null)
  }

  // Filter unpinned images for the current user only (pinnedImages handled separately)
  const unpinnedImages = (images || []).filter((img) => img.user_id === user.id)
  
  // Sort pinned images by the session-local drag order
  const sortedPinnedImages = (pinnedImages || [])
    .sort((a, b) => {
      const ia = pinnedOrder.indexOf(a.id)
      const ib = pinnedOrder.indexOf(b.id)
      if (ia === -1) return 1
      if (ib === -1) return -1
      return ia - ib
    })

  // Helper: show alert modal with custom title and message
  const showAlert = (title, message) => {
    setAlertState({ title, message })
  }

  // Reorder pinned images on drag end (persisted to backend).
  const handleDragEnd = async (event) => {
    // Early return if component unmounted during drag
    if (!isMountedRef.current) return
    
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = pinnedOrder.indexOf(active.id)
    const newIndex = pinnedOrder.indexOf(over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const newOrder = arrayMove(pinnedOrder, oldIndex, newIndex)
    setPinnedOrder(newOrder)

    // Persist to backend
    const res = await api('/gallery/reorder-pins', {
      method: 'PATCH',
      body: JSON.stringify({ ordered_ids: newOrder }),
    })
    
    // Only update if still mounted
    if (!isMountedRef.current) return
    
    if (!res.ok) {
      // Revert on error
      setPinnedOrder(pinnedOrder)
      showAlert('Reorder Failed', res.error || 'Failed to save pinned order.')
    }
  }

  const handleUploadSuccess = (newItems) => {
    // Backend returns either a single GalleryItem or an array (UploadResponse)
    if (Array.isArray(newItems)) {
      setImages((prev) => [...newItems, ...prev])
    } else if (newItems) {
      setImages((prev) => [newItems, ...prev])
    }
  }

  const handleMinimizeUpload = () => {
    setIsUploadMinimized(true)
    // Upload continues in background - modal is hidden but still mounted
  }

  const handleCloseUpload = () => {
    setIsUploadOpen(false)
    setIsUploadMinimized(false)
  }

  // Detect image orientation for Bento grid spanning
  const handleImageLoad = (e, imgId) => {
    const isVertical = e.target.naturalHeight > e.target.naturalWidth
    setImageOrientation((prev) => ({ ...prev, [imgId]: isVertical }))
  }

  const handleEditSuccess = (updatedImage) => {
    if (updatedImage.pinned) {
      setPinnedImages((prev) => prev.map((img) => (img.id === updatedImage.id ? updatedImage : img)))
    } else {
      setImages((prev) => prev.map((img) => (img.id === updatedImage.id ? updatedImage : img)))
    }
  }

  const handleTogglePin = async (img) => {
    // Check if trying to pin (not unpin) and limit is reached
    if (!img.pinned) {
      const pinnedCount = pinnedImages.length
      if (pinnedCount >= 8) {
        setPinLimitModalOpen(true)
        return
      }
    }

    const res = await api(`/gallery/${img.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ pinned: !img.pinned }),
    })
    if (res.ok) {
      // Update the appropriate state based on pin status
      if (res.data.pinned) {
        // Moving from unpinned to pinned
        setImages((prev) => prev.filter((it) => it.id !== img.id))
        setPinnedImages((prev) => [...prev, res.data])
        setPinnedOrder((prev) => [...prev, res.data.id])
      } else {
        // Moving from pinned to unpinned  
        setPinnedImages((prev) => prev.filter((it) => it.id !== img.id))
        setImages((prev) => [...prev, res.data])
        setPinnedOrder((prev) => prev.filter((id) => id !== img.id))
      }
    } else {
      showAlert('Pin Failed', res.error || 'Failed to update pinned status.')
    }
  }

  // Handle delete click: check for Shift key to skip confirmation
  const handleDeleteClick = (e, img) => {
    e.stopPropagation()
    
    // Shift+click skips confirmation
    if (e.shiftKey) {
      performDelete(img.id)
    } else {
      setDeleteTarget(img)
    }
  }

  // Perform the actual delete operation
  const performDelete = async (id) => {
    const res = await api(`/gallery/${id}`, { method: 'DELETE' })
    if (res.ok) {
      // Remove from both images lists
      setImages((prev) => prev.filter((img) => img.id !== id))
      setPinnedImages((prev) => prev.filter((img) => img.id !== id))
      setPinnedOrder((prev) => prev.filter((imgId) => imgId !== id))
      
      // Close modal if needed
      setDeleteTarget(null)
    } else {
      showAlert('Delete Failed', res.error || 'Failed to delete image.')
      setDeleteTarget(null)
    }
  }

  const handleOpenEdit = (img) => {
    setEditImage(img)
    setIsEditOpen(true)
  }

  const handleToggleVisibility = async (img) => {
    const nextVisibility = img.visibility === 'public' ? 'private' : 'public'
    const res = await api(`/gallery/${img.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ visibility: nextVisibility }),
    })
    if (res.ok) {
      // Update the appropriate state based on pin status
      if (img.pinned) {
        setPinnedImages((prev) => prev.map((item) => (item.id === img.id ? res.data : item)))
      } else {
        setImages((prev) => prev.map((item) => (item.id === img.id ? res.data : item)))
      }
    } else {
      showAlert('Visibility Update Failed', res.error || 'Failed to update visibility.')
    }
  }

  const handleReprocess = async (img) => {
    // Optimistically set to processing so the polling effect starts
    if (img.pinned) {
      setPinnedImages((prev) =>
        prev.map((it) => (it.id === img.id ? { ...it, status: 'processing' } : it))
      )
    } else {
      setImages((prev) =>
        prev.map((it) => (it.id === img.id ? { ...it, status: 'processing' } : it))
      )
    }

    const res = await post(`/gallery/${img.id}/reprocess`, {})
    if (res.ok && res.data) {
      // Server returns the updated item (may already be active)
      if (img.pinned) {
        setPinnedImages((prev) => prev.map((it) => (it.id === img.id ? res.data : it)))
      } else {
        setImages((prev) => prev.map((it) => (it.id === img.id ? res.data : it)))
      }
    } else {
      // Revert to failed on error
      if (img.pinned) {
        setPinnedImages((prev) =>
          prev.map((it) => (it.id === img.id ? { ...it, status: 'failed_processing' } : it))
        )
      } else {
        setImages((prev) =>
          prev.map((it) => (it.id === img.id ? { ...it, status: 'failed_processing' } : it))
        )
      }
      showAlert('Reprocess Failed', res.error || 'Failed to retry processing.')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-24">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Gallery</h1>
          <p className="text-sm opacity-60 mt-1">Manage and organize your private uploads.</p>
        </div>
        <button
          onClick={() => {
            setIsUploadOpen(true)
            setIsUploadMinimized(false)
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-md transition-colors text-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Upload Image
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm px-4 py-3 rounded-xl mb-8">
          {error}
        </div>
      )}

      {/* Pinned Area (Bento grid: vertical images span two rows, drag to reorder) */}
      <div className="mb-10">
        <h2 className="text-lg font-bold mb-4">
          Pinned
        </h2>

        {pinnedImages.length === 0 ? (
          <div className="border border-dashed border-light-navbar/30 dark:border-dark-navbar/30 rounded-2xl p-8 text-center text-sm text-neutral-500">
            No pinned images. Click the Love icon on any image card below to feature it here.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToParentElement]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={sortedPinnedImages.map((img) => img.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-flow-row-dense grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 auto-rows-[11rem] gap-4">
                {sortedPinnedImages.map((img) => (
                  <SortablePinnedCard
                    key={img.id}
                    img={img}
                    isVertical={!!imageOrientation[img.id]}
                    getImageUrl={getImageUrl}
                    onToggleVisibility={handleToggleVisibility}
                    onOpenEdit={handleOpenEdit}
                    onTogglePin={handleTogglePin}
                    onDelete={handleDeleteClick}
                    onOpenImage={handleOpenImage}
                    onReprocess={handleReprocess}
                    onImageLoad={handleImageLoad}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Visual Divider */}
      <hr className="my-10 border-light-card-border dark:border-dark-card-border border-t-2" />

      {/* Main Images Area (Masonry Layout) */}
      <div>
        <h2 className="text-lg font-bold mb-6">
          Images
        </h2>

        {loading ? (
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="break-inside-avoid mb-4 p-3 bg-light-card dark:bg-dark-card border border-light-card-border dark:border-dark-card-border rounded-2xl animate-pulse">
                <div className="bg-neutral-200 dark:bg-neutral-800 rounded-xl h-48 w-full mb-3" />
                <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-2/3 mb-2" />
                <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : unpinnedImages.length === 0 && pinnedImages.length === 0 ? (
          <div className="text-center py-20 bg-light-card dark:bg-dark-card border border-light-card-border dark:border-dark-card-border rounded-2xl p-8">
            <svg className="w-12 h-12 text-neutral-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="font-semibold text-lg">Your gallery is empty</h3>
            <p className="text-sm text-neutral-500 mt-1">Click the "Upload Image" button above to upload your first image.</p>
          </div>
        ) : unpinnedImages.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-light-navbar/20 dark:border-dark-navbar/20 rounded-2xl text-sm text-neutral-500">
            All your images are currently pinned.
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4">
            {unpinnedImages.map((img) => {
              const displayTitle = img.title.length > 20 ? img.title.substring(0, 20) + '...' : img.title
              return (
                <div 
                  key={img.id} 
                  className="break-inside-avoid mb-4 p-3 bg-light-card dark:bg-dark-card border border-light-card-border dark:border-dark-card-border rounded-2xl relative shadow-sm hover:shadow-md hover:border-light-text/20 dark:hover:border-dark-text/20 transition-all duration-300 group"
                >
                  {/* Visibility Badge */}
                  <button 
                    onClick={() => handleToggleVisibility(img)}
                    className="absolute top-5 left-5 z-20 p-1.5 rounded-lg bg-black/60 text-white shadow-md hover:bg-black/85 transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 opacity-0 group-hover:opacity-100"
                    title={img.visibility === 'public' ? 'Public Image (Click to make Private)' : 'Private Image (Click to make Public)'}
                  >
                    {img.visibility === 'public' ? (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    )}
                  </button>

                  {/* Actions overlay shown on hover */}
                  <div className="absolute top-5 right-5 z-10 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {/* Rename pencil icon */}
                    <button
                      onClick={() => handleOpenEdit(img)}
                      className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors shadow-md"
                      title="Edit name"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    {/* Pin button (Love Icon Outline) */}
                    <button
                      onClick={() => handleTogglePin(img)}
                      className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white hover:text-red-500 transition-colors shadow-md"
                      title="Pin image"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDeleteClick(e, img)}
                      className="p-2 rounded-full bg-black/60 hover:bg-red-600 text-white hover:text-white transition-colors shadow-md"
                      title="Delete image (Shift+click to skip confirmation)"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {/* Image display - different UI based on status */}
                  <div className="block w-full overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center min-h-[100px]">
                    {img.status === 'processing' ? (
                      // Processing state: show spinner
                      <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400 py-8">
                        <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span className="text-xs mt-2">Processing...</span>
                      </div>
                    ) : img.status === 'failed_processing' ? (
                      // Failed state: show error + retry
                      <div className="w-full h-full flex flex-col items-center justify-center bg-red-500/10 text-red-500 gap-2 p-3 text-center py-8">
                        <span className="text-xs font-semibold">Processing failed</span>
                        <button
                          onClick={() => handleReprocess(img)}
                          className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                          Retry
                        </button>
                      </div>
                    ) : (
                      // Active state: show thumbnail with clickable link
                      <a
                        href={getImageUrl(img, 'r')}
                        onClick={(e) => { 
                          e.preventDefault()
                          handleOpenImage(e, img)
                        }}
                        className="w-full h-full flex items-center justify-center"
                      >
                        <img
                          src={getImageUrl(img, 't')}
                          alt={img.title}
                          loading="lazy"
                          className="w-full h-auto object-cover rounded-xl transition-transform duration-300 group-hover:scale-[1.02] pointer-events-none"
                        />
                      </a>
                    )}
                  </div>
                  <div className="mt-3 px-1">
                    <h3 className="font-semibold text-sm text-light-text dark:text-dark-text" title={img.title}>
                      {displayTitle}
                    </h3>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Infinite scroll sentinel and loading spinner */}
        {hasMore && (
          <div ref={sentinelRef} className="flex justify-center py-8">
            {loadingMore && (
              <div className="flex items-center gap-2 text-neutral-500">
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-sm">Loading more images...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <UploadModal 
        isOpen={isUploadOpen}
        isMinimized={isUploadMinimized}
        onClose={handleCloseUpload}
        onSuccess={handleUploadSuccess}
        onMinimize={handleMinimizeUpload}
      />

      {/* Edit Name Modal */}
      <EditNameModal 
        isOpen={isEditOpen} 
        onClose={() => {
          setIsEditOpen(false)
          setEditImage(null)
        }} 
        image={editImage}
        onSuccess={handleEditSuccess}
      />

      {/* Image View Modal */}
      {selectedImage && (
        <ImageModal 
          image={selectedImage} 
          onClose={handleCloseModal}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => performDelete(deleteTarget?.id)}
        title="Delete Image"
        message={deleteTarget ? `Delete "${deleteTarget.title}"?` : ''}
        tip="Tip: Hold Shift while clicking delete to skip this confirmation."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Alert Modal (generic) */}
      <ConfirmModal
        isOpen={!!alertState}
        onClose={() => setAlertState(null)}
        title={alertState?.title || 'Alert'}
        message={alertState?.message || ''}
        variant="default"
      />

      {/* Pin Limit Modal */}
      <ConfirmModal
        isOpen={pinLimitModalOpen}
        onClose={() => setPinLimitModalOpen(false)}
        title="Pin Limit Reached"
        message="You can pin up to 8 images. Unpin one first to add more."
        variant="default"
      />
    </div>
  )
}

export default MyGallery
