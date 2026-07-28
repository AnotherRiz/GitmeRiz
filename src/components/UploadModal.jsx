import { useState, useEffect, useRef } from 'react'
import ImageModal from './ImageModal'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000'

/**
 * Generate thumbnail dari file image untuk preview (OPTIMIZED VERSION).
 * 
 * Optimizations:
 * 1. Uses URL.createObjectURL instead of FileReader (no Base64 overhead)
 * 2. Resize ke max 200x200px dengan JPEG quality 70%
 * 3. Proper cleanup dengan URL.revokeObjectURL
 */
const generateThumbnail = (file, maxWidth = 200, maxHeight = 200) => {
  return new Promise((resolve, reject) => {
    // Step 1: Create object URL directly from file (instant, no memory copy)
    const objectUrl = URL.createObjectURL(file)
    
    const img = new Image()
    
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl) // Cleanup on error
      reject(new Error('Failed to load image'))
    }
    
    img.onload = () => {
      // Cleanup object URL immediately after load
      URL.revokeObjectURL(objectUrl)
      
      try {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // Calculate new dimensions maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height
        
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        
        // Convert canvas to blob with JPEG compression
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(URL.createObjectURL(blob))
          } else {
            reject(new Error('Failed to generate thumbnail'))
          }
        }, 'image/jpeg', 0.7)
      } catch (error) {
        reject(error)
      }
    }
    
    // Trigger image load
    img.src = objectUrl
  })
}

/**
 * Queue system untuk generate thumbnail dengan concurrency limit.
 * Mencegah CPU overload saat processing banyak images sekaligus.
 */
class ThumbnailQueue {
  constructor(concurrency = 3) {
    this.concurrency = concurrency // Max parallel generations
    this.queue = []
    this.running = 0
  }

  async add(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject })
      this.process()
    })
  }

  async process() {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return
    }

    this.running++
    const { task, resolve, reject } = this.queue.shift()

    try {
      const result = await task()
      resolve(result)
    } catch (error) {
      reject(error)
    } finally {
      this.running--
      this.process() // Process next item in queue
    }
  }
}

// Create global queue instance (concurrency = 3 thumbnails at a time)
const thumbnailQueue = new ThumbnailQueue(3)

/**
 * ThumbnailPreview Component - Handles individual thumbnail with proper cleanup
 */
function ThumbnailPreview({ fileObj, onRemove, uploading, selectedFilesCount, onPreview }) {
  // Cleanup blob URL when component unmounts (prevents memory leak)
  useEffect(() => {
    return () => {
      if (fileObj.previewUrl) {
        URL.revokeObjectURL(fileObj.previewUrl)
      }
    }
  }, [fileObj.previewUrl])

  return (
    <div className="relative flex flex-col p-2 bg-light-card dark:bg-dark-card border border-light-card-border dark:border-dark-card-border rounded-xl group shadow-sm">
      <div className="relative aspect-video rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center cursor-pointer transition-all hover:opacity-80" onClick={() => fileObj.previewUrl && onPreview(fileObj)}>
        {fileObj.previewUrl ? (
          <img
            src={fileObj.previewUrl}
            alt={fileObj.title}
            className="h-full w-auto object-contain"
          />
        ) : (
          // Loading placeholder while thumbnail is being generated
          <div className="flex flex-col items-center justify-center text-neutral-400">
            <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-xs mt-2">Generating preview...</span>
          </div>
        )}
        
        {/* Individual Upload Status Overlay */}
        {fileObj.status === 'uploading' && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white text-xs font-semibold">
            <span>{fileObj.progress}%</span>
            <div className="w-12 bg-white/30 h-1 rounded-full overflow-hidden mt-1">
              <div className="bg-blue-500 h-full" style={{ width: `${fileObj.progress}%` }} />
            </div>
          </div>
        )}
        
        {fileObj.status === 'success' && (
          <div className="absolute inset-0 bg-green-500/80 flex items-center justify-center text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}

        {fileObj.status === 'error' && (
          <div className="absolute inset-0 bg-red-500/85 flex flex-col items-center justify-center text-white text-[10px] p-1 text-center">
            <svg className="w-4 h-4 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-semibold truncate w-full">{fileObj.error}</span>
          </div>
        )}
      </div>

      {/* Image Title (Text only for bulk upload, hidden if exactly 1 image is selected) */}
      {selectedFilesCount > 1 && (
        <div className="mt-2 px-1">
          <span className="text-[10px] opacity-50 block font-semibold">Image Title</span>
          <span className="text-xs font-semibold truncate block text-light-text/95 dark:text-dark-text/95" title={fileObj.title}>
            {fileObj.title}
          </span>
        </div>
      )}

      {/* Delete button (only available if not uploading/success) */}
      {!uploading && fileObj.status !== 'success' && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove(fileObj.id)
          }}
          className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full hover:bg-red-600 transition-colors shadow-md opacity-0 group-hover:opacity-100"
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

function UploadModal({ isOpen, isMinimized, onClose, onSuccess, onMinimize }) {
  const [selectedFiles, setSelectedFiles] = useState([])
  const [singleTitle, setSingleTitle] = useState('')
  const [visibility, setVisibility] = useState('private')
  const [dragActive, setDragActive] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [previewingFile, setPreviewingFile] = useState(null) // For click-to-preview
  const fileInputRef = useRef(null)
  const uploadInProgressRef = useRef(false) // Track if upload is actually running
  
  // Animation states (mirror ImageModal pattern)
  const [modalIsOpen, setModalIsOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  // Reset states when modal fully closes (not just minimized)
  useEffect(() => {
    if (!isOpen && !uploadInProgressRef.current) {
      // Cleanup all blob URLs to prevent memory leaks
      selectedFiles.forEach((f) => {
        if (f.previewUrl) {
          URL.revokeObjectURL(f.previewUrl)
        }
      })
      setSelectedFiles([])
      setSingleTitle('')
      setVisibility('private')
      setProgress(0)
      setUploading(false)
      setError('')
      setModalIsOpen(false)
      setIsClosing(false)
    }
  }, [isOpen])

  // Trigger open animation (mirror ImageModal pattern)
  useEffect(() => {
    if (isOpen && !isMinimized) {
      // Small delay to trigger CSS transition
      const timer = setTimeout(() => {
        setModalIsOpen(true)
        setIsClosing(false)
      }, 10)
      return () => clearTimeout(timer)
    }
  }, [isOpen, isMinimized])

  // Handle ESC key press - allow closing even during upload
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleModalClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Handle paste event (Ctrl+V) for image upload
  useEffect(() => {
    if (!isOpen || isMinimized) return

    const handlePaste = (e) => {
      // Don't hijack paste when user is typing in text inputs
      const el = document.activeElement
      const isTyping =
        el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
      if (isTyping) return

      // Check clipboard for image items
      const items = e.clipboardData?.items
      if (!items) return

      const pastedFiles = []
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        
        // Skip non-file items
        if (item.kind !== 'file') continue
        
        // Skip non-image items
        if (!item.type.startsWith('image/')) continue
        
        const blob = item.getAsFile()
        if (!blob) continue

        // Build timestamped filename with milliseconds for uniqueness
        const now = new Date()
        const pad = (n) => String(n).padStart(2, '0')
        const ms = String(now.getMilliseconds()).padStart(3, '0')
        const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${ms}`
        const ext = (blob.type.split('/')[1] || 'png').replace('jpeg', 'jpg')
        const fileName = `image_${stamp}.${ext}`
        
        // Convert blob to File object
        const file = new File([blob], fileName, { type: blob.type })
        pastedFiles.push(file)
      }

      if (pastedFiles.length > 0) {
        e.preventDefault()
        handleAddFiles(pastedFiles)
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [isOpen, isMinimized])

  // Helper to close/minimize modal with animation
  const handleModalClose = () => {
    if (uploadInProgressRef.current && onMinimize) {
      // Upload in progress: minimize instead of closing (with fade out)
      setIsClosing(true)
      setTimeout(() => {
        onMinimize()
        setIsClosing(false)
      }, 300)
    } else {
      // No upload or no minimize handler: normal close with fade out
      setIsClosing(true)
      setTimeout(() => {
        onClose()
      }, 300)
    }
  }

  if (!isOpen && !isMinimized) return null

  // If minimized during upload, show a compact progress indicator instead of full modal
  if (isMinimized && uploading) {
    const successCount = selectedFiles.filter(f => f.status === 'success').length
    const totalCount = selectedFiles.length
    
    return (
      <div className="fixed bottom-6 right-6 z-[100] animate-fade-in">
        <div className="bg-light-navbar dark:bg-dark-navbar text-light-text dark:text-dark-text border border-light-navbar/30 dark:border-dark-navbar/30 px-5 py-4 rounded-2xl shadow-2xl min-w-[280px]">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <div>
                <p className="text-sm font-semibold">Uploading images...</p>
                <p className="text-xs opacity-60">{successCount} / {totalCount} complete</p>
              </div>
            </div>
            <button
              onClick={() => {
                // Re-open modal to show full details
                onClose()
                setTimeout(() => {
                  const event = new CustomEvent('reopenUploadModal')
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
              className="bg-blue-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  // Don't render the full modal if it's closed or minimized
  if (!isOpen) return null

  const handleAddFiles = (newFilesList) => {
    setError('')
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'svg', 'raw', 'cr2', 'nef', 'dng']
    const incomingFiles = Array.from(newFilesList)

    if (selectedFiles.length + incomingFiles.length > 50) {
      setError('Maximum 50 images allowed at a time.')
      return
    }

    const processed = []
    for (const f of incomingFiles) {
      const ext = f.name.split('.').pop().toLowerCase()
      if (!allowedExtensions.includes(ext)) {
        setError(`Unsupported file format: ${f.name}. Allowed: ${allowedExtensions.join(', ')}`)
        return
      }
      if (f.size > 100 * 1024 * 1024) {
        setError(`File size exceeds 100MB limit: ${f.name}`)
        return
      }

      const nameWithoutExt = f.name.substring(0, f.name.lastIndexOf('.'))
      const fileId = Math.random().toString(36).substring(2, 9)
      
      // Add file immediately with placeholder (no blocking)
      processed.push({
        file: f,
        id: fileId,
        title: nameWithoutExt,
        previewUrl: null, // Will be set asynchronously
        progress: 0,
        status: 'pending',
        error: ''
      })

      // Add to thumbnail generation queue (max 3 concurrent)
      thumbnailQueue.add(() => generateThumbnail(f))
        .then(thumbnailUrl => {
          // Update preview URL when ready
          setSelectedFiles(prev => 
            prev.map(fileObj => 
              fileObj.id === fileId 
                ? { ...fileObj, previewUrl: thumbnailUrl }
                : fileObj
            )
          )
        })
        .catch(err => {
          console.warn('Failed to generate thumbnail for', f.name, err)
          // Fallback to original file if thumbnail generation fails
          const fallbackUrl = URL.createObjectURL(f)
          setSelectedFiles(prev => 
            prev.map(fileObj => 
              fileObj.id === fileId 
                ? { ...fileObj, previewUrl: fallbackUrl }
                : fileObj
            )
          )
        })
    }

    // Use functional update to avoid stale closure when called rapidly (e.g. paste twice)
    setSelectedFiles(prev => {
      const nextFiles = [...prev, ...processed]
      
      // Handle single title sync
      if (nextFiles.length === 1) {
        if (singleTitle) {
          nextFiles[0].title = singleTitle
        } else {
          setSingleTitle(nextFiles[0].title)
        }
      }
      
      return nextFiles
    })
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleAddFiles(e.target.files)
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
      handleAddFiles(e.dataTransfer.files)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current.click()
  }

  const handleRemoveFile = (id) => {
    setSelectedFiles((prev) => {
      const target = prev.find((f) => f.id === id)
      if (target && target.previewUrl) {
        // Cleanup blob URL to prevent memory leak
        URL.revokeObjectURL(target.previewUrl)
      }
      const next = prev.filter((f) => f.id !== id)
      if (next.length === 0) {
        setSingleTitle('')
      } else if (next.length === 1) {
        setSingleTitle(next[0].title)
      }
      return next
    })
  }

  const handleSingleTitleChange = (val) => {
    setSingleTitle(val)
    setSelectedFiles((prev) =>
      prev.map((f) => (prev.length === 1 ? { ...f, title: val } : f))
    )
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (selectedFiles.length === 0) {
      setError('Please select at least one image.')
      return
    }

    setUploading(true)
    uploadInProgressRef.current = true // Mark upload as in progress
    setError('')
    setProgress(0)

    const totalBytes = selectedFiles.reduce((acc, f) => acc + f.file.size, 0)
    const loadedBytesMap = {}

    const uploadSingleFile = (fileObj) => {
      return new Promise((resolve, reject) => {
        setSelectedFiles((prev) =>
          prev.map((f) => (f.id === fileObj.id ? { ...f, status: 'uploading' } : f))
        )

        const formData = new FormData()
        formData.append('file', fileObj.file)
        formData.append('title', fileObj.title)
        formData.append('visibility', visibility)

        const xhr = new XMLHttpRequest()
        xhr.open('POST', `${BASE_URL}/gallery`)

        const token = localStorage.getItem('token')
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`)
        }

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            loadedBytesMap[fileObj.id] = e.loaded
            
            // Calculate overall progress based on loaded bytes
            const totalLoaded = Object.values(loadedBytesMap).reduce((acc, bytes) => acc + bytes, 0)
            const percentage = Math.round((totalLoaded / totalBytes) * 100)
            setProgress(Math.min(percentage, 99))

            // Update individual item progress
            const individualPercent = Math.round((e.loaded / e.total) * 100)
            setSelectedFiles((prev) =>
              prev.map((f) =>
                f.id === fileObj.id ? { ...f, progress: individualPercent } : f
              )
            )
          }
        })

        xhr.onload = () => {
          let responseData = {}
          try {
            responseData = JSON.parse(xhr.responseText)
          } catch (err) {}

          if (xhr.status >= 200 && xhr.status < 300) {
            loadedBytesMap[fileObj.id] = fileObj.file.size
            setSelectedFiles((prev) =>
              prev.map((f) =>
                f.id === fileObj.id ? { ...f, status: 'success', progress: 100 } : f
              )
            )
            onSuccess(responseData.data)
            resolve(responseData.data)
          } else {
            const errorMsg = responseData.error || 'Upload failed'
            setSelectedFiles((prev) =>
              prev.map((f) =>
                f.id === fileObj.id ? { ...f, status: 'error', error: errorMsg } : f
              )
            )
            reject(new Error(errorMsg))
          }
        }

        xhr.onerror = () => {
          setSelectedFiles((prev) =>
            prev.map((f) =>
              f.id === fileObj.id ? { ...f, status: 'error', error: 'Network error' } : f
            )
          )
          reject(new Error('Network error'))
        }

        xhr.send(formData)
      })
    }

    // Upload all files in parallel using Promise.allSettled
    const uploadPromises = selectedFiles
      .filter(fileObj => fileObj.status !== 'success')
      .map(fileObj => uploadSingleFile(fileObj))

    const results = await Promise.allSettled(uploadPromises)

    // Check if any uploads failed
    const hasError = results.some(result => result.status === 'rejected')

    setUploading(false)
    uploadInProgressRef.current = false // Mark upload as complete
    setProgress(100) // Set to 100% when done
    
    if (!hasError) {
      onClose()
    } else {
      setError('Some files failed to upload. Review details below.')
    }
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
      <div className={`bg-light-navbar dark:bg-dark-navbar text-light-text dark:text-dark-text border border-light-navbar/30 dark:border-dark-navbar/30 w-full max-w-lg p-6 rounded-2xl shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col transition-all duration-300 ease-out ${
        isClosing ? 'opacity-0 scale-95' : modalIsOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-light-navbar/10 dark:border-dark-navbar/10">
          <div className="flex items-baseline gap-2">
            <h2 className="text-xl font-bold">Upload Image</h2>
            {selectedFiles.length > 1 && (
              <span className="text-xs opacity-60">({selectedFiles.length}/50)</span>
            )}
          </div>
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
        <form onSubmit={handleUpload} className="flex-1 overflow-y-auto mt-4 space-y-4 pr-1 no-scrollbar">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          {/* Top Section - Image Name (Visible when 0 or 1 image is selected) */}
          {selectedFiles.length <= 1 && (
            <div className="space-y-1 animate-fadeIn">
              <label htmlFor="image-title" className="text-sm font-semibold text-light-text/70 dark:text-dark-text/70">
                Image Name
              </label>
              <input
                id="image-title"
                type="text"
                value={singleTitle}
                onChange={(e) => handleSingleTitleChange(e.target.value)}
                disabled={uploading}
                placeholder="Enter a title for your image"
                className="w-full px-4 py-3 rounded-xl border border-light-navbar/30 dark:border-dark-navbar/30 bg-light-body dark:bg-dark-body focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                required={selectedFiles.length === 1}
              />
            </div>
          )}

          {/* Middle Section - Drag & Drop Zone */}
          {selectedFiles.length < 50 && (
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={!uploading ? triggerFileInput : undefined}
              className={`
                border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 min-h-[120px]
                ${dragActive
                  ? 'border-blue-500 bg-blue-500/5'
                  : 'border-light-navbar/30 dark:border-dark-navbar/30 hover:border-light-text/50 dark:hover:border-dark-text/50 bg-light-body/50 dark:bg-dark-body/50'
                }
                ${uploading ? 'pointer-events-none opacity-50' : ''}
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
                multiple
                disabled={uploading}
              />
              
              <svg className="w-8 h-8 text-neutral-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              
              <p className="text-sm font-medium text-center">
                Drop image here, paste, or <span className="text-blue-500 hover:underline">browse</span>
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                Supports up to 50 images.
              </p>
            </div>
          )}

          {/* Bottom Section - Preview Grid (supports up to 50 previews) */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm font-semibold text-light-text/70 dark:text-dark-text/70">
                Selected Images ({selectedFiles.length})
              </span>
              <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto p-1 border border-light-navbar/15 dark:border-dark-navbar/15 rounded-xl bg-light-body/20 dark:bg-dark-body/20 no-scrollbar">
                {selectedFiles.map((fileObj) => (
                  <ThumbnailPreview
                    key={fileObj.id}
                    fileObj={fileObj}
                    onRemove={handleRemoveFile}
                    uploading={uploading}
                    selectedFilesCount={selectedFiles.length}
                    onPreview={setPreviewingFile}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Uploading Status / Progress Bar */}
          {uploading && (
            <div className="space-y-2 py-2">
              <div className="flex justify-between text-xs font-semibold">
                <span>Uploading all files...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-light-body dark:bg-dark-body h-2 rounded-full overflow-hidden border border-light-navbar/10 dark:border-dark-navbar/10">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-150 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Visibility Selector */}
          <div className="space-y-2 pt-3 border-t border-light-navbar/10 dark:border-dark-navbar/10">
            <span className="text-sm font-semibold text-light-text/70 dark:text-dark-text/70 block">Visibility</span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setVisibility('private')}
                disabled={uploading}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-semibold transition-all ${
                  visibility === 'private'
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
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
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
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
              onClick={handleModalClose}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-light-navbar/10 dark:border-dark-navbar/10 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
            >
              {uploading ? 'Minimize' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={uploading || selectedFiles.length === 0 || selectedFiles.every(f => f.status === 'success')}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-800 disabled:text-neutral-500 disabled:opacity-50 transition-colors shadow-md"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>

      {/* Preview Modal - click-to-preview for local files */}
      {previewingFile && (
        <ImageModal
          imageUrl={previewingFile.previewUrl}
          title={previewingFile.title}
          disableDownload={true}
          onClose={() => setPreviewingFile(null)}
        />
      )}
    </div>
  )
}

export default UploadModal
