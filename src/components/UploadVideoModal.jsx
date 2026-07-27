import { useState, useEffect, useRef } from 'react'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000'

/**
 * VideoPreview Component - Displays a single video file card with upload status feedback.
 */
function VideoPreview({ fileObj, onRemove, uploading }) {
  // Format bytes helper
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="relative flex flex-col p-3 bg-light-card dark:bg-dark-card border border-light-card-border dark:border-dark-card-border rounded-xl group shadow-sm">
      <div className="relative aspect-video rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-900 flex flex-col items-center justify-center p-2 text-center">
        {/* Generic Video File Icon */}
        <svg className="w-10 h-10 text-neutral-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <span className="text-[10px] text-neutral-500 font-semibold truncate w-full px-2" title={fileObj.file.name}>
          {fileObj.file.name}
        </span>
        <span className="text-[9px] text-neutral-400 mt-0.5">
          {formatBytes(fileObj.file.size)}
        </span>
        
        {/* Individual Upload Status Overlay */}
        {fileObj.status === 'uploading' && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white text-xs font-semibold rounded-lg">
            <span>{fileObj.progress}%</span>
            <div className="w-16 bg-white/30 h-1 rounded-full overflow-hidden mt-1.5">
              <div className="bg-violet-500 h-full" style={{ width: `${fileObj.progress}%` }} />
            </div>
          </div>
        )}
        
        {/* Success Overlay */}
        {fileObj.status === 'success' && (
          <div className="absolute inset-0 bg-green-500/80 flex flex-col items-center justify-center text-white text-[11px] font-semibold rounded-lg">
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
            <span>Uploaded</span>
          </div>
        )}

        {/* Error Overlay */}
        {fileObj.status === 'error' && (
          <div className="absolute inset-0 bg-red-500/85 flex flex-col items-center justify-center text-white text-[10px] p-2 text-center rounded-lg">
            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-semibold truncate w-full" title={fileObj.error}>{fileObj.error}</span>
          </div>
        )}
      </div>

      {/* Delete button (only available if not uploading/success) */}
      {!uploading && fileObj.status !== 'success' && (
        <button
          type="button"
          onClick={() => onRemove(fileObj.id)}
          className="absolute top-1 right-1 bg-black/60 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors shadow-md opacity-0 group-hover:opacity-100"
          title="Remove file"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

/**
 * ThumbnailPreview Component - Displays selected thumbnail preview with remove button.
 */
function ThumbnailPreview({ file, onRemove, uploading }) {
  return (
    <div className="relative inline-block">
      <div className="w-24 h-24 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center group">
        <img
          src={URL.createObjectURL(file)}
          alt="Thumbnail preview"
          className="w-full h-full object-cover"
        />
        
        {/* Remove button */}
        {!uploading && (
          <button
            type="button"
            onClick={onRemove}
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
  )
}

/**
 * UploadVideoModal Component - Handles single video upload with optional custom thumbnail.
 * Supports drag-and-drop and file selection with title, description, and visibility controls.
 */
function UploadVideoModal({ isOpen, isMinimized, onClose, onSuccess, onMinimize }) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedThumbnail, setSelectedThumbnail] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState('private')
  const [dragActive, setDragActive] = useState(false)
  const [thumbnailDragActive, setThumbnailDragActive] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)
  const thumbnailInputRef = useRef(null)
  const uploadInProgressRef = useRef(false)
  
  // Animation states
  const [modalIsOpen, setModalIsOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  // Reset states when modal fully closes
  useEffect(() => {
    if (!isOpen && !uploadInProgressRef.current) {
      setSelectedFile(null)
      setSelectedThumbnail(null)
      setTitle('')
      setDescription('')
      setVisibility('private')
      setProgress(0)
      setUploading(false)
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

  if (!isOpen && !isMinimized) return null

  // Minimized layout shown during upload
  if (isMinimized && uploading) {
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
                <p className="text-sm font-semibold">Uploading video...</p>
                <p className="text-xs opacity-60">{progress}% complete</p>
              </div>
            </div>
            <button
              onClick={() => {
                onClose()
                setTimeout(() => {
                  const event = new CustomEvent('reopenUploadVideoModal')
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
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  if (!isOpen) return null

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

  const handleAddFile = (filesList) => {
    setError('')
    const allowedExtensions = ['mp4', 'webm', 'mov', 'avi', 'mkv']
    const incomingFiles = Array.from(filesList)

    if (incomingFiles.length === 0) return

    const file = incomingFiles[0] // Only accept first file
    const ext = file.name.split('.').pop().toLowerCase()
    
    if (!allowedExtensions.includes(ext)) {
      setError(`Unsupported format: ${file.name}. Allowed: ${allowedExtensions.join(', ')}`)
      return
    }

    const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'))
    
    setSelectedFile({
      file: file,
      id: Math.random().toString(36).substring(2, 9),
      title: nameWithoutExt,
      progress: 0,
      status: 'pending',
      error: ''
    })
    
    // Auto-populate title if not already set
    if (!title) {
      setTitle(nameWithoutExt)
    }
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

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleAddFile(e.target.files)
    }
  }

  const handleThumbnailFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleThumbnailChange(e.target.files)
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddFile(e.dataTransfer.files)
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

  const triggerFileInput = () => {
    fileInputRef.current.click()
  }

  const triggerThumbnailInput = () => {
    thumbnailInputRef.current.click()
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
  }

  const handleRemoveThumbnail = () => {
    setSelectedThumbnail(null)
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!selectedFile) {
      setError('Please select a video.')
      return
    }

    if (!title.trim()) {
      setError('Title is required.')
      return
    }

    setUploading(true)
    uploadInProgressRef.current = true
    setError('')
    setProgress(0)

    try {
      // Upload video
      await uploadVideo()
    } catch (err) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      uploadInProgressRef.current = false
    }
  }

  const uploadVideo = () => {
    return new Promise((resolve, reject) => {
      const fileObj = selectedFile
      
      const formData = new FormData()
      formData.append('file', fileObj.file)
      formData.append('title', title.trim())
      formData.append('visibility', visibility)
      if (description.trim() !== '') {
        formData.append('description', description.trim())
      }
      if (selectedThumbnail) {
        formData.append('thumbnail', selectedThumbnail)
      }

      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${BASE_URL}/video`)

      const token = localStorage.getItem('token')
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      }

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentage = Math.round((e.loaded / e.total) * 100)
          setProgress(Math.min(percentage, 99))
          
          setSelectedFile((prev) =>
            prev ? { ...prev, progress: percentage } : null
          )
        }
      })

      xhr.onload = () => {
        let responseData = {}
        try {
          responseData = JSON.parse(xhr.responseText)
        } catch (_err) {}

        // Backend responds with 202 Accepted for background processing
        if (xhr.status >= 200 && xhr.status < 300) {
          setProgress(100)
          setSelectedFile((prev) =>
            prev ? { ...prev, status: 'success', progress: 100 } : null
          )
          onSuccess(responseData.data)
          
          // Close modal after short delay
          setTimeout(() => {
            onClose()
          }, 800)
          
          resolve(responseData.data)
        } else {
          const errorMsg = responseData.error || 'Upload failed'
          setSelectedFile((prev) =>
            prev ? { ...prev, status: 'error', error: errorMsg } : null
          )
          reject(new Error(errorMsg))
        }
      }

      xhr.onerror = () => {
        setSelectedFile((prev) =>
          prev ? { ...prev, status: 'error', error: 'Network error' } : null
        )
        reject(new Error('Network error'))
      }

      xhr.send(formData)
    })
  }

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
          <h2 className="text-xl font-bold">Upload Video</h2>
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

          {/* Title Input (Required) */}
          <div className="space-y-1">
            <label htmlFor="video-title" className="text-sm font-semibold text-light-text/70 dark:text-dark-text/70">
              Title (Required)
            </label>
            <input
              id="video-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={uploading}
              placeholder="Video title"
              className="w-full px-4 py-3 rounded-xl border border-light-navbar/30 dark:border-dark-navbar/30 bg-light-body dark:bg-dark-body focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-sm"
              required
            />
          </div>

          {/* Description Input */}
          <div className="space-y-1">
            <label htmlFor="video-description" className="text-sm font-semibold text-light-text/70 dark:text-dark-text/70">
              Description (Optional)
            </label>
            <textarea
              id="video-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={uploading}
              placeholder="Video description"
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-light-navbar/30 dark:border-dark-navbar/30 bg-light-body dark:bg-dark-body focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-sm resize-none no-scrollbar"
            />
          </div>

          {/* Video Drag & Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={!uploading ? triggerFileInput : undefined}
            className={`
              border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 min-h-[120px]
              ${dragActive
                ? 'border-violet-500 bg-violet-500/5'
                : 'border-light-navbar/30 dark:border-dark-navbar/30 hover:border-light-text/50 dark:hover:border-dark-text/50 bg-light-body/50 dark:bg-dark-body/50'
              }
              ${uploading ? 'pointer-events-none opacity-50' : ''}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-matroska,video/*"
              className="hidden"
              disabled={uploading}
            />
            
            <svg className="w-8 h-8 text-neutral-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            
            <p className="text-sm font-medium text-center">
              Drop video here or <span className="text-violet-500 hover:underline">browse</span>
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Supports MP4, WebM, MOV, AVI, MKV
            </p>
          </div>

          {/* Selected Video Preview */}
          {selectedFile && (
            <div className="space-y-2">
              <span className="text-sm font-semibold text-light-text/70 dark:text-dark-text/70">
                Selected Video
              </span>
              <VideoPreview
                fileObj={selectedFile}
                onRemove={handleRemoveFile}
                uploading={uploading}
              />
            </div>
          )}

          {/* Thumbnail Section */}
          <div className="space-y-3 pt-3 border-t border-light-navbar/10 dark:border-dark-navbar/10">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-light-text/70 dark:text-dark-text/70">
                Custom Thumbnail (Optional)
              </label>
              <p className="text-xs text-neutral-500">
                JPG, PNG, WebP, or GIF (Max 5MB)
              </p>
            </div>

            {/* Thumbnail Preview */}
            {selectedThumbnail && (
              <div className="space-y-2">
                <ThumbnailPreview
                  file={selectedThumbnail}
                  onRemove={handleRemoveThumbnail}
                  uploading={uploading}
                />
              </div>
            )}

            {/* Thumbnail Drag & Drop Zone */}
            {!selectedThumbnail && (
              <div
                onDragEnter={handleThumbnailDrag}
                onDragOver={handleThumbnailDrag}
                onDragLeave={handleThumbnailDrag}
                onDrop={handleThumbnailDrop}
                onClick={!uploading ? triggerThumbnailInput : undefined}
                className={`
                  border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 min-h-[100px]
                  ${thumbnailDragActive
                    ? 'border-violet-500 bg-violet-500/5'
                    : 'border-light-navbar/30 dark:border-dark-navbar/30 hover:border-light-text/50 dark:hover:border-dark-text/50 bg-light-body/50 dark:bg-dark-body/50'
                  }
                  ${uploading ? 'pointer-events-none opacity-50' : ''}
                `}
              >
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  onChange={handleThumbnailFileChange}
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  className="hidden"
                  disabled={uploading}
                />
                
                <svg className="w-6 h-6 text-neutral-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                
                <p className="text-sm font-medium text-center">
                  Drop thumbnail or <span className="text-violet-500 hover:underline">browse</span>
                </p>
              </div>
            )}
          </div>

          {/* Visibility Toggle */}
          <div className="space-y-2 pt-3 border-t border-light-navbar/10 dark:border-dark-navbar/10">
            <span className="text-sm font-semibold text-light-text/70 dark:text-dark-text/70 block">Visibility</span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setVisibility('private')}
                disabled={uploading}
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
                disabled={uploading}
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

          {/* Uploading progress bar */}
          {uploading && (
            <div className="space-y-2 py-2">
              <div className="flex justify-between text-xs font-semibold">
                <span>Uploading...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-light-body dark:bg-dark-body h-2 rounded-full overflow-hidden border border-light-navbar/10 dark:border-dark-navbar/10">
                <div
                  className="bg-violet-500 h-full rounded-full transition-all duration-150 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Modal Footer actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-light-navbar/10 dark:border-dark-navbar/10">
            <button
              type="button"
              onClick={handleModalClose}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-light-navbar/10 dark:border-dark-navbar/10 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
            >
              {uploading ? 'Minimize' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-800 disabled:text-neutral-500 disabled:opacity-50 transition-colors shadow-md"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default UploadVideoModal
