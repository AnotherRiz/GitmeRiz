import { useEffect, useState } from 'react'
import { getSignedUrl } from '../lib/api'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000'

function SecureImage({ src, alt, className, image, variant = 't' }) {
  const [imgUrl, setImgUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let active = true

    const loadImage = async () => {
      setLoading(true)
      setError(false)

      try {
        // If we have an image object, we can be smart about public vs private
        if (image) {
          if (image.visibility === 'public') {
            // Public image: use direct URL, no auth needed
            const directUrl = `${BASE_URL}/gallery/${variant}/${image.short_id}`
            if (active) {
              setImgUrl(directUrl)
              setLoading(false)
            }
            return
          } else {
            // Private image: get signed URL
            const result = await getSignedUrl(image.short_id)
            if (result.ok && active) {
              // Convert raw URL to desired variant (t/p/r) by replacing path segment
              const signedUrl = result.data.url.replace('/gallery/r/', `/gallery/${variant}/`)
              setImgUrl(signedUrl)
              setLoading(false)
              return
            } else if (active) {
              throw new Error(result.error || 'Failed to get signed URL')
            }
          }
        }

        // Fallback to blob method for backward compatibility or when no image object provided
        const url = src.startsWith('http') ? src : `${BASE_URL}${src}`
        const token = localStorage.getItem('token')
        const headers = {}
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }

        const response = await fetch(url, { headers, credentials: 'include' })
        if (!response.ok) {
          throw new Error('Failed to load image')
        }

        const blob = await response.blob()
        if (active) {
          const objectUrl = URL.createObjectURL(blob)
          setImgUrl(objectUrl)
          setLoading(false)
        }
      } catch (err) {
        console.error('SecureImage error:', err)
        if (active) {
          setError(true)
          setLoading(false)
        }
      }
    }

    loadImage()

    return () => {
      active = false
      // Clean up blob URLs (but not direct URLs)
      if (imgUrl && imgUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imgUrl)
      }
    }
  }, [src, image, variant, retryCount])

  // Handle image load errors (e.g., expired signature)
  const handleImageError = () => {
    if (retryCount === 0 && image && image.visibility === 'private') {
      // Retry once for signed URLs (might be expired)
      setRetryCount(1)
    } else {
      setError(true)
    }
  }

  if (loading) {
    return (
      <div className={`animate-pulse bg-neutral-200 dark:bg-neutral-800 min-h-[200px] flex items-center justify-center rounded-xl ${className}`}>
        <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-neutral-100 dark:bg-neutral-900 min-h-[200px] flex flex-col items-center justify-center text-neutral-400 rounded-xl p-4 text-center ${className}`}>
        <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span className="text-xs">Failed to load image</span>
      </div>
    )
  }

  return <img src={imgUrl} alt={alt} className={className} loading="lazy" onError={handleImageError} />
}

export default SecureImage