import { Link } from 'react-router-dom'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000'

/**
 * Reusable video card component for video grids.
 * Displays a thumbnail, duration badge, visibility icon, hover play overlay,
 * and a processing skeleton when the video is still being transcoded.
 */
function VideoCard({ video }) {
  const isProcessing = video.status === 'processing'
  const isPrivate = video.visibility === 'private'
  const displayTitle = video.title
    ? video.title.length > 60 ? video.title.substring(0, 60) + '...' : video.title
    : video.original_filename || 'Untitled Video'

  const thumbnailUrl = `${BASE_URL}/video/t/${video.short_id}`

  const cardContent = (
    <div className="group">
      {/* Thumbnail container */}
      <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-900 relative">
        {/* Thumbnail image */}
        {!isProcessing && (
          <img
            src={thumbnailUrl}
            alt={displayTitle}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              e.target.style.display = 'none'
            }}
          />
        )}

        {/* Processing overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center z-20">
            <div className="relative w-10 h-10 mb-3">
              {/* Spinning gear icon */}
              <svg
                className="w-10 h-10 text-violet-400 animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <span className="text-xs text-violet-300 font-medium">Transcoding video...</span>
          </div>
        )}

        {/* Visibility badge (top-right) */}
        {isPrivate && !isProcessing && (
          <div
            className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-black/60 text-white shadow-md"
            title="Private Video"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
        )}

        {/* Hover play button overlay (only for active videos) */}
        {!isProcessing && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div className="backdrop-blur-md bg-white/20 p-3.5 rounded-full transform scale-75 group-hover:scale-100 transition-transform duration-300">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Video title */}
      <div className="mt-2 px-0.5">
        <h3
          className="text-sm font-medium text-light-text dark:text-dark-text truncate"
          title={video.title || video.original_filename}
        >
          {displayTitle}
        </h3>
      </div>
    </div>
  )

  // If processing, don't wrap in a link (card is locked)
  if (isProcessing) {
    return (
      <div className="pointer-events-none opacity-80">
        {cardContent}
      </div>
    )
  }

  return (
    <Link to={`/watch/${video.short_id}`} className="block">
      {cardContent}
    </Link>
  )
}

export default VideoCard
