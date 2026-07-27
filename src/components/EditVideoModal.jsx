import { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000'

/**
 * ThumbnailUploadZone Component - Drag-and-drop zone for thumbnail replacement.
 */
function ThumbnailUploadZone({ uploading, dragActive, onDragEnter, onDragOver, onDragLeave, onDrop, onInputClick }) {
  return (
    <div
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={!uploading ? onInputClick : undefined}
      className={`
        border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 min-h-[100px]
        ${dragActive
          ? 'border-violet-500 bg-violet-500/5'
          : 'border-light-navbar/30 dark:border-dark-navbar/30 hover:border-light-text/50 dark:hover:border-dark-text/50 bg-light-body/50 dark:bg-dark-body/50'
        }
        ${uploading ? 'pointer-events-none opacity-50' : ''}
      `}
    >
      <svg className="w-6 h-6 text-neutral-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      
      <p className="text-sm font-medium text-center">
        Drop thumbnail or <span className="text-violet-500 hover:underline">browse</span>
      </p>
    </div>
  )
}

function EditVideoModal({ isOpen, onClose, video, onSuccess }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState('private')
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [modalIsOpen, setModalIsOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [selectedThumbnail, setSelectedThumbnail] = useState(null)
  const [thumbnailDragActive, setThumbnailDragActive] = useState(false)
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false)
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const thumbnailInputRef = useRef(null)
  const uploadInProgressRef = useRef(false)

  // Pre-fill current values when modal opens and trigger fade-in
  useEffect(() => {
    if (isOpen && video) {
      setTitle(video.title || '')
      setDescription(video.description || '')
      setVisibility(video.visibility || 'private')
      setError('')
      setUpdating(false)
      setUploadingThumbnail(false)
      setSelectedThumbnail(null)
      setThumbnailUrl(`${BASE_URL}/video/t/${video.short_id}`)
      uploadInProgressRef.current = false
      
      // Trigger fade-in animation with a small delay
      const timer = setTimeout(() => {
        setModalIsOpen(true)
        setIsClosing(false)
      }, 10)
      return () => clearTimeout(timer)
    }
  }, [isOpen, video])

  // Reset states when modal fully closes
  useEffect(() => {
    if (!isOpen && !isClosing) {
      setModalIsOpen(false)
    }
  }, [isOpen])

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !updating && !uploadingThumbnail && !isClosing) {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, updating, uploadingThumbnail, isClosing])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      setModalIsOpen(false)
      onClose()
    }, 300)
  }

  if (!isOpen && !isClosing) return null
  if (!video) return null

  // Client-side thumbnail validation
  const validateThumbnail = (file) => {
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif']
    const maxSize = 5 * 1024 * 1024 // 5MB
    const ext = file.name.split('.').pop().toLowerCase()
    
    if (!allowedExtensions.includes(ext)) {
      setError(`Thumbnail format not supported. Allowed: ${allowedExtensions.join(', ')}`)
      return false
    }
    
    if (file.size > maxSize) {
      setError('Thumbnail must be smaller than 5MB.')
      return false
    }
    
    return true
  }

  const handleThumbnailChange = (filesList) => {
    setError('')
    const incomingFiles = Array.from(filesList)

    if (incomingFiles.length === 0) return

    const file = incomingFiles[0] // Only accept first file
    
    if (validateThumbnail(file)) {
      setSelectedThumbnail(file)
    }
  }

  const handleThumbnailFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleThumbnailChange(e.target.files)
    }
  }

  const handleThumbnailDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setThumbnailDragActive(true)
    } else if (e.type === 'dragleave') {
      setThumbnailDragActive(false)
    }
  }

  const handleThumbnailDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setThumbnailDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleThumbnailChange(e.dataTransfer.files)
    }
  }

  const triggerThumbnailInput = () => {
    thumbnailInputRef.current.click()
  }

  const handleRemoveThumbnail = () => {
    setSelectedThumbnail(null)
  }

  const uploadThumbnail = () => {
    if (!selectedThumbnail) return Promise.resolve()

    return new Promise((resolve, reject) => {
      const formData = new FormData()
      formData.append('thumbnail', selectedThumbnail)

      const xhr = new XMLHttpRequest()
      xhr.open('PUT', `${BASE_URL}/video/${video.id}/thumbnail`)

      const token = localStorage.getItem('token')
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      }

      xhr.onload = () => {
        let responseData = {}
        try {
          responseData = JSON.parse(xhr.responseText)
        } catch (_err) {}

        if (xhr.status >= 200 && xhr.status < 300) {
          // Cache-bust the thumbnail URL to force refresh
          setThumbnailUrl(`${BASE_URL}/video/t/${video.short_id}?t=${Date.now()}`)
          setSelectedThumbnail(null)
          resolve(responseData.data)
        } else {
          const errorMsg = responseData.error || 'Thumbnail upload failed'
          reject(new Error(errorMsg))
        }
      }

      xhr.onerror = () => {
        reject(new Error('Network error'))
      }

      xhr.send(formData)
    })
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Title cannot be empty.')
      return
    }

    setUpdating(true)
    setError('')
    uploadInProgressRef.current = true

    try {
      // Upload metadata
      const res = await api(`/video/${video.id}`, {
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

      if (!res.ok) {
        setError(res.error || 'Failed to update video.')
        setUpdating(false)
        uploadInProgressRef.current = false
        return
      }

      // If there's a new thumbnail, upload it separately
      if (selectedThumbnail) {
        setUploadingThumbnail(true)
        try {
          await uploadThumbnail()
        } catch (err) {
          setError(err.message || 'Thumbnail upload failed, but video was updated.')
          setUploadingThumbnail(false)
          setUpdating(false)
          uploadInProgressRef.current = false
          return
        }
        setUploadingThumbnail(false)
      }

      setUpdating(false)
      uploadInProgressRef.current = false
      onSuccess(res.data)
      handleClose()
    } catch (err) {
      setError('Failed to update video.')
      setUpdating(false)
      uploadInProgressRef.current = false
    }
  }

  return (
    <div
      className={`fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity duration-300 ${
        modalIsOpen && !isClosing ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ pointerEvents: modalIsOpen && !isClosing ? 'auto' : 'none' }}
      onClick={(e) => {
        if (!updating && !uploadingThumbnail && !isClosing && e.target === e.currentTarget) {
          handleClose()
        }
      }}
    >
      <div className={`bg-light-navbar dark:bg-dark-navbar text-light-text dark:text-dark-text border border-light-navbar/30 dark:border-dark-navbar/30 w-full max-w-xl p-6 rounded-2xl shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col transition-all duration-300 ease-out ${
        modalIsOpen && !isClosing ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-light-navbar/10 dark:border-dark-navbar/10">
          <h2 className="text-xl font-bold">Edit Video</h2>
          {!updating && !uploadingThumbnail && (
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

          {/* Thumbnail preview */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-light-text/70 dark:text-dark-text/70">
              Thumbnail
            </label>
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-900">
              <img
                src={thumbnailUrl}
                alt={video.title || 'Video thumbnail'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none'
                }}
              />
            </div>
          </div>

          {/* Thumbnail Upload Zone */}
          <div className="space-y-3 border-b border-light-navbar/10 dark:border-dark-navbar/10 pb-3">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-light-text/70 dark:text-dark-text/70">
                Replace Thumbnail (Optional)
              </label>
              <p className="text-xs text-neutral-500">
                JPG, PNG, WebP, or GIF (Max 5MB)
              </p>
            </div>

            {/* Thumbnail Preview */}
            {selectedThumbnail && (
              <div className="relative inline-block">
                <div className="w-24 h-24 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center group">
                  <img
                    src={URL.createObjectURL(selectedThumbnail)}
                    alt="Thumbnail preview"
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Remove button */}
                  {!uploadingThumbnail && (
                    <button
                      type="button"
                      onClick={handleRemoveThumbnail}
                      className="absolute inset-0 bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove thumbnail"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Thumbnail Drag & Drop Zone */}
            {!selectedThumbnail && (
              <ThumbnailUploadZone
                uploading={uploadingThumbnail}
                dragActive={thumbnailDragActive}
                onDragEnter={handleThumbnailDrag}
                onDragOver={handleThumbnailDrag}
                onDragLeave={handleThumbnailDrag}
                onDrop={handleThumbnailDrop}
                onInputClick={triggerThumbnailInput}
              />
            )}

            <input
              ref={thumbnailInputRef}
              type="file"
              onChange={handleThumbnailFileChange}
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
              className="hidden"
              disabled={uploadingThumbnail}
            />
          </div>

          {/* Video Title */}
          <div className="space-y-1">
            <label htmlFor="edit-video-title" className="text-sm font-semibold text-light-text/70 dark:text-dark-text/70">
              Title (Required)
            </label>
            <input
              id="edit-video-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={updating || uploadingThumbnail}
              placeholder="Change video title"
              className="w-full px-4 py-3 rounded-xl border border-light-navbar/30 dark:border-dark-navbar/30 bg-light-body dark:bg-dark-body focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label htmlFor="edit-video-description" className="text-sm font-semibold text-light-text/70 dark:text-dark-text/70">
              Description (Optional)
            </label>
            <textarea
              id="edit-video-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={updating || uploadingThumbnail}
              placeholder="Update video description"
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
                disabled={updating || uploadingThumbnail}
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
                disabled={updating || uploadingThumbnail}
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
              disabled={updating || uploadingThumbnail}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-light-navbar/10 dark:border-dark-navbar/10 hover:bg-neutral-200 dark:hover:bg-neutral-800 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updating || uploadingThumbnail || !title.trim()}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-800 disabled:text-neutral-500 disabled:opacity-50 transition-colors shadow-md"
            >
              {updating || uploadingThumbnail ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditVideoModal
