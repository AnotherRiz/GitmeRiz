import { useState, useEffect } from 'react'

function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  tip,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
}) {
  const [isClosing, setIsClosing] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  // Trigger visibility state after mount for fade-in animation
  useEffect(() => {
    if (isOpen && !isClosing) {
      // Use requestAnimationFrame to ensure the element is rendered first
      const frame = requestAnimationFrame(() => {
        setIsVisible(true)
      })
      return () => cancelAnimationFrame(frame)
    } else {
      setIsVisible(false)
    }
  }, [isOpen, isClosing])

  // Handle Esc key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isClosing) {
        handleClose()
      }
      if (e.key === 'Enter' && isOpen && !isClosing && onConfirm) {
        onConfirm()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, isClosing, onConfirm])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 300)
  }

  if (!isOpen && !isClosing) return null

  const isAlert = !onConfirm // Alert mode = single OK button

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ pointerEvents: isVisible ? 'auto' : 'none' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70"
        onClick={handleClose}
        aria-label="Close modal"
      />

      {/* Modal Card */}
      <div
        className={`relative w-full max-w-md rounded-2xl border border-light-card-border dark:border-dark-card-border bg-light-card dark:bg-dark-card shadow-2xl transition-all duration-300 ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        <div className="p-6">
          {/* Title */}
          <h2
            id="confirm-modal-title"
            className="text-xl font-semibold mb-3 text-light-text dark:text-dark-text"
          >
            {title}
          </h2>

          {/* Message */}
          <div className="text-sm text-light-text/80 dark:text-dark-text/80 mb-4">
            {message}
          </div>

          {/* Tip (optional) */}
          {tip && (
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
              {tip}
            </div>
          )}

          {/* Buttons */}
          <div className={`flex gap-3 ${isAlert ? 'justify-end' : 'justify-end'}`}>
            {!isAlert && (
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-lg border border-light-card-border dark:border-dark-card-border text-light-text dark:text-dark-text hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                {cancelText}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (onConfirm) {
                  onConfirm()
                } else {
                  handleClose()
                }
              }}
              autoFocus
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                variant === 'danger'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {onConfirm ? confirmText : 'Got it'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
