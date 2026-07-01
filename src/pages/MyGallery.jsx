import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { get, api } from '../lib/api'
import UploadModal from '../components/UploadModal'
import EditNameModal from '../components/EditNameModal'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000'

function MyGallery() {
  const { user, loading: authLoading } = useAuth()
  const [images, setImages] = useState([])
  const [pinnedIds, setPinnedIds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editImage, setEditImage] = useState(null)

  // Load images and pinned ids
  useEffect(() => {
    if (authLoading || !user) return

    async function fetchMyImages() {
      setLoading(true)
      const res = await get('/api/gallery/my')
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

  const handleUploadSuccess = (newItems) => {
    // Backend returns either a single GalleryItem or an array (UploadResponse)
    if (Array.isArray(newItems)) {
      setImages((prev) => [...newItems, ...prev])
    } else if (newItems) {
      setImages((prev) => [newItems, ...prev])
    }
  }

  const handleEditSuccess = (updatedImage) => {
    setImages((prev) => prev.map((img) => (img.id === updatedImage.id ? updatedImage : img)))
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

  const handleOpenEdit = (img) => {
    setEditImage(img)
    setIsEditOpen(true)
  }

  const handleToggleVisibility = async (img) => {
    const nextVisibility = img.visibility === 'public' ? 'private' : 'public'
    const res = await api(`/api/gallery/${img.id}/visibility`, {
      method: 'PATCH',
      body: JSON.stringify({ visibility: nextVisibility }),
    })
    if (res.ok) {
      setImages((prev) => prev.map((item) => (item.id === img.id ? res.data : item)))
    } else {
      alert(res.error || 'Failed to update visibility.')
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

      {/* Pinned Area (Horizontal Scroll - w-[27rem] and h-[16.5rem] is 50% larger than w-72 h-44) */}
      <div className="mb-10">
        <h2 className="text-lg font-bold mb-4">
          Pinned
        </h2>

        {pinnedImages.length === 0 ? (
          <div className="border border-dashed border-light-navbar/30 dark:border-dark-navbar/30 rounded-2xl p-8 text-center text-sm text-neutral-500">
            No pinned images. Click the Love icon on any image card below to feature it here.
          </div>
        ) : (
          <div className="flex overflow-x-auto gap-5 pb-4 snap-x no-scrollbar">
            {pinnedImages.map((img) => {
              const displayTitle = img.title.length > 20 ? img.title.substring(0, 20) + '...' : img.title
              return (
                <div 
                  key={img.id} 
                  className="flex-shrink-0 w-[27rem] snap-start p-3 bg-light-card dark:bg-dark-card border border-light-card-border dark:border-dark-card-border rounded-2xl relative shadow-sm group"
                >
                  {/* Visibility Badge */}
                  <button 
                    onClick={() => handleToggleVisibility(img)}
                    className="absolute top-5 left-5 z-20 p-1.5 rounded-lg bg-black/60 text-white shadow-md hover:bg-black/85 transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 opacity-0 group-hover:opacity-100"
                    title={img.visibility === 'public' ? 'Public Image (Click to make Private)' : 'Private Image (Click to make Public)'}
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
                  </button>

                  {/* Actions overlay shown on hover */}
                  <div className="absolute top-5 right-5 z-10 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {/* Rename pencil icon */}
                    <button
                      onClick={() => handleOpenEdit(img)}
                      className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors shadow-md"
                      title="Edit name"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    {/* Unpin button (Love Icon) */}
                    <button
                      onClick={() => handleTogglePin(img.id)}
                      className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-red-500 transition-colors shadow-md"
                      title="Unpin image"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>

                  <div className="overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-900 h-[16.5rem] flex items-center justify-center">
                    <img
                      src={`${BASE_URL}/api/gallery/${img.id}/download`}
                      alt={img.title}
                      loading="lazy"
                      className="w-full h-full object-cover rounded-xl"
                    />
                  </div>
                  <div className="mt-3 px-1">
                    <h3 className="font-semibold text-sm text-light-text dark:text-dark-text" title={img.title}>
                      {displayTitle}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1">
                      Uploaded by: {user.name}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Visual Divider */}
      <hr className="my-10 border-light-card-border dark:border-dark-card-border border-t-2" />

      {/* Main Images Area (Masonry Layout) */}
      <div>
        <h2 className="text-lg font-bold mb-6">
          Images
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
            {unpinnedImages.map((img) => {
              const displayTitle = img.title.length > 20 ? img.title.substring(0, 20) + '...' : img.title
              return (
                <div 
                  key={img.id} 
                  className="break-inside-avoid mb-4 p-3 bg-light-card dark:bg-dark-card border border-light-card-border dark:border-dark-card-border rounded-2xl relative shadow-sm hover:shadow-md hover:border-light-text/20 dark:hover:border-dark-text/20 transition-all duration-300 group"
                >
                  {/* Visibility Badge */}
                  <button 
                    onClick={() => handleToggleVisibility(img)}
                    className="absolute top-5 left-5 z-20 p-1.5 rounded-lg bg-black/60 text-white shadow-md hover:bg-black/85 transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 opacity-0 group-hover:opacity-100"
                    title={img.visibility === 'public' ? 'Public Image (Click to make Private)' : 'Private Image (Click to make Public)'}
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
                  </button>

                  {/* Actions overlay shown on hover */}
                  <div className="absolute top-5 right-5 z-10 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {/* Rename pencil icon */}
                    <button
                      onClick={() => handleOpenEdit(img)}
                      className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors shadow-md"
                      title="Edit name"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    {/* Pin button (Love Icon Outline) */}
                    <button
                      onClick={() => handleTogglePin(img.id)}
                      className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white hover:text-red-500 transition-colors shadow-md"
                      title="Pin image"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
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
                    <p className="text-xs text-neutral-500 mt-1">
                      Uploaded by: {user.name}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <UploadModal 
        isOpen={isUploadOpen} 
        onClose={() => setIsUploadOpen(false)} 
        onSuccess={handleUploadSuccess}
      />

      {/* Edit Name Modal */}
      <EditNameModal 
        isOpen={isEditOpen} 
        onClose={() => {
          setIsEditOpen(false)
          setEditImage(null)
        }} 
        image={editImage}
        onSuccess={handleEditSuccess}
      />
    </div>
  )
}

export default MyGallery
