import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getShortId } from '../lib/shortId'
import ConfirmModal from './ConfirmModal'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

/**
 * Full-screen image viewer with zoom in/out and grab-to-pan support.
 * 
 * Features:
 * - Fetch-based image loading to detect 401/403 errors
 * - Custom grab/grabbing cursor animation while panning
 * - Zoom limits to keep image in viewport
 * - Click outside image to close
 * - Friendly error pages for unauthorized access
 */
function ImageModal({ image, onClose }) {
  const navigate = useNavigate()
  const shortId = getShortId(image)
  const [imageSrc, setImageSrc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null) // { code: 401 | 403 } or string
  
  // State untuk zoom & pan
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  
  // State untuk animasi
  const [isClosing, setIsClosing] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  
  // State untuk download
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState(null) // Error message for download alert modal
  
  // Ref untuk anchor point (tidak trigger re-render)
  const anchorPoint = useRef({ x: 0, y: 0 })
  const zoomContainerRef = useRef(null)

  // Event wheel untuk zoom dengan scroll (non-pasif)
  useEffect(() => {
    const container = zoomContainerRef.current
    if (!container) return

    const handleWheel = (e) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.2 : 0.2 // Scroll down = zoom out, scroll up = zoom in
      setScale((prev) => Math.max(1, Math.min(4, prev + delta)))
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [loading, error])

  // Trigger open animation setelah loading selesai
  useEffect(() => {
    if (!loading && !error) {
      // Set timeout untuk trigger animasi setelah render pertama
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 10) // Delay minimal untuk trigger CSS transition
      
      return () => clearTimeout(timer)
    }
  }, [loading, error])

  // Close on Esc key & reset zoom
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        // Jika image sudah di posisi awal (scale = 1), langsung close
        if (scale === 1) {
          handleClose()
        } else {
          // Jika masih zoom in, reset dulu ke posisi awal
          setScale(1)
          setPosition({ x: 0, y: 0 })
        }
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [scale]) // Tambahkan scale sebagai dependency

  // Lock body scroll when modal is open
  useEffect(() => {
    // Save current overflow state
    const originalOverflow = document.body.style.overflow
    
    // Lock scroll
    document.body.style.overflow = 'hidden'
    
    // Restore on unmount
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [])

  // Handle close dengan animasi
  const handleClose = () => {
    setIsClosing(true)
    // Tunggu animasi selesai (300ms) sebelum benar-benar close
    setTimeout(() => {
      onClose()
    }, 300)
  }

  // Load image with fetch to detect 401/403
  useEffect(() => {
    if (!shortId) {
      setLoading(false)
      setError('No image ID provided')
      return
    }

    let cancelled = false

    async function checkImageAccess() {
      try {
        const previewUrl = `${BASE_URL}/gallery/p/${shortId}`
        const rawUrl = `${BASE_URL}/gallery/r/${shortId}` // Keep raw URL for potential future use
        
        // Fetch dengan HEAD request untuk check access tanpa download image
        const token = localStorage.getItem('token')
        const headers = {}
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }

        const response = await fetch(previewUrl, {
          method: 'HEAD', // Only check headers, don't download body
          credentials: 'include',
          headers,
        })

        if (cancelled) return

        if (response.ok) {
          // Success: set image src to preview URL for display
          setImageSrc(previewUrl)
          setError(null)
        } else if (response.status === 401) {
          setError({ code: 401 })
        } else if (response.status === 403) {
          setError({ code: 403 })
        } else {
          setError('Failed to load image')
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error checking image access:', err)
          setError('Network error')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    checkImageAccess()

    // No need to cleanup blob URL anymore
    return () => {
      cancelled = true
    }
  }, [shortId])

  // Reset position ketika scale kembali ke 1.0
  useEffect(() => {
    if (scale === 1) {
      setPosition({ x: 0, y: 0 })
    }
  }, [scale])

  // Hitung bounds untuk limitasi dragging
  const calculateBounds = (imgElement) => {
    if (!imgElement || scale <= 1) return null
    
    const container = imgElement.parentElement
    const containerRect = container.getBoundingClientRect()
    const imgRect = imgElement.getBoundingClientRect()
    
    // Maksimum jarak yang boleh digeser (scaled image size - container size) / 2
    const maxX = Math.max(0, (imgRect.width - containerRect.width) / 2)
    const maxY = Math.max(0, (imgRect.height - containerRect.height) / 2)
    
    return { maxX, maxY }
  }

  // Event Handler untuk Grab/Drag (Pointer Events untuk dukungan mouse dan sentuh)
  const handlePointerDown = (e) => {
    // Hanya aktif jika sudah zoom in (scale > 1)
    if (scale <= 1) return
    
    // Jangan drag jika klik di zoom controls atau header
    if (e.target.closest('.zoom-controls') || e.target.closest('.modal-header')) return
    
    // Hanya proses pointer utama (sentuhan pertama atau klik kiri)
    if (!e.isPrimary) return

    e.preventDefault()
    setIsDragging(true)
    
    // Tanam anchor point: posisi kursor - posisi gambar saat ini
    anchorPoint.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    }
  }

  const handlePointerMove = (e) => {
    // Validasi: hanya proses jika sedang dragging
    if (!isDragging) return
    if (!e.isPrimary) return
    
    // Kalkulasi posisi baru: posisi kursor - anchor point
    let newX = e.clientX - anchorPoint.current.x
    let newY = e.clientY - anchorPoint.current.y
    
    // Apply bounds limitation
    const imgElement = e.currentTarget.querySelector('img')
    const bounds = calculateBounds(imgElement)
    
    if (bounds) {
      newX = Math.max(-bounds.maxX, Math.min(bounds.maxX, newX))
      newY = Math.max(-bounds.maxY, Math.min(bounds.maxY, newY))
    }
    
    setPosition({ x: newX, y: newY })
  }

  const handlePointerUp = (e) => {
    if (!e.isPrimary) return
    setIsDragging(false)
  }

  const handlePointerLeave = (e) => {
    if (!e.isPrimary) return
    setIsDragging(false)
  }



  // Zoom functions
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.5, 4)) // Max 4x
  }

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.5, 1)) // Min 1x
  }

  const handleResetZoom = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  // Double-click to zoom in/out
  const handleDoubleClick = () => {
    if (scale > 1) {
      // Already zoomed: reset to initial state
      setScale(1)
      setPosition({ x: 0, y: 0 })
    } else {
      // Not zoomed: zoom in to 2x
      setScale(2)
    }
  }

  // Download raw image with authentication
  const handleDownload = async () => {
    if (downloading) return
    
    setDownloading(true)
    try {
      // Try the new download endpoint first (preserves original filename)
      const downloadUrl = `${BASE_URL}/gallery/d/${image.id}`
      
      if (image.visibility === 'public') {
        // For public images, use direct link
        const a = document.createElement('a')
        a.href = downloadUrl
        a.download = '' // Browser will use original filename from Content-Disposition
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        return
      }
      
      // For private images, use authenticated fetch to respect visibility
      const token = localStorage.getItem('token')
      const headers = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(downloadUrl, {
        method: 'GET',
        credentials: 'include',
        headers,
      })

      if (!response.ok) {
        console.error('Download failed:', response.status)
        setDownloadError('Failed to download image. Please try again.')
        return
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      
      // Get filename from Content-Disposition header or use fallback
      const contentDisposition = response.headers.get('Content-Disposition')
      let fileName = `${image.title || 'image'}.jpg`
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
        if (filenameMatch && filenameMatch[1]) {
          fileName = filenameMatch[1].replace(/['"]/g, '')
        }
      }
      
      // Create temporary link and trigger download
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      
      // Cleanup object URL
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download error:', error)
      setDownloadError('Failed to download image. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 animate-fade-in">
        <p className="text-white opacity-60">Loading image...</p>
      </div>
    )
  }

  // Error states: 401, 403, or generic
  if (error) {
    const isAuthError = error.code === 401 || error.code === 403
    
    return (
      <div 
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 animate-fade-in"
        onClick={handleClose}
      >
        <div className="flex flex-col items-center justify-center gap-6 text-center text-white animate-scale-in" onClick={(e) => e.stopPropagation()}>
          {isAuthError ? (
            <>
              <p className="text-2xl font-semibold">
                {error.code} | Unauthorized access to this image.
              </p>
              <button
                onClick={() => navigate('/')}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
              >
                Back to Home
              </button>
            </>
          ) : (
            <p className="text-xl opacity-60">{error}</p>
          )}
        </div>
      </div>
    )
  }

  // Determine cursor style
  const getCursor = () => {
    if (scale <= 1) return 'default'
    return isDragging ? 'grabbing' : 'grab'
  }

  // Success: display image with zoom/pan
  return (
    <div
      className={`fixed inset-0 z-[60] transition-opacity duration-300 ${
        isClosing ? 'opacity-0' : isOpen ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
    >
      {/* Header with title + close button */}
      <div 
        className={`modal-header absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent transition-transform duration-300 ease-out ${
          isClosing ? '-translate-y-full' : isOpen ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <h2 className="text-white text-lg font-medium truncate pr-4">{image.title}</h2>
        <button
          onClick={handleClose}
          className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Zoom controls */}
      <div className={`zoom-controls absolute bottom-4 right-4 z-10 flex flex-col gap-2 transition-transform duration-300 ease-out ${
        isClosing ? 'translate-y-full' : isOpen ? 'translate-y-0' : 'translate-y-full'
      }`}>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="p-3 bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-white rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Download image"
        >
          {downloading ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          )}
        </button>
        <button
          onClick={handleZoomIn}
          disabled={scale >= 4}
          className="p-3 bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-white rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Zoom in"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
        <button
          onClick={handleZoomOut}
          disabled={scale <= 1}
          className="p-3 bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-white rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Zoom out"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <button
          onClick={handleResetZoom}
          disabled={scale === 1}
          className="p-3 bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-white rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Reset zoom"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Image container with custom grab/pan */}
      <div 
        className={`image-container absolute inset-0 flex items-center justify-center overflow-hidden transition-all duration-300 ease-out ${
          isClosing ? 'opacity-0 scale-95' : isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
        }`}
        style={{ 
          padding: '80px 20px'
        }}
        onClick={(e) => {
          // Close hanya jika click BUKAN di image element
          if (e.target.tagName !== 'IMG') {
            handleClose()
          }
        }}
      >
        <div
          className="relative w-full h-full flex items-center justify-center"
          style={{
            cursor: getCursor(),
            userSelect: 'none',
            touchAction: scale > 1 ? 'none' : 'auto' // Nonaktifkan scrolling/panning sentuh bawaan browser saat diperbesar
          }}
          ref={zoomContainerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          onDoubleClick={handleDoubleClick}
        >
          <img
            src={imageSrc}
            alt={image.title}
            className="select-none block"
            draggable={false}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out'
            }}
            onError={() => {
              // Fallback jika image gagal load (network issue, dll)
              setError('Failed to load image')
            }}
          />
        </div>
      </div>

      {/* Download Error Alert Modal */}
      <ConfirmModal
        isOpen={!!downloadError}
        onClose={() => setDownloadError(null)}
        title="Download Failed"
        message={downloadError || ''}
        variant="default"
      />
    </div>
  )
}

export default ImageModal
