import { useState, useEffect, useCallback } from 'react'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000'

/**
 * AudioCoverCarousel Component - Displays multiple cover art images in an infinite-loop carousel.
 * Supports both keyboard (arrows) and click navigation.
 * @param {string} audioId - The audio item ID (numeric)
 * @param {array} thumbnails - Array of thumbnail objects with id and other metadata
 */
function AudioCoverCarousel({ audioId, thumbnails }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const thumbnailCount = thumbnails.length

  // Handle next slide (with infinite loop)
  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % Math.max(thumbnailCount, 1))
  }, [thumbnailCount])

  // Handle previous slide (with infinite loop)
  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + Math.max(thumbnailCount, 1)) % Math.max(thumbnailCount, 1))
  }, [thumbnailCount])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        handleNext()
      } else if (e.key === 'ArrowLeft') {
        handlePrev()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleNext, handlePrev])

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
      <div className="rounded-2xl overflow-hidden bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center aspect-square max-w-md mx-auto">
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

  return (
    <div className="max-w-md mx-auto">
      {/* Main carousel container */}
      <div className="relative rounded-2xl overflow-hidden bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center aspect-square group">
        {/* Image slides */}
        <div className="relative w-full h-full">
          {thumbnails.map((thumb, index) => (
            <div
              key={thumb.id}
              className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
                index === currentIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <img
                src={`${BASE_URL}/audio/${audioId}/thumbnails/${thumb.id}`}
                alt={`Cover art ${index + 1} of ${thumbnailCount}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none'
                }}
              />
            </div>
          ))}
        </div>

        {/* Navigation arrows */}
        <button
          onClick={handlePrev}
          className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-all opacity-0 group-hover:opacity-100 z-10"
          aria-label="Previous cover art"
          title="Previous (← Arrow)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={handleNext}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-all opacity-0 group-hover:opacity-100 z-10"
          aria-label="Next cover art"
          title="Next (→ Arrow)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Slide counter */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
          {currentIndex + 1} / {thumbnailCount}
        </div>
      </div>

      {/* Thumbnail navigation dots */}
      {thumbnailCount > 1 && (
        <div className="flex justify-center gap-1 mt-3">
          {thumbnails.map((thumb, index) => (
            <button
              key={thumb.id}
              onClick={() => setCurrentIndex(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-violet-600 w-6'
                  : 'bg-neutral-300 dark:bg-neutral-600 w-2 hover:bg-neutral-400 dark:hover:bg-neutral-500'
              }`}
              aria-label={`Go to slide ${index + 1}`}
              title={`Slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default AudioCoverCarousel
