import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getShortId } from '../lib/shortId'

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
  
  // Ref untuk anchor point (tidak trigger re-render)
  const anchorPoint = useRef({ x: 0, y: 0 })

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

    let blobUrl = null
    let cancelled = false

    async function loadImage() {
      try {
        const imageUrl = `${BASE_URL}/gallery/r/${shortId}`
        
        // Fetch with credentials and bearer token fallback
        const token = localStorage.getItem('token')
        const headers = {}
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }

        const response = await fetch(imageUrl, {
          credentials: 'include',
          headers,
        })

        if (cancelled) return

        if (response.ok) {
          // Success: create blob URL
          const blob = await response.blob()
          blobUrl = URL.createObjectURL(blob)
          setImageSrc(blobUrl)
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
          console.error('Error loading image:', err)
          setError('Network error')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadImage()

    // Cleanup: revoke blob URL to prevent memory leak
    return () => {
      cancelled = true
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
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

  // Event Handlers untuk Grab/Drag
  const handleMouseDown = (e) => {
    // Hanya aktif jika sudah zoom in (scale > 1)
    if (scale <= 1) return
    
    // Jangan drag jika klik di zoom controls atau header
    if (e.target.closest('.zoom-controls') || e.target.closest('.modal-header')) return
    
    e.preventDefault()
    setIsDragging(true)
    
    // Tanam anchor point: posisi kursor - posisi gambar saat ini
    anchorPoint.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    }
  }

  const handleMouseMove = (e) => {
    // Validasi: hanya proses jika sedang dragging
    if (!isDragging) return
    
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

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
  }

  // Wheel event untuk zoom dengan scroll
  const handleWheel = (e) => {
    e.preventDefault()
    
    const delta = e.deltaY > 0 ? -0.2 : 0.2 // Scroll down = zoom out, scroll up = zoom in
    const newScale = Math.max(1, Math.min(4, scale + delta))
    
    setScale(newScale)
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
            userSelect: 'none'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
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
          />
        </div>
      </div>
    </div>
  )
}

export default ImageModal
