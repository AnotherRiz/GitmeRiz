import { Link } from 'react-router-dom'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000'

function AudioCard({ audio }) {
  const getThumbnailUrl = () => {
    if (audio.thumbnail_path) {
      return `${BASE_URL}/audio/${audio.id}/thumbnail`
    }
    return null
  }

  return (
    <Link
      to={`/listen/${audio.id}`}
      className="block p-3 bg-light-card dark:bg-dark-card border border-light-card-border dark:border-dark-card-border rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 group"
    >
      {/* Thumbnail or placeholder */}
      <div className="w-full aspect-square rounded-xl bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center mb-3 overflow-hidden">
        {getThumbnailUrl() ? (
          <img
            src={getThumbnailUrl()}
            alt={audio.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <svg className="w-12 h-12 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        )}
      </div>

      {/* Title */}
      <h3 className="font-semibold text-sm text-light-text dark:text-dark-text truncate" title={audio.title}>
        {audio.title}
      </h3>
    </Link>
  )
}

export default AudioCard
