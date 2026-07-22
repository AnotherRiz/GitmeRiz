import { useState, useEffect, useRef } from 'react'
import { Navigate, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { get, api } from '../lib/api'
import AudioCard from '../components/AudioCard'
import UploadAudioModal from '../components/UploadAudioModal'
import ConfirmModal from '../components/ConfirmModal'

/**
 * User's personal audio management page.
 * Displays all audio items (public & private) with upload/delete actions.
 */
function MyAudio() {
  const { username } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [audioItems, setAudioItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [errorType, setErrorType] = useState(null) // null, '403'
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isUploadMinimized, setIsUploadMinimized] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [alertState, setAlertState] = useState(null)
  const isMountedRef = useRef(true)

  // Helper: show alert modal
  const showAlert = (title, message) => {
    setAlertState({ title, message })
  }

  // Fetch user's audio
  const fetchMyAudio = async () => {
    setLoading(true)
    try {
      const res = await get('/audio')

      if (!isMountedRef.current) return

      if (res.ok) {
        // Handle both array and paginated responses
        const items = Array.isArray(res.data) ? res.data : res.data.items || []
        // Filter to current user's items (superuser might see all)
        const userItems = items.filter((item) => item.user_id === user.id)
        setAudioItems(userItems)
        setError('')
      } else {
        setError(res.error || 'Failed to fetch audio.')
      }
    } catch (err) {
      console.error('Error fetching audio:', err)
      if (isMountedRef.current) {
        setError('Network error. Please try again.')
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }

  // Load audio on mount
  useEffect(() => {
    if (authLoading) return
    if (!user) return
    
    // Check access first
    const hasAccessError = user.username !== username
    if (hasAccessError && !errorType) {
      setErrorType('403')
      setLoading(false)
      return
    }

    fetchMyAudio()
  }, [authLoading, user, username])

  // Cleanup
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Auth guards
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

  // Error state: 403 Forbidden
  if (errorType === '403') {
    return (
      <>
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-light-body dark:bg-dark-body text-light-text dark:text-dark-text px-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-center">
            403 | Access Denied
          </h1>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2.5 bg-light-navbar dark:bg-dark-navbar hover:opacity-80 text-light-text dark:text-dark-text rounded-lg font-semibold shadow-md transition-opacity text-sm"
          >
            Back to Home
          </button>
        </div>
      </>
    )
  }

  // Delete handler
  const performDelete = async (id) => {
    const res = await api(`/audio/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setAudioItems((prev) => prev.filter((item) => item.id !== id))
      setDeleteTarget(null)
    } else {
      showAlert('Delete Failed', res.error || 'Failed to delete audio.')
      setDeleteTarget(null)
    }
  }

  const handleUploadSuccess = (newAudio) => {
    setAudioItems((prev) => [newAudio, ...prev])
  }

  const handleDeleteClick = (e, audio) => {
    e.stopPropagation()
    if (e.shiftKey) {
      performDelete(audio.id)
    } else {
      setDeleteTarget(audio)
    }
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-24">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Audio</h1>
            <p className="text-sm opacity-60 mt-1">Manage and organize your private uploads.</p>
          </div>
          <button
            onClick={() => {
              setIsUploadOpen(true)
              setIsUploadMinimized(false)
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-md transition-colors text-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Upload Audio
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm px-4 py-3 rounded-xl mb-8">
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square w-full rounded-xl bg-neutral-200 dark:bg-neutral-800" />
                <div className="mt-2 h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : audioItems.length === 0 ? (
          <div className="text-center py-20 bg-light-card dark:bg-dark-card border border-light-card-border dark:border-dark-card-border rounded-2xl p-8">
            <svg className="w-12 h-12 text-neutral-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <h3 className="font-semibold text-lg">No audio yet</h3>
            <p className="text-sm text-neutral-500 mt-1">Click the "Upload Audio" button above to upload your first audio.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {audioItems.map((audio) => (
              <div
                key={audio.id}
                className="relative group"
              >
                <AudioCard audio={audio} />
                
                {/* Actions overlay */}
                <div className="absolute top-4 right-4 z-10 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {/* Visibility badge */}
                  <div className="px-2 py-1 rounded-full bg-black/60 text-white text-xs font-semibold">
                    {audio.visibility === 'public' ? '🌐 Public' : '🔒 Private'}
                  </div>
                  
                  {/* Delete button */}
                  <button
                    onClick={(e) => handleDeleteClick(e, audio)}
                    className="p-2 rounded-full bg-black/60 hover:bg-red-600 text-white transition-colors shadow-md"
                    title="Delete (Shift+click to skip confirmation)"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <UploadAudioModal
        isOpen={isUploadOpen}
        isMinimized={isUploadMinimized}
        onClose={() => {
          setIsUploadOpen(false)
          setIsUploadMinimized(false)
        }}
        onSuccess={handleUploadSuccess}
        onMinimize={() => setIsUploadMinimized(true)}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => performDelete(deleteTarget?.id)}
        title="Delete Audio"
        message={deleteTarget ? `Delete "${deleteTarget.title}"?` : ''}
        tip="Tip: Hold Shift while clicking delete to skip this confirmation."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Alert Modal */}
      <ConfirmModal
        isOpen={!!alertState}
        onClose={() => setAlertState(null)}
        title={alertState?.title || 'Alert'}
        message={alertState?.message || ''}
        variant="default"
      />
    </>
  )
}

export default MyAudio
