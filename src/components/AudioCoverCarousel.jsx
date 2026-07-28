import { useState, useEffect, useRef } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/css'
import ImageModal from './ImageModal'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000'

/**
 * AudioCoverCarousel Component - Carousel using Swiper library with slide effect.
 * Displays audio cover art thumbnails with smooth swipe/drag gesture support.
 * 
 * Features:
 * - Slide transition effect (swipe from left to right and vice versa)
 * - Smooth swipe/drag gestures (touch and desktop)
 * - Click-to-preview for full-size image modal
 * - Keyboard navigation support
 * - Infinite loop carousel
 * 
 * @param {string} audioId - The audio item ID (numeric)
 * @param {array} thumbnails - Array of thumbnail objects with id and other metadata
 */
function AudioCoverCarousel({ audioId, thumbnails }) {
  const [previewingImage, setPreviewingImage] = useState(null)
  const swiperRef = useRef(null)
  const thumbnailCount = thumbnails.length

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!swiperRef.current) return
      
      if (e.key === 'ArrowRight') {
        swiperRef.current.swiper.slideNext()
      } else if (e.key === 'ArrowLeft') {
        swiperRef.current.swiper.slidePrev()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Handle click-to-preview
  const handleImageClick = () => {
    if (thumbnailCount > 0) {
      const activeIndex = swiperRef.current?.swiper?.activeIndex || 0
      const currentThumb = thumbnails[activeIndex]
      setPreviewingImage({
        url: `${BASE_URL}/audio/cover/p/${currentThumb.short_id}`,
        title: `Cover Art`
      })
    }
  }

  if (thumbnailCount === 0) {
    return (
      <div className="rounded-2xl overflow-hidden bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center aspect-square max-w-md mx-auto">
        <svg className="w-24 h-24 text-neutral-500 dark:text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      </div>
    )
  }

  if (thumbnailCount === 1) {
    const thumb = thumbnails[0]
    const isProcessing = thumb.status === 'processing' || thumb.status === 'failed_processing'
    
    return (
      <div className="rounded-2xl overflow-hidden bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center aspect-square max-w-md mx-auto cursor-pointer transition-all hover:opacity-90" onClick={isProcessing ? undefined : handleImageClick}>
        {isProcessing ? (
          <div className="flex flex-col items-center justify-center gap-2">
            {thumb.status === 'processing' ? (
              <>
                <div className="animate-spin">
                  <svg className="w-12 h-12 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-xs text-neutral-500">Processing...</p>
              </>
            ) : (
              <>
                <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4v2m0 4v2M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <p className="text-xs text-red-500">Failed to process</p>
              </>
            )}
          </div>
        ) : (
          <img
            src={`${BASE_URL}/audio/cover/p/${thumb.short_id}`}
            alt="Audio cover art"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none'
            }}
          />
        )}
      </div>
    )
  }

  // Multiple thumbnails: show carousel using Swiper with slide effect
  return (
    <div className="max-w-md mx-auto">
      <Swiper
        ref={swiperRef}
        grabCursor={true}
        loop={true}
        className="rounded-2xl overflow-hidden"
        style={{
          width: '100%',
          height: 'auto',
          aspectRatio: '1'
        }}
      >
        {thumbnails.map((thumb) => {
          const isProcessing = thumb.status === 'processing' || thumb.status === 'failed_processing'
          
          return (
            <SwiperSlide key={thumb.id}>
              <div 
                className="rounded-2xl overflow-hidden bg-neutral-200 dark:bg-neutral-800 w-full h-full cursor-pointer flex items-center justify-center"
                onClick={isProcessing ? undefined : handleImageClick}
              >
                {isProcessing ? (
                  <div className="flex flex-col items-center justify-center gap-2">
                    {thumb.status === 'processing' ? (
                      <>
                        <div className="animate-spin">
                          <svg className="w-12 h-12 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-xs text-neutral-500">Processing...</p>
                      </>
                    ) : (
                      <>
                        <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4v2m0 4v2M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                        <p className="text-xs text-red-500">Failed to process</p>
                      </>
                    )}
                  </div>
                ) : (
                  <img
                    src={`${BASE_URL}/audio/cover/p/${thumb.short_id}`}
                    alt="Audio cover art"
                    className="w-full h-full object-cover"
                    draggable={false}
                    onError={(e) => {
                      e.target.style.display = 'none'
                    }}
                  />
                )}
              </div>
            </SwiperSlide>
          )
        })}
      </Swiper>

      {/* Preview Modal - click-to-preview for current image */}
      {previewingImage && (
        <ImageModal
          imageUrl={previewingImage.url}
          title={previewingImage.title}
          disableDownload={true}
          onClose={() => setPreviewingImage(null)}
        />
      )}
    </div>
  )
}

export default AudioCoverCarousel
