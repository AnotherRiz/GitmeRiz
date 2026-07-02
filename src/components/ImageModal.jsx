import { useEffect, useState } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { getShortId } from '../lib/shortId'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000'

/**
 * Full-screen image viewer with zoom in/out and grab-to-pan support.
 * 
 * Uses hybrid authentication approach:
 * - Public images: direct URL (fast, cacheable)
 * - Private images: fetch with cookie → blob URL (reliable auth)
 */
function ImageModal({ image, onClose }) {
  const shortId = getShortId(image)
  const [imageSrc, setImageSrc] = useState(null)
  const [loading, setLoading] = useState(true)

  // Close on Esc key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  // Load image based on visibility
  useEffect(() => {
    if (!shortId) {
      setLoading(false)
      return
    }
    
    // Build clean image URL without token
    // Backend will check authentication via cookie/header
    const imageUrl = `${BASE_URL}/gallery/r/${shortId}`
    
    setImageSrc(imageUrl)
    setLoading(false)
  }, [image, shortId])

  if (loading) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90">
        <p className="text-white opacity-60">Loading image...</p>
      </div>
    )
  }

  if (!shortId || !imageSrc) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90">
        <p className="text-white opacity-60">Failed to load image</p>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      <div className="relative w-full h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header with title + close button */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
          <h2 className="text-white text-lg font-medium truncate pr-4">{image.title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Zoomable / pannable image */}
        <div className="flex-1 flex items-center justify-center overflow-hidden">
          <TransformWrapper initialScale={1} minScale={0.5} maxScale={5} centerOnInit>
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                {/* Zoom controls */}
                <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
                  <button
                    onClick={() => zoomIn()}
                    className="p-3 bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-white rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-lg"
                    aria-label="Zoom in"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                  <button
                    onClick={() => zoomOut()}
                    className="p-3 bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-white rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-lg"
                    aria-label="Zoom out"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <button
                    onClick={() => resetTransform()}
                    className="p-3 bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-white rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-lg"
                    aria-label="Reset zoom"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>

                <TransformComponent
                  wrapperStyle={{ width: '100%', height: '100%', cursor: 'grab' }}
                  contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <img
                    src={imageSrc}
                    alt={image.title}
                    className="max-w-full max-h-full object-contain"
                  />
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
        </div>
      </div>
    </div>
  )
}

export default ImageModal
