import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import VideoCard from './VideoCard'

// A sortable pinned video card for drag-and-drop reordering.
// Wraps the VideoCard component with drag functionality.
function SortableVideoCard({
  video,
  onEdit,
  onDelete,
  onTogglePin,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: video.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
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
      className={`transition-all duration-300 ease-out ${
        isDragging ? 'opacity-75 shadow-2xl ring-2 ring-violet-500/50 scale-105' : ''
      }`}
    >
      <VideoCard
        video={video}
        showActions
        onEdit={onEdit}
        onDelete={(e, v) => onDelete(e, v)}
        onTogglePin={onTogglePin}
      />
    </div>
  )
}

export default SortableVideoCard
