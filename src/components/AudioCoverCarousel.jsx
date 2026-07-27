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
        url: `${BASE_URL}/audio/${audioId}/thumbnails/${currentThumb.id}`,
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
    return (
      <div className="rounded-2xl overflow-hidden bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center aspect-square max-w-md mx-auto cursor-pointer transition-all hover:opacity-90" onClick={handleImageClick}>
        <img
          src={`${BASE_URL}/audio/${audioId}/thumbnails/${thumb.id}`}
          alt="Audio cover art"
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.style.display = 'none'
          }}
        />
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
        {thumbnails.map((thumb) => (
          <SwiperSlide key={thumb.id}>
            <div 
              className="rounded-2xl overflow-hidden bg-neutral-200 dark:bg-neutral-800 w-full h-full cursor-pointer"
              onClick={handleImageClick}
            >
              <img
                src={`${BASE_URL}/audio/${audioId}/thumbnails/${thumb.id}`}
                alt="Audio cover art"
                className="w-full h-full object-cover"
                draggable={false}
                onError={(e) => {
                  e.target.style.display = 'none'
                }}
              />
            </div>
          </SwiperSlide>
        ))}
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
