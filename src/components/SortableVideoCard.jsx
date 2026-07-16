import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useNavigate } from 'react-router-dom'
import { useRef, useEffect } from 'react'
import VideoCard from './VideoCard'

// A sortable pinned video card for drag-and-drop reordering.
// Wraps the VideoCard component with drag functionality and custom click handling
// to prevent navigation when a drag/drop occurs.
function SortableVideoCard({
  video,
  onEdit,
  onDelete,
  onTogglePin,
}) {
  const navigate = useNavigate()
  const wasDraggingRef = useRef(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: video.id })

  // Track when drag starts so the trailing click after drop doesn't navigate
  useEffect(() => {
    if (isDragging) {
      wasDraggingRef.current = true
    }
  }, [isDragging])

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  }

  // Handle click on the wrapper div
  // Suppress navigation if this click follows a drag/drop
  const handleClick = (e) => {
    // If this click follows a drag, suppress it and reset the flag
    if (wasDraggingRef.current) {
      wasDraggingRef.current = false
      e.preventDefault()
      e.stopPropagation()
      return
    }
    // Navigate to the watch page for a plain click (no drag)
    navigate(`/watch/${video.short_id}`)
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={`transition-all duration-300 ease-out ${
        isDragging ? 'opacity-75 shadow-2xl ring-2 ring-violet-500/50 scale-105' : ''
      }`}
    >
      <VideoCard
        video={video}
        showActions
        disableLink
        onEdit={onEdit}
        onDelete={(e, v) => onDelete(e, v)}
        onTogglePin={onTogglePin}
      />
    </div>
  )
}

export default SortableVideoCard
