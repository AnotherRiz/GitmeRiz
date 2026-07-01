import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { get } from '../lib/api'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000'

function Gallery() {
  const { user, loading: authLoading } = useAuth()
  const [images, setImages] = useState([])
  const [usersMap, setUsersMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authLoading) return

    async function fetchImages() {
      setLoading(true)
      const res = await get('/api/gallery')
      if (res.ok) {
        setImages(res.data)
      } else {
        setError(res.error || 'Failed to fetch gallery images.')
      }
      setLoading(false)
    }

    async function fetchUsers() {
      if (user && user.role === 'superuser') {
        const res = await get('/api/users')
        if (res.ok) {
          const map = {}
          res.data.forEach((u) => {
            map[u.id] = u.name
          })
          setUsersMap(map)
        }
      }
    }

    fetchImages()
    fetchUsers()
  }, [authLoading, user])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <p className="opacity-60">Loading...</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Gallery</h1>
          <p className="text-sm opacity-60 mt-1">Explore all uploaded images on the platform.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm px-4 py-3 rounded-xl mb-8">
          {error}
        </div>
      )}

      {loading ? (
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="break-inside-avoid mb-4 p-3 bg-light-card dark:bg-dark-card border border-light-card-border dark:border-dark-card-border rounded-2xl animate-pulse">
              <div className="bg-neutral-200 dark:bg-neutral-800 rounded-xl h-48 w-full mb-3" />
              <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-2/3 mb-2" />
              <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : images.length === 0 ? (
        <div className="text-center py-20 bg-light-card dark:bg-dark-card border border-light-card-border dark:border-dark-card-border rounded-2xl p-8">
          <svg className="w-12 h-12 text-neutral-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="font-semibold text-lg">No images yet</h3>
          <p className="text-sm text-neutral-500 mt-1">Upload images in your private "My Gallery" workspace to get started.</p>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4">
          {images.map((img) => {
            const displayTitle = img.title.length > 20 ? img.title.substring(0, 20) + '...' : img.title
            const uploaderName = user && img.user_id === user.id ? user.name : (usersMap[img.user_id] || `User #${img.user_id}`)
            return (
              <div 
                key={img.id} 
                className="break-inside-avoid mb-4 p-3 bg-light-card dark:bg-dark-card border border-light-card-border dark:border-dark-card-border rounded-2xl shadow-sm hover:shadow-md hover:border-light-text/20 dark:hover:border-dark-text/20 transition-all duration-300 group relative"
              >
                {/* Visibility Badge */}
                <div 
                  className="absolute top-5 left-5 z-10 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/85 transition-colors shadow-md"
                  title={img.visibility === 'public' ? 'Public Image' : 'Private Image'}
                >
                  {img.visibility === 'public' ? (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  )}
                </div>

                <div className="overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center min-h-[100px]">
                  <img
                    src={`${BASE_URL}/api/gallery/${img.id}/download`}
                    alt={img.title}
                    loading="lazy"
                    className="w-full h-auto object-cover rounded-xl transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                </div>
                <div className="mt-3 px-1">
                  <h3 className="font-semibold text-sm text-light-text dark:text-dark-text" title={img.title}>
                    {displayTitle}
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    Uploaded by: {uploaderName}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Gallery
