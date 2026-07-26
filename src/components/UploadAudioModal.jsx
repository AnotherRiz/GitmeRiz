import { useState, useRef, useEffect } from 'react'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000'
const ALLOWED_AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.aac', '.ogg', '.wav', '.flac']
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif']

// Helper to format file size
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function UploadAudioModal({ isOpen, isMinimized, onClose, onSuccess, onMinimize }) {
  const [selectedAudio, setSelectedAudio] = useState(null)
  const [selectedThumbnail, setSelectedThumbnail] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState('private')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  const [dragActiveAudio, setDragActiveAudio] = useState(false)
  const [dragActiveThumbnail, setDragActiveThumbnail] = useState(false)
  const audioInputRef = useRef(null)
  const thumbnailInputRef = useRef(null)
  const uploadInProgressRef = useRef(false)
  
  // Animation states
  const [modalIsOpen, setModalIsOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  const getFileExtension = (filename) => {
    const lastDot = filename.lastIndexOf('.')
    return lastDot !== -1 ? filename.substring(lastDot).toLowerCase() : ''
  }

  // Reset states when modal fully closes
  useEffect(() => {
    if (!isOpen && !uploadInProgressRef.current) {
      setSelectedAudio(null)
      setSelectedThumbnail(null)
      setTitle('')
      setDescription('')
      setVisibility('private')
      setUploadProgress(0)
      setIsUploading(false)
      setError('')
      setModalIsOpen(false)
      setIsClosing(false)
    }
  }, [isOpen])

  // Trigger open animation
  useEffect(() => {
    if (isOpen && !isMinimized) {
      const timer = setTimeout(() => {
        setModalIsOpen(true)
        setIsClosing(false)
      }, 10)
      return () => clearTimeout(timer)
    }
  }, [isOpen, isMinimized])

  // Handle ESC key press to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleModalClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleModalClose = () => {
    if (uploadInProgressRef.current && onMinimize) {
      setIsClosing(true)
      setTimeout(() => {
        onMinimize()
        setIsClosing(false)
      }, 300)
    } else {
      setIsClosing(true)
      setTimeout(() => {
        onClose()
      }, 300)
    }
  }

  const handleAudioDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActiveAudio(true)
    } else if (e.type === 'dragleave') {
      setDragActiveAudio(false)
    }
  }

  const handleAudioDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActiveAudio(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      handleAudioFileSelect(file)
    }
  }

  const handleAudioFileSelect = (file) => {
    const ext = getFileExtension(file.name)
    if (!ALLOWED_AUDIO_EXTENSIONS.includes(ext)) {
      setError(`Invalid audio format. Allowed: ${ALLOWED_AUDIO_EXTENSIONS.join(', ')}`)
      return
    }

    setError('')
    setSelectedAudio(file)
    if (!title) {
      setTitle(file.name.substring(0, file.name.lastIndexOf('.')) || file.name)
    }
  }

  const handleAudioInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleAudioFileSelect(e.target.files[0])
    }
  }

  const handleThumbnailDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActiveThumbnail(true)
    } else if (e.type === 'dragleave') {
      setDragActiveThumbnail(false)
    }
  }

  const handleThumbnailDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActiveThumbnail(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      handleThumbnailFileSelect(file)
    }
  }

  const handleThumbnailFileSelect = (file) => {
    const ext = getFileExtension(file.name)
    if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
      setError(`Invalid image format. Allowed: ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}`)
      return
    }

    setError('')
    setSelectedThumbnail(file)
  }

  const handleThumbnailInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleThumbnailFileSelect(e.target.files[0])
    }
  }

  const handleRemoveAudio = () => {
    setSelectedAudio(null)
    setTitle('')
  }

  const handleRemoveThumbnail = () => {
    setSelectedThumbnail(null)
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!selectedAudio) {
      setError('Please select an audio file')
      return
    }

    if (!title.trim()) {
      setError('Please enter a title')
      return
    }

    setIsUploading(true)
    setError('')
    uploadInProgressRef.current = true
    setUploadProgress(0)

    return new Promise((resolve) => {
      const formData = new FormData()
      formData.append('file', selectedAudio)
      formData.append('title', title.trim())
      if (description.trim()) {
        formData.append('description', description.trim())
      }
      formData.append('visibility', visibility)
      if (selectedThumbnail) {
        formData.append('thumbnail', selectedThumbnail)
      }

      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${BASE_URL}/audio`)

      // Add auth token
      const token = localStorage.getItem('token')
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      }

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentage = Math.round((e.loaded / e.total) * 100)
          setUploadProgress(Math.min(percentage, 99))
        }
      })

      xhr.onload = () => {
        let responseData = {}
        try {
          responseData = JSON.parse(xhr.responseText)
        } catch (err) {
          // Could not parse response
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadProgress(100)
          onSuccess?.(responseData.data)
          setTimeout(() => {
            setSelectedAudio(null)
            setSelectedThumbnail(null)
            setTitle('')
            setDescription('')
            setVisibility('private')
            setUploadProgress(0)
            setIsUploading(false)
            uploadInProgressRef.current = false
            onClose()
            resolve(responseData.data)
          }, 300)
        } else {
          const errorMsg = responseData.error || 'Upload failed'
          setError(errorMsg)
          setIsUploading(false)
          uploadInProgressRef.current = false
          resolve(null)
        }
      }

      xhr.onerror = () => {
        setError('Network error. Please try again.')
        setIsUploading(false)
        uploadInProgressRef.current = false
        resolve(null)
      }

      xhr.send(formData)
    })
  }

  if (!isOpen && !isMinimized) return null

  // Minimized layout shown during upload
  if (isMinimized && isUploading) {
    return (
      <div className="fixed bottom-6 right-6 z-[100] animate-fade-in">
        <div className="bg-light-navbar dark:bg-dark-navbar text-light-text dark:text-dark-text border border-light-navbar/30 dark:border-dark-navbar/30 px-5 py-4 rounded-2xl shadow-2xl min-w-[280px]">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-violet-500 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <div>
                <p className="text-sm font-semibold">Uploading audio...</p>
                <p className="text-xs opacity-60">{uploadProgress}% complete</p>
              </div>
            </div>
            <button
              onClick={() => {
                onClose()
                setTimeout(() => {
                  const event = new CustomEvent('reopenUploadAudioModal')
                  window.dispatchEvent(event)
                }, 10)
              }}
              className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title="Show details"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
              </svg>
            </button>
          </div>
          <div className="w-full bg-light-body dark:bg-dark-body h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-violet-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <div
      className={`fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity duration-300 ${
        isClosing ? 'opacity-0' : modalIsOpen ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleModalClose()
        }
      }}
    >
      <div className={`bg-light-navbar dark:bg-dark-navbar text-light-text dark:text-dark-text border border-light-navbar/30 dark:border-dark-navbar/30 w-full max-w-xl p-6 rounded-2xl shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col transition-all duration-300 ease-out ${
        isClosing ? 'opacity-0 scale-95' : modalIsOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-light-navbar/10 dark:border-dark-navbar/10">
          <h2 className="text-xl font-bold">Upload Audio</h2>
          <button
            onClick={handleModalClose}
            className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleUpload} className="flex-1 overflow-y-auto mt-4 space-y-4 pr-1">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          {/* Audio Title Input */}
          <div className="space-y-1">
            <label htmlFor="audio-title" className="text-sm font-semibold text-light-text/70 dark:text-dark-text/70">
              Audio Title
            </label>
            <input
              id="audio-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isUploading}
              placeholder="Audio Title"
              className="w-full px-4 py-3 rounded-xl border border-light-navbar/30 dark:border-dark-navbar/30 bg-light-body dark:bg-dark-body focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-sm"
              required
            />
          </div>

          {/* Audio Description Input */}
          <div className="space-y-1">
            <label htmlFor="audio-description" className="text-sm font-semibold text-light-text/70 dark:text-dark-text/70">
              Description (Optional)
            </label>
            <textarea
              id="audio-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isUploading}
              placeholder="Audio description"
              rows={5}
              className="w-full px-4 py-3 rounded-xl border border-light-navbar/30 dark:border-dark-navbar/30 bg-light-body dark:bg-dark-body focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-sm resize-none no-scrollbar"
            />
          </div>

          {/* Audio File Drag & Drop Zone */}
          {!selectedAudio ? (
            <div
              onDragEnter={handleAudioDrag}
              onDragOver={handleAudioDrag}
              onDragLeave={handleAudioDrag}
              onDrop={handleAudioDrop}
              onClick={!isUploading ? () => audioInputRef.current?.click() : undefined}
              className={`
                border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 min-h-[120px]
                ${dragActiveAudio
                  ? 'border-violet-500 bg-violet-500/5'
                  : 'border-light-navbar/30 dark:border-dark-navbar/30 hover:border-light-text/50 dark:hover:border-dark-text/50 bg-light-body/50 dark:bg-dark-body/50'
                }
                ${isUploading ? 'pointer-events-none opacity-50' : ''}
              `}
            >
              <input
                ref={audioInputRef}
                type="file"
                onChange={handleAudioInputChange}
                accept={ALLOWED_AUDIO_EXTENSIONS.join(',')}
                className="hidden"
                disabled={isUploading}
              />
              
              <svg className="w-8 h-8 text-neutral-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              
              <p className="text-sm font-medium text-center">
                Drop audio here or <span className="text-violet-500 hover:underline">browse</span>
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                Supports MP3, M4A, AAC, OGG, WAV, FLAC
              </p>
            </div>
          ) : (
            <div className="bg-light-body/20 dark:bg-dark-body/20 border border-light-navbar/15 dark:border-dark-navbar/15 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <svg className="w-6 h-6 text-neutral-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  <p className="text-sm font-medium truncate">{selectedAudio.name}</p>
                  <p className="text-xs text-neutral-500">{formatBytes(selectedAudio.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveAudio}
                  className="p-2 rounded-full hover:bg-red-500/10 text-red-500 transition-colors"
                  title="Remove audio file"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Cover Art Drag & Drop Zone */}
          {!selectedThumbnail ? (
            <div
              onDragEnter={handleThumbnailDrag}
              onDragOver={handleThumbnailDrag}
              onDragLeave={handleThumbnailDrag}
              onDrop={handleThumbnailDrop}
              onClick={!isUploading ? () => thumbnailInputRef.current?.click() : undefined}
              className={`
                border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 min-h-[90px]
                ${dragActiveThumbnail
                  ? 'border-violet-500 bg-violet-500/5'
                  : 'border-light-navbar/30 dark:border-dark-navbar/30 hover:border-light-text/50 dark:hover:border-dark-text/50 bg-light-body/50 dark:bg-dark-body/50'
                }
                ${isUploading ? 'pointer-events-none opacity-50' : ''}
              `}
            >
              <input
                ref={thumbnailInputRef}
                type="file"
                onChange={handleThumbnailInputChange}
                accept={ALLOWED_IMAGE_EXTENSIONS.join(',')}
                className="hidden"
                disabled={isUploading}
              />
              
              <svg className="w-6 h-6 text-neutral-400 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              
              <p className="text-sm font-medium text-center">
                Drop cover art here or <span className="text-violet-500 hover:underline">browse</span>
              </p>
              <p className="text-xs text-neutral-500 mt-0.5">
                JPG, PNG, WEBP, GIF (optional)
              </p>
            </div>
          ) : (
            <div className="bg-light-body/20 dark:bg-dark-body/20 border border-light-navbar/15 dark:border-dark-navbar/15 rounded-xl p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <svg className="w-5 h-5 text-neutral-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs font-medium truncate">{selectedThumbnail.name}</p>
                  <p className="text-xs text-neutral-500">{formatBytes(selectedThumbnail.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveThumbnail}
                  className="p-1.5 rounded-full hover:bg-red-500/10 text-red-500 transition-colors"
                  title="Remove cover art"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Uploading progress bar */}
          {isUploading && (
            <div className="space-y-2 py-2">
              <div className="flex justify-between text-xs font-semibold">
                <span>Uploading audio...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-light-body dark:bg-dark-body h-2 rounded-full overflow-hidden border border-light-navbar/10 dark:border-dark-navbar/10">
                <div
                  className="bg-violet-500 h-full rounded-full transition-all duration-150 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Visibility Toggle */}
          <div className="space-y-2 pt-3 border-t border-light-navbar/10 dark:border-dark-navbar/10">
            <span className="text-sm font-semibold text-light-text/70 dark:text-dark-text/70 block">Visibility</span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setVisibility('private')}
                disabled={isUploading}
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
                disabled={isUploading}
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

          {/* Modal Footer actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-light-navbar/10 dark:border-dark-navbar/10">
            <button
              type="button"
              onClick={handleModalClose}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-light-navbar/10 dark:border-dark-navbar/10 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
            >
              {isUploading ? 'Minimize' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isUploading || !selectedAudio}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-800 disabled:text-neutral-500 disabled:opacity-50 transition-colors shadow-md"
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default UploadAudioModal
