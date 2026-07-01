import { useEffect, useState } from 'react'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000'

function SecureImage({ src, alt, className }) {
  const [imgUrl, setImgUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    const token = localStorage.getItem('token')
    const url = src.startsWith('http') ? src : `${BASE_URL}${src}`

    const headers = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    setLoading(true)
    setError(false)

    fetch(url, { headers })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to load image')
        }
        return res.blob()
      })
      .then((blob) => {
        if (active) {
          const objectUrl = URL.createObjectURL(blob)
          setImgUrl(objectUrl)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error('SecureImage error:', err)
        if (active) {
          setError(true)
          setLoading(false)
        }
      })

    return () => {
      active = false
      if (imgUrl) {
        URL.revokeObjectURL(imgUrl)
      }
    }
  }, [src])

  if (loading) {
    return (
      <div className={`animate-pulse bg-neutral-200 dark:bg-neutral-800 min-h-[200px] flex items-center justify-center rounded-xl ${className}`}>
        <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
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

  return <img src={imgUrl} alt={alt} className={className} loading="lazy" />
}

export default SecureImage
