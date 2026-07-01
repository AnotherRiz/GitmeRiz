import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { get, api } from '../lib/api'
import SecureImage from '../components/SecureImage'
import UploadModal from '../components/UploadModal'

function MyGallery() {
  const { user, loading: authLoading } = useAuth()
  const [images, setImages] = useState([])
  const [pinnedIds, setPinnedIds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isUploadOpen, setIsUploadOpen] = useState(false)

  // Load images and pinned ids
  useEffect(() => {
    if (authLoading || !user) return

    async function fetchMyImages() {
      setLoading(true)
      const res = await get('/api/gallery')
      if (res.ok) {
        setImages(res.data)
      } else {
        setError(res.error || 'Failed to fetch your gallery images.')
      }
      setLoading(false)
    }

    // Load pinned IDs from localStorage
    const savedPinned = localStorage.getItem(`pinned_gallery_${user.id}`)
    if (savedPinned) {
      try {
        setPinnedIds(JSON.parse(savedPinned))
      } catch (err) {
        console.error('Failed to parse pinned images', err)
      }
    }

    fetchMyImages()
  }, [authLoading, user])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <p className="opacity-60">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Filter pinned and unpinned images for the current user only
  const myImages = images.filter((img) => img.user_id === user.id)
  const pinnedImages = myImages.filter((img) => pinnedIds.includes(img.id))
  const unpinnedImages = myImages.filter((img) => !pinnedIds.includes(img.id))

  const handleUploadSuccess = (newImage) => {
    setImages((prev) => [newImage, ...prev])
  }

  const handleTogglePin = (id) => {
    let updatedPinned
    if (pinnedIds.includes(id)) {
      updatedPinned = pinnedIds.filter((pId) => pId !== id)
    } else {
      updatedPinned = [...pinnedIds, id]
    }
    setPinnedIds(updatedPinned)
    localStorage.setItem(`pinned_gallery_${user.id}`, JSON.stringify(updatedPinned))
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this image?')) return

    const res = await api(`/api/gallery/${id}`, { method: 'DELETE' })
    if (res.ok) {
      // Remove from images list
      setImages((prev) => prev.filter((img) => img.id !== id))
      // Remove from pinned if it was pinned
      if (pinnedIds.includes(id)) {
        const updatedPinned = pinnedIds.filter((pId) => pId !== id)
        setPinnedIds(updatedPinned)
        localStorage.setItem(`pinned_gallery_${user.id}`, JSON.stringify(updatedPinned))
      }
    } else {
      alert(res.error || 'Failed to delete image.')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-24">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Gallery</h1>
          <p className="text-sm opacity-60 mt-1">Manage and organize your private uploads.</p>
        </div>
        <button
          onClick={() => setIsUploadOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-md transition-colors text-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Upload Image
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm px-4 py-3 rounded-xl mb-8">
          {error}
        </div>
      )}

      {/* Pinned Area (Horizontal Scroll) */}
      <div className="mb-10">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
          Pinned Area
        </h2>

        {pinnedImages.length === 0 ? (
          <div className="border border-dashed border-light-navbar/30 dark:border-dark-navbar/30 rounded-2xl p-8 text-center text-sm text-neutral-500">
            No pinned images. Click the Pin icon on any image card below to feature it here.
          </div>
        ) : (
          <div className="flex overflow-x-auto gap-5 pb-4 snap-x scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-800">
            {pinnedImages.map((img) => (
              <div 
                key={img.id} 
                className="flex-shrink-0 w-72 snap-start p-3 bg-light-card dark:bg-dark-card border border-light-card-border dark:border-dark-card-border rounded-2xl relative shadow-sm group"
              >
                {/* Pin/Unpin button */}
                <button
                  onClick={() => handleTogglePin(img.id)}
                  className="absolute top-5 right-5 z-10 p-2 rounded-full bg-black/60 hover:bg-black/80 text-yellow-500 transition-colors shadow-md"
                  title="Unpin image"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </button>

                <div className="overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-900 h-44 flex items-center justify-center">
                  <SecureImage
                    src={`/api/gallery/${img.id}/download`}
                    alt={img.title}
                    className="w-full h-full object-cover rounded-xl"
                  />
                </div>
                <div className="mt-3 px-1">
                  <h3 className="font-semibold text-sm truncate text-light-text dark:text-dark-text" title={img.title}>
                    {img.title}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    Uploaded by: {user.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Visual Divider */}
      <hr className="my-10 border-light-card-border dark:border-dark-card-border border-t-2" />

      {/* Main Images Area (Masonry Layout) */}
      <div>
        <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Images Area
        </h2>

        {loading ? (
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="break-inside-avoid mb-4 p-3 bg-light-card dark:bg-dark-card border border-light-card-border dark:border-dark-card-border rounded-2xl animate-pulse">
                <div className="bg-neutral-200 dark:bg-neutral-800 rounded-xl h-48 w-full mb-3" />
                <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-2/3 mb-2" />
                <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : unpinnedImages.length === 0 && pinnedImages.length === 0 ? (
          <div className="text-center py-20 bg-light-card dark:bg-dark-card border border-light-card-border dark:border-dark-card-border rounded-2xl p-8">
            <svg className="w-12 h-12 text-neutral-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="font-semibold text-lg">Your gallery is empty</h3>
            <p className="text-sm text-neutral-500 mt-1">Click the "Upload Image" button above to upload your first image.</p>
          </div>
        ) : unpinnedImages.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-light-navbar/20 dark:border-dark-navbar/20 rounded-2xl text-sm text-neutral-500">
            All your images are currently pinned.
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4">
            {unpinnedImages.map((img) => (
              <div 
                key={img.id} 
                className="break-inside-avoid mb-4 p-3 bg-light-card dark:bg-dark-card border border-light-card-border dark:border-dark-card-border rounded-2xl relative shadow-sm hover:shadow-md hover:border-light-text/20 dark:hover:border-dark-text/20 transition-all duration-300 group"
              >
                {/* Actions overlay shown on hover */}
                <div className="absolute top-5 right-5 z-10 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {/* Pin button */}
                  <button
                    onClick={() => handleTogglePin(img.id)}
                    className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white hover:text-yellow-500 transition-colors shadow-md"
                    title="Pin image"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  </button>
                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(img.id)}
                    className="p-2 rounded-full bg-black/60 hover:bg-red-600 text-white hover:text-white transition-colors shadow-md"
                    title="Delete image"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

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
                  <p className="text-xs text-neutral-500 mt-1">
                    Uploader: {user.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <UploadModal 
        isOpen={isUploadOpen} 
        onClose={() => setIsUploadOpen(false)} 
        onSuccess={handleUploadSuccess}
      />
    </div>
  )
}

export default MyGallery
