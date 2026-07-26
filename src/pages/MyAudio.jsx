import { useState, useEffect, useRef } from 'react'
import { Navigate, useParams, useNavigate } from 'react-router-dom'
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
import { get, api } from '../lib/api'
import AudioCard from '../components/AudioCard'
import SortableAudioCard from '../components/SortableAudioCard'
import UploadAudioModal from '../components/UploadAudioModal'
import EditAudioModal from '../components/EditAudioModal'
import ConfirmModal from '../components/ConfirmModal'

/**
 * User's personal audio management page.
 * Displays pinned audio items (max 8) with drag-to-reorder and a main feed.
 * Mirrors the MyVideo.jsx pinning pattern adapted for audio.
 */
function MyAudio() {
  const { username } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  // Pinned audio state
  const [pinnedAudio, setPinnedAudio] = useState([])
  const [pinnedOrder, setPinnedOrder] = useState([])

  // Main feed state
  const [audioItems, setAudioItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isUploadMinimized, setIsUploadMinimized] = useState(false)
  const [editingAudio, setEditingAudio] = useState(null)
  const [deletingAudio, setDeletingAudio] = useState(null)

  // Modal states for confirmations
  const [pinLimitModalOpen, setPinLimitModalOpen] = useState(false)
  const [alertState, setAlertState] = useState(null)
  const [errorType, setErrorType] = useState(null) // null, '403'

  const isMountedRef = useRef(true)

  // Drag sensors
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Helper: show alert modal
  const showAlert = (title, message) => {
    setAlertState({ title, message })
  }

  // Fetch pinned audio
  const fetchPinnedAudio = async () => {
    try {
      const res = await get('/audio/me/pinned')
      if (res.ok && isMountedRef.current) {
        setPinnedAudio(res.data || [])
        // Update pinned order based on pin_order from backend
        const orderedIds = (res.data || [])
          .sort((a, b) => (a.pin_order || 0) - (b.pin_order || 0))
          .map((a) => a.id)
        setPinnedOrder(orderedIds)
      }
    } catch (err) {
      console.error('Error fetching pinned audio:', err)
    }
  }

  // Fetch user's audio
  const fetchMyAudio = async () => {
    setLoading(true)
    try {
      const res = await get('/audio')

      if (!isMountedRef.current) return

      if (res.ok) {
        // Handle both array and paginated responses
        const items = Array.isArray(res.data) ? res.data : res.data.items || []
        // Filter to current user's items
        const userItems = items.filter((item) => item.user_id === user.id)
        // Filter out pinned items
        const unpinnedItems = userItems.filter((item) => !item.pinned)
        setAudioItems(unpinnedItems)
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

  // Handle edit success - update audio in both lists
  const handleEditSuccess = (updated) => {
    setAudioItems((prev) => prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)))
    setPinnedAudio((prev) => prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)))
  }

  // Handle pin toggle with limit enforcement (max 8 for audio)
  const handleTogglePin = async (audio) => {
    // Check if trying to pin (not unpin) and limit is reached
    if (!audio.pinned) {
      const pinnedCount = pinnedAudio.length
      if (pinnedCount >= 8) {
        setPinLimitModalOpen(true)
        return
      }
    }

    const res = await api(`/audio/${audio.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ pinned: !audio.pinned }),
    })
    if (res.ok) {
      // Update the appropriate state based on pin status
      if (res.data.pinned) {
        // Moving from unpinned to pinned
        setAudioItems((prev) => prev.filter((it) => it.id !== audio.id))
        setPinnedAudio((prev) => [...prev, res.data])
        setPinnedOrder((prev) => [...prev, res.data.id])
      } else {
        // Moving from pinned to unpinned
        setPinnedAudio((prev) => prev.filter((it) => it.id !== audio.id))
        setAudioItems((prev) => [...prev, res.data])
        setPinnedOrder((prev) => prev.filter((id) => id !== audio.id))
      }
    } else {
      showAlert('Pin Failed', res.error || 'Failed to update pinned status.')
    }
  }

  // Reorder pinned audio on drag end (persisted to backend)
  const handleDragEnd = async (event) => {
    if (!isMountedRef.current) return
    
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = pinnedOrder.indexOf(active.id)
    const newIndex = pinnedOrder.indexOf(over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const newOrder = arrayMove(pinnedOrder, oldIndex, newIndex)
    // Optimistic update
    setPinnedOrder(newOrder)
    
    // Reorder pinnedAudio array to match the new order
    const reorderedAudio = newOrder
      .map((id) => pinnedAudio.find((a) => a.id === id))
      .filter(Boolean)
    setPinnedAudio(reorderedAudio)

    // Persist to backend
    const res = await api('/audio/reorder-pins', {
      method: 'PATCH',
      body: JSON.stringify({ ordered_ids: newOrder }),
    })
    
    if (!isMountedRef.current) return
    
    if (res.ok && Array.isArray(res.data)) {
      setPinnedAudio(res.data)
      const backendOrder = res.data.map((a) => a.id)
      setPinnedOrder(backendOrder)
    } else if (!res.ok) {
      // Revert on error
      setPinnedOrder(pinnedOrder)
      showAlert('Reorder Failed', res.error || 'Failed to save pinned order.')
    }
  }

  // Handle delete click: check for Shift key to skip confirmation
  const handleDeleteClick = (e, audio) => {
    e.stopPropagation()
    
    if (e.shiftKey) {
      performDelete(audio.id)
    } else {
      setDeletingAudio(audio)
    }
  }

  // Perform the actual delete operation
  const performDelete = async (id) => {
    const res = await api(`/audio/${id}`, { method: 'DELETE' })
    if (res.ok) {
      // Remove from both lists
      setAudioItems((prev) => prev.filter((a) => a.id !== id))
      setPinnedAudio((prev) => prev.filter((a) => a.id !== id))
      setPinnedOrder((prev) => prev.filter((aid) => aid !== id))
      
      setDeletingAudio(null)
    } else {
      showAlert('Delete Failed', res.error || 'Failed to delete audio.')
      setDeletingAudio(null)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingAudio) return
    performDelete(deletingAudio.id)
  }

  // Load audio on mount
  useEffect(() => {
    if (authLoading || !user) return
    
    // Check access first
    const hasAccessError = user.username !== username
    if (hasAccessError && !errorType) {
      setErrorType('403')
      setLoading(false)
      return
    }

    fetchMyAudio()
    fetchPinnedAudio()
  }, [authLoading, user, username])

  // Cleanup
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Auth guards
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

  // Error state: 403 Forbidden
  if (errorType === '403') {
    return (
      <>
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
      </>
    )
  }

  const handleUploadSuccess = (newAudio) => {
    setAudioItems((prev) => [newAudio, ...prev])
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-24">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Audio</h1>
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
            Upload Audio
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm px-4 py-3 rounded-xl mb-8">
            {error}
          </div>
        )}

        {/* Pinned audio section */}
        {!loading && pinnedAudio.length > 0 && (
          <>
            <div className="mb-2">
              <h2 className="text-lg font-bold text-light-text dark:text-dark-text">Pinned</h2>
              <p className="text-xs opacity-60 mt-0.5">Drag to reorder your pinned audio ({pinnedAudio.length}/8)</p>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToParentElement]}
            >
              <SortableContext
                items={pinnedOrder}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 mb-8">
                  {pinnedOrder.map((id) => {
                    const audio = pinnedAudio.find((a) => a.id === id)
                    return audio ? (
                      <SortableAudioCard
                        key={audio.id}
                        audio={audio}
                        onEdit={() => setEditingAudio(audio)}
                        onDelete={(e, a) => handleDeleteClick(e, a)}
                        onTogglePin={handleTogglePin}
                      />
                    ) : null
                  })}
                </div>
              </SortableContext>
            </DndContext>
            <hr className="my-8 border-neutral-200 dark:border-neutral-800" />
          </>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square w-full rounded-xl bg-neutral-200 dark:bg-neutral-800" />
                <div className="mt-2 h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : audioItems.length === 0 ? (
          <div className="text-center py-20 bg-light-card dark:bg-dark-card border border-light-card-border dark:border-dark-card-border rounded-2xl p-8">
            <svg className="w-12 h-12 text-neutral-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <h3 className="font-semibold text-lg">No audio yet</h3>
            <p className="text-sm text-neutral-500 mt-1">Click the "Upload Audio" button above to upload your first audio.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {audioItems.map((audio) => (
              <AudioCard
                key={audio.id}
                audio={audio}
                showActions
                onEdit={() => setEditingAudio(audio)}
                onDelete={(e, a) => handleDeleteClick(e, a)}
                onTogglePin={handleTogglePin}
              />
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <UploadAudioModal
        isOpen={isUploadOpen}
        isMinimized={isUploadMinimized}
        onClose={() => {
          setIsUploadOpen(false)
          setIsUploadMinimized(false)
        }}
        onSuccess={handleUploadSuccess}
        onMinimize={() => setIsUploadMinimized(true)}
      />

      {/* Edit Audio Modal */}
      <EditAudioModal
        isOpen={!!editingAudio}
        onClose={() => setEditingAudio(null)}
        audio={editingAudio}
        onSuccess={(updated) => {
          handleEditSuccess(updated)
          setEditingAudio(null)
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingAudio}
        onClose={() => setDeletingAudio(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Audio"
        message={deletingAudio ? `Delete "${deletingAudio.title}"?` : ''}
        tip="Tip: Hold Shift while clicking delete to skip this confirmation."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Pin Limit Warning Modal */}
      <ConfirmModal
        isOpen={pinLimitModalOpen}
        onClose={() => setPinLimitModalOpen(false)}
        title="Pin Limit Reached"
        message="You can pin up to 8 audio items. Unpin an existing audio to pin a new one."
        confirmText="Got it"
        variant="default"
      />

      {/* Alert Modal */}
      <ConfirmModal
        isOpen={!!alertState}
        onClose={() => setAlertState(null)}
        title={alertState?.title || 'Alert'}
        message={alertState?.message || ''}
        variant="default"
      />
    </>
  )
}

export default MyAudio
