import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import ConfirmModal from './ConfirmModal'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000'

/**
 * Modal for editing audio metadata (title, description, visibility) and managing multiple cover art.
 * Pattern mirrors EditVideoModal but adapted for audio items with multi-thumbnail support.
 */
function EditAudioModal({ isOpen, onClose, audio, onSuccess }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState('private')
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [modalIsOpen, setModalIsOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [thumbnails, setThumbnails] = useState([]) // Array of thumbnail objects
  const [loadingThumbnails, setLoadingThumbnails] = useState(false)
  const [deletingThumbnailId, setDeletingThumbnailId] = useState(null)
  const [confirmDeleteThumbnail, setConfirmDeleteThumbnail] = useState(null)

  // Pre-fill current values when modal opens and trigger fade-in
  useEffect(() => {
    if (isOpen && audio) {
      setTitle(audio.title || '')
      setDescription(audio.description || '')
      setVisibility(audio.visibility || 'private')
      setError('')
      setUpdating(false)
      setDeletingThumbnailId(null)
      setConfirmDeleteThumbnail(null)
      
      // Fetch thumbnails for this audio
      fetchThumbnails(audio.id)
      
      // Trigger fade-in animation with a small delay
      const timer = setTimeout(() => {
        setModalIsOpen(true)
        setIsClosing(false)
      }, 10)
      return () => clearTimeout(timer)
    }
  }, [isOpen, audio])

  // Reset states when modal fully closes
  useEffect(() => {
    if (!isOpen && !isClosing) {
      setModalIsOpen(false)
    }
  }, [isOpen])

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !updating && !isClosing) {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, updating, isClosing])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      setModalIsOpen(false)
      onClose()
    }, 300)
  }

  const fetchThumbnails = async (audioId) => {
    setLoadingThumbnails(true)
    const res = await api(`/audio/${audioId}/thumbnails`, {
      method: 'GET',
    })
    setLoadingThumbnails(false)

    if (res.ok && Array.isArray(res.data)) {
      setThumbnails(res.data)
    } else {
      setThumbnails([])
    }
  }

  const handleSetPrimaryThumbnail = async (thumbnailId) => {
    if (!audio) return

    const res = await api(`/audio/${audio.id}/thumbnails/${thumbnailId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })

    if (res.ok) {
      // Update local state
      setThumbnails((prev) =>
        prev.map((t) => ({
          ...t,
          is_primary: t.id === thumbnailId,
        }))
      )
    } else {
      setError(res.error || 'Failed to set primary thumbnail')
    }
  }

  const handleDeleteThumbnail = async (thumbnailId) => {
    if (!audio) return

    setDeletingThumbnailId(thumbnailId)

    const res = await api(`/audio/${audio.id}/thumbnails/${thumbnailId}`, {
      method: 'DELETE',
    })

    setDeletingThumbnailId(null)

    if (res.ok) {
      // Remove from local state
      setThumbnails((prev) => prev.filter((t) => t.id !== thumbnailId))
      setConfirmDeleteThumbnail(null)
    } else {
      setError(res.error || 'Failed to delete thumbnail')
    }
  }

  if (!isOpen && !isClosing) return null
  if (!audio) return null

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Title cannot be empty.')
      return
    }

    setUpdating(true)
    setError('')

    const res = await api(`/audio/${audio.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim(),
        visibility,
      }),
    })

    if (res.ok) {
      setUpdating(false)
      onSuccess(res.data)
      handleClose()
    } else {
      setError(res.error || 'Failed to update audio.')
      setUpdating(false)
    }
  }

  return (
    <div
      className={`fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity duration-300 ${
        modalIsOpen && !isClosing ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ pointerEvents: modalIsOpen && !isClosing ? 'auto' : 'none' }}
      onClick={(e) => {
        if (!updating && !isClosing && e.target === e.currentTarget) {
          handleClose()
        }
      }}
    >
      <div className={`bg-light-navbar dark:bg-dark-navbar text-light-text dark:text-dark-text border border-light-navbar/30 dark:border-dark-navbar/30 w-full max-w-xl p-6 rounded-2xl shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col transition-all duration-300 ease-out ${
        modalIsOpen && !isClosing ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-light-navbar/10 dark:border-dark-navbar/10">
          <h2 className="text-xl font-bold">Edit Audio</h2>
          {!updating && (
            <button
              onClick={handleClose}
              className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Content */}
        <form onSubmit={handleUpdate} className="flex-1 overflow-y-auto mt-4 space-y-4 pr-1 no-scrollbar">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          {/* Thumbnails Management Section */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-light-text/70 dark:text-dark-text/70">
              Cover Art
            </label>
            {loadingThumbnails ? (
              <div className="text-center py-8 text-sm text-neutral-500">
                Loading cover art...
              </div>
            ) : thumbnails.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2">
                  {thumbnails.map((thumb) => (
                    <div key={thumb.id} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
                        <img
                          src={`${BASE_URL}/audio/${audio.id}/thumbnails/${thumb.id}`}
                          alt="Cover art"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none'
                          }}
                        />
                      </div>

                      {/* Primary badge */}
                      {thumb.is_primary && (
                        <div className="absolute top-1 left-1 bg-violet-600 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">
                          Primary
                        </div>
                      )}

                      {/* Hover actions */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 rounded-lg">
                        {!thumb.is_primary && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryThumbnail(thumb.id)}
                            disabled={updating || deletingThumbnailId === thumb.id}
                            className="px-2 py-1 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded transition-colors disabled:opacity-50"
                            title="Set as primary"
                          >
                            Set Primary
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteThumbnail(thumb.id)}
                          disabled={updating || deletingThumbnailId === thumb.id}
                          className="px-2 py-1 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50"
                          title="Delete cover art"
                        >
                          {deletingThumbnailId === thumb.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 bg-light-body/20 dark:bg-dark-body/20 border border-light-navbar/10 dark:border-dark-navbar/10 rounded-xl text-sm text-neutral-500">
                No cover art yet
              </div>
            )}
          </div>

          {/* Audio Title */}
          <div className="space-y-1">
            <label htmlFor="edit-audio-title" className="text-sm font-semibold text-light-text/70 dark:text-dark-text/70">
              Title (Required)
            </label>
            <input
              id="edit-audio-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={updating}
              placeholder="Change audio title"
              className="w-full px-4 py-3 rounded-xl border border-light-navbar/30 dark:border-dark-navbar/30 bg-light-body dark:bg-dark-body focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label htmlFor="edit-audio-description" className="text-sm font-semibold text-light-text/70 dark:text-dark-text/70">
              Description (Optional)
            </label>
            <textarea
              id="edit-audio-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={updating}
              placeholder="Update audio description"
              rows={5}
              className="w-full px-4 py-3 rounded-xl border border-light-navbar/30 dark:border-dark-navbar/30 bg-light-body dark:bg-dark-body focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm resize-none no-scrollbar"
            />
          </div>

          {/* Visibility Toggle */}
          <div className="space-y-2 pt-3 border-t border-light-navbar/10 dark:border-dark-navbar/10">
            <span className="text-sm font-semibold text-light-text/70 dark:text-dark-text/70 block">Visibility</span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setVisibility('private')}
                disabled={updating}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-semibold transition-all ${
                  visibility === 'private'
                    ? 'bg-violet-600 border-violet-600 text-white shadow-sm'
                    : 'bg-light-body dark:bg-dark-body border-light-navbar/20 dark:border-dark-navbar/20 text-light-text/75 dark:text-dark-text/75 hover:bg-neutral-100 dark:hover:bg-neutral-900 disabled:opacity-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                </svg>
                Private
              </button>
              <button
                type="button"
                onClick={() => setVisibility('public')}
                disabled={updating}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-semibold transition-all ${
                  visibility === 'public'
                    ? 'bg-violet-600 border-violet-600 text-white shadow-sm'
                    : 'bg-light-body dark:bg-dark-body border-light-navbar/20 dark:border-dark-navbar/20 text-light-text/75 dark:text-dark-text/75 hover:bg-neutral-100 dark:hover:bg-neutral-900 disabled:opacity-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Public
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-light-navbar/10 dark:border-dark-navbar/10">
            <button
              type="button"
              onClick={handleClose}
              disabled={updating}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-light-navbar/10 dark:border-dark-navbar/10 hover:bg-neutral-200 dark:hover:bg-neutral-800 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updating || !title.trim()}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-800 disabled:text-neutral-500 disabled:opacity-50 transition-colors shadow-md"
            >
              {updating ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!confirmDeleteThumbnail}
        title="Delete Cover Art?"
        message="Are you sure you want to delete this cover art? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => {
          if (confirmDeleteThumbnail) {
            handleDeleteThumbnail(confirmDeleteThumbnail)
          }
        }}
        onCancel={() => setConfirmDeleteThumbnail(null)}
        isDestructive
      />
    </div>
  )
}

export default EditAudioModal
