import { useState, useRef, useEffect } from 'react'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000'
const ALLOWED_AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.aac', '.ogg', '.wav', '.flac']
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif']

function UploadAudioModal({ isOpen, isMinimized, onClose, onSuccess, onMinimize }) {
  const [selectedAudio, setSelectedAudio] = useState(null)
  const [selectedThumbnail, setSelectedThumbnail] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState('private')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  const audioInputRef = useRef(null)
  const thumbnailInputRef = useRef(null)
  const uploadInProgressRef = useRef(false)

  const getFileExtension = (filename) => {
    const lastDot = filename.lastIndexOf('.')
    return lastDot !== -1 ? filename.substring(lastDot).toLowerCase() : ''
  }

  const handleAudioSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const ext = getFileExtension(file.name)
    if (!ALLOWED_AUDIO_EXTENSIONS.includes(ext)) {
      setError(`Invalid audio format. Allowed: ${ALLOWED_AUDIO_EXTENSIONS.join(', ')}`)
      setSelectedAudio(null)
      return
    }

    setError('')
    setSelectedAudio(file)
    if (!title) {
      setTitle(file.name.substring(0, file.name.lastIndexOf('.')) || file.name)
    }
  }

  const handleThumbnailSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const ext = getFileExtension(file.name)
    if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
      setError(`Invalid image format. Allowed: ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}`)
      setSelectedThumbnail(null)
      return
    }

    setError('')
    setSelectedThumbnail(file)
  }

  const handleUpload = async () => {
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
          setUploadProgress(percentage)
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
          setSelectedAudio(null)
          setSelectedThumbnail(null)
          setTitle('')
          setDescription('')
          setVisibility('private')
          setUploadProgress(0)
          onSuccess?.(responseData.data)
          onClose()
          resolve(responseData.data)
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

  // Reset when modal opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setError('')
      setUploadProgress(0)
    }
  }, [isOpen, isMinimized])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      uploadInProgressRef.current = false
    }
  }, [])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      {!isMinimized && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}

      {/* Modal */}
      <div
        className={`fixed z-50 transition-all duration-300 ${
          isMinimized
            ? 'bottom-4 right-4 w-64'
            : 'inset-0 flex items-center justify-center p-4'
        }`}
      >
        <div
          className={`bg-light-card dark:bg-dark-card border border-light-card-border dark:border-dark-card-border rounded-2xl shadow-lg ${
            isMinimized ? 'p-3' : 'w-full max-w-md p-6'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className={`font-bold ${isMinimized ? 'text-sm' : 'text-lg'}`}>
              Upload Audio
            </h2>
            <div className="flex gap-2">
              {!isMinimized && (
                <button
                  onClick={onMinimize}
                  className="p-1 hover:opacity-60 transition-opacity"
                  title="Minimize"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                  </svg>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1 hover:opacity-60 transition-opacity"
                title="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Minimized state */}
          {isMinimized ? (
            <p className="text-xs opacity-60">Upload in progress...</p>
          ) : (
            <>
              {/* Error banner */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs px-3 py-2 rounded-lg mb-4">
                  {error}
                </div>
              )}

              {/* Form fields */}
              <div className="space-y-4">
                {/* Audio file */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Audio File *
                  </label>
                  <button
                    onClick={() => audioInputRef.current?.click()}
                    className="w-full px-4 py-2 border border-light-card-border dark:border-dark-card-border rounded-lg hover:bg-light-body dark:hover:bg-dark-body transition-colors text-sm"
                  >
                    {selectedAudio ? selectedAudio.name : 'Choose file'}
                  </button>
                  <input
                    ref={audioInputRef}
                    type="file"
                    accept={ALLOWED_AUDIO_EXTENSIONS.join(',')}
                    onChange={handleAudioSelect}
                    className="hidden"
                  />
                  <p className="text-xs opacity-60 mt-1">
                    Allowed: {ALLOWED_AUDIO_EXTENSIONS.join(', ')}
                  </p>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-light-input dark:bg-dark-input border border-light-card-border dark:border-dark-card-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Audio title"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows="3"
                    className="w-full px-3 py-2 bg-light-input dark:bg-dark-input border border-light-card-border dark:border-dark-card-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Optional description"
                  />
                </div>

                {/* Cover art thumbnail */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Cover Art (optional)
                  </label>
                  <button
                    onClick={() => thumbnailInputRef.current?.click()}
                    className="w-full px-4 py-2 border border-light-card-border dark:border-dark-card-border rounded-lg hover:bg-light-body dark:hover:bg-dark-body transition-colors text-sm"
                  >
                    {selectedThumbnail ? selectedThumbnail.name : 'Choose image'}
                  </button>
                  <input
                    ref={thumbnailInputRef}
                    type="file"
                    accept={ALLOWED_IMAGE_EXTENSIONS.join(',')}
                    onChange={handleThumbnailSelect}
                    className="hidden"
                  />
                  <p className="text-xs opacity-60 mt-1">
                    Allowed: {ALLOWED_IMAGE_EXTENSIONS.join(', ')}
                  </p>
                </div>

                {/* Visibility */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Visibility
                  </label>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value)}
                    className="w-full px-3 py-2 bg-light-input dark:bg-dark-input border border-light-card-border dark:border-dark-card-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="private">Private</option>
                    <option value="public">Public</option>
                  </select>
                </div>

                {/* Progress bar */}
                {isUploading && (
                  <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={onClose}
                    disabled={isUploading}
                    className="flex-1 px-4 py-2 border border-light-card-border dark:border-dark-card-border rounded-lg hover:bg-light-body dark:hover:bg-dark-body transition-colors text-sm disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={isUploading || !selectedAudio}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm disabled:opacity-50"
                  >
                    {isUploading ? `Uploading... ${uploadProgress}%` : 'Upload'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default UploadAudioModal
