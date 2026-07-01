import { useState, useEffect, useRef } from 'react'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000'

function UploadModal({ isOpen, onClose, onSuccess }) {
  const [selectedFiles, setSelectedFiles] = useState([])
  const [singleTitle, setSingleTitle] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  // Reset states when modal closes/opens
  useEffect(() => {
    if (!isOpen) {
      selectedFiles.forEach((f) => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl)
      })
      setSelectedFiles([])
      setSingleTitle('')
      setProgress(0)
      setUploading(false)
      setError('')
    }
  }, [isOpen])

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !uploading) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, uploading])

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
      processed.push({
        file: f,
        id: Math.random().toString(36).substring(2, 9),
        title: nameWithoutExt,
        previewUrl: URL.createObjectURL(f),
        progress: 0,
        status: 'pending',
        error: ''
      })
    }

    const nextFiles = [...selectedFiles, ...processed]
    if (nextFiles.length === 1) {
      if (singleTitle) {
        nextFiles[0].title = singleTitle
      } else {
        setSingleTitle(nextFiles[0].title)
      }
    }
    setSelectedFiles(nextFiles)
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

        const xhr = new XMLHttpRequest()
        xhr.open('POST', `${BASE_URL}/api/gallery`)

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

    let hasError = false
    for (const fileObj of selectedFiles) {
      if (fileObj.status === 'success') continue
      try {
        await uploadSingleFile(fileObj)
      } catch (err) {
        hasError = true
        console.error('File upload failed:', fileObj.file.name, err)
      }
    }

    setUploading(false)
    if (!hasError) {
      onClose()
    } else {
      setError('Some files failed to upload. Review details below.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (!uploading && e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="bg-light-navbar dark:bg-dark-navbar text-light-text dark:text-dark-text border border-light-navbar/30 dark:border-dark-navbar/30 w-full max-w-lg p-6 rounded-2xl shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-light-navbar/10 dark:border-dark-navbar/10">
          <div className="flex items-baseline gap-2">
            <h2 className="text-xl font-bold">Upload Image</h2>
            {selectedFiles.length > 1 && (
              <span className="text-xs opacity-60">({selectedFiles.length}/50)</span>
            )}
          </div>
          {!uploading && (
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Form Content */}
        <form onSubmit={handleUpload} className="flex-1 overflow-y-auto mt-4 space-y-4 pr-1">
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
                Drag & drop files here, or <span className="text-blue-500 hover:underline">browse</span>
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                Supports up to 50 images. Max 100MB per file.
              </p>
            </div>
          )}

          {/* Bottom Section - Preview Grid (supports up to 50 previews) */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm font-semibold text-light-text/70 dark:text-dark-text/70">
                Selected Images ({selectedFiles.length})
              </span>
              <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto p-1 border border-light-navbar/15 dark:border-dark-navbar/15 rounded-xl bg-light-body/20 dark:bg-dark-body/20">
                {selectedFiles.map((fileObj) => (
                  <div
                    key={fileObj.id}
                    className="relative flex flex-col p-2 bg-light-card dark:bg-dark-card border border-light-card-border dark:border-dark-card-border rounded-xl group shadow-sm"
                  >
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
                      <img
                        src={fileObj.previewUrl}
                        alt={fileObj.title}
                        className="h-full w-auto object-contain"
                      />
                      
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
                    {selectedFiles.length > 1 && (
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
                        onClick={() => handleRemoveFile(fileObj.id)}
                        className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full hover:bg-red-600 transition-colors shadow-md opacity-0 group-hover:opacity-100"
                        title="Remove file"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
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

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-light-navbar/10 dark:border-dark-navbar/10">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-light-navbar/10 dark:border-dark-navbar/10 hover:bg-neutral-200 dark:hover:bg-neutral-800 disabled:opacity-50 transition-colors"
            >
              Cancel
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
    </div>
  )
}

export default UploadModal
