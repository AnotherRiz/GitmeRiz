import { useState, useEffect } from 'react'
import { api } from '../lib/api'

function EditNameModal({ isOpen, onClose, image, onSuccess }) {
  const [title, setTitle] = useState('')
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [modalIsOpen, setModalIsOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  // Pre-fill current title when modal opens and trigger fade-in
  useEffect(() => {
    if (isOpen && image) {
      setTitle(image.title)
      setError('')
      setUpdating(false)
      
      // Trigger fade-in animation with a small delay
      const timer = setTimeout(() => {
        setModalIsOpen(true)
        setIsClosing(false)
      }, 10)
      return () => clearTimeout(timer)
    }
  }, [isOpen, image])

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

  if (!isOpen && !isClosing) return null
  if (!image) return null

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Title cannot be empty.')
      return
    }

    setUpdating(true)
    setError('')

    const res = await api(`/gallery/${image.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: title.trim() }),
    })

    if (res.ok) {
      setUpdating(false)
      onSuccess(res.data)
      handleClose()
    } else {
      setError(res.error || 'Failed to update image name.')
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
      <div className={`bg-light-navbar dark:bg-dark-navbar text-light-text dark:text-dark-text border border-light-navbar/30 dark:border-dark-navbar/30 w-full max-w-md p-6 rounded-2xl shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col transition-all duration-300 ease-out ${
        modalIsOpen && !isClosing ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-light-navbar/10 dark:border-dark-navbar/10">
          <h2 className="text-xl font-bold">Edit Image Name</h2>
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
        <form onSubmit={handleUpdate} className="flex-1 mt-4 space-y-4 pr-1">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="edit-image-title" className="text-sm font-semibold text-light-text/70 dark:text-dark-text/70">
              Image Name
            </label>
            <input
              id="edit-image-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={updating}
              placeholder="Enter a new title for your image"
              className="w-full px-4 py-3 rounded-xl border border-light-navbar/30 dark:border-dark-navbar/30 bg-light-body dark:bg-dark-body focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
              required
            />
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
              disabled={updating || !title.trim() || title.trim() === image.title}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-800 disabled:text-neutral-500 disabled:opacity-50 transition-colors shadow-md"
            >
              {updating ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditNameModal
