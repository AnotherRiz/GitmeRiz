import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { get } from '../lib/api'
import SecureImage from '../components/SecureImage'

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
          {images.map((img) => (
            <div 
              key={img.id} 
              className="break-inside-avoid mb-4 p-3 bg-light-card dark:bg-dark-card border border-light-card-border dark:border-dark-card-border rounded-2xl shadow-sm hover:shadow-md hover:border-light-text/20 dark:hover:border-dark-text/20 transition-all duration-300 group"
            >
              <div className="overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center min-h-[100px]">
                <SecureImage
                  src={`/api/gallery/${img.id}/download`}
                  alt={img.title}
                  className="w-full h-auto object-cover rounded-xl transition-transform duration-300 group-hover:scale-[1.02]"
                />
              </div>
              <div className="mt-3 px-1">
                <h3 className="font-semibold text-sm truncate text-light-text dark:text-dark-text" title={img.title}>
                  {img.title}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 01-8 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="truncate">
                    {user && img.user_id === user.id ? user.name : (usersMap[img.user_id] || `User #${img.user_id}`)}
                  </span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Gallery
