import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// A single pinned image card that is sortable via drag-and-drop.
// Vertical images span two rows (row-span-2) to create the Bento grid effect.
// Drag listeners live on the root; a distance activation constraint (set on the
// parent DndContext sensor) ensures a plain click still opens the image while a
// drag reorders the card.
function SortablePinnedCard({
  img,
  isVertical,
  getImageUrl,
  onToggleVisibility,
  onOpenEdit,
  onTogglePin,
  onDelete,
  onOpenImage,
  onReprocess,
  onImageLoad,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: img.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  }

  const displayTitle = img.title.length > 24 ? img.title.substring(0, 24) + '...' : img.title
  const isActive = img.status !== 'processing' && img.status !== 'failed_processing'

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
      }}
      {...attributes}
      {...listeners}
      className={`group relative overflow-hidden rounded-2xl bg-light-card dark:bg-dark-card border border-light-card-border dark:border-dark-card-border shadow-sm transition-all duration-500 ease-out hover:scale-[1.02] hover:shadow-2xl hover:shadow-black/20 dark:hover:shadow-white/10 ${
        isVertical ? 'row-span-2' : ''
      } ${isDragging ? 'opacity-80 shadow-2xl ring-2 ring-blue-500/50' : ''}`}
    >
      {/* Visibility Badge */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleVisibility(img)
        }}
        className="absolute top-2.5 left-2.5 z-20 p-1.5 rounded-lg bg-black/60 text-white shadow-md hover:bg-black/85 transition-all duration-200 hover:scale-105 active:scale-95 opacity-0 group-hover:opacity-100 cursor-pointer"
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
      <div className="absolute top-2.5 right-2.5 z-20 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {/* Rename pencil icon */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onOpenEdit(img)
          }}
          className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors shadow-md cursor-pointer"
          title="Edit name"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        {/* Unpin button (Love Icon) */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onTogglePin(img)
          }}
          className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-red-500 transition-colors shadow-md cursor-pointer"
          title="Unpin image"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
        </button>
        {/* Delete button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(e, img)
          }}
          className="p-2 rounded-full bg-black/60 hover:bg-red-600 text-white transition-colors shadow-md cursor-pointer"
          title="Delete image (Shift+click to skip confirmation)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Image display - different UI based on status */}
      <div 
        className="w-full h-full min-h-[11rem] bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center"
      >
        {img.status === 'processing' ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400">
            <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-xs mt-2">Processing...</span>
          </div>
        ) : img.status === 'failed_processing' ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-red-500/10 text-red-500 gap-2 p-3 text-center">
            <span className="text-xs font-semibold">Processing failed</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onReprocess(img)
              }}
              className="relative z-20 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : (
          <img
            src={getImageUrl(img, 't')}
            alt={img.title}
            loading="lazy"
            onLoad={(e) => onImageLoad(e, img.id)}
            onClick={(e) => {
              e.stopPropagation()
              onOpenImage(e, img)
            }}
            className="w-full h-full object-cover select-none cursor-pointer"
          />
        )}
      </div>

      {/* Gradient Reveal for metadata - hidden until hover */}
      {isActive && (
        <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-black/70 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
            <h3 className="font-semibold text-sm text-white drop-shadow" title={img.title}>
              {displayTitle}
            </h3>
          </div>
        </div>
      )}
    </div>
  )
}

export default SortablePinnedCard
