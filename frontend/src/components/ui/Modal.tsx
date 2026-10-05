import React, { useEffect } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: React.ReactNode
  width?: string
  headerIcon?: React.ReactNode
}

/**
 * Flat modal frame. Rendered inside the dashboard root so it picks up the
 * theme tokens (.lp / .dash) and the dark-mode toggle.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen, onClose, title, subtitle, children, width = 'max-w-[480px]', headerIcon,
}) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (isOpen) {
      document.addEventListener('keydown', handleKey)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="dash-modal-wrap" role="dialog" aria-modal="true" aria-label={title}>
      <button className="dash-modal-scrim" aria-label="Close dialog" onClick={onClose} tabIndex={-1} />
      <div className={`dash-modal ${width}`}>
        {(title || headerIcon) && (
          <div className="dash-modal-head">
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {headerIcon}
              <div>
                {title && <h2>{title}</h2>}
                {subtitle && <p>{subtitle}</p>}
              </div>
            </div>
            <button className="lp-btn small" onClick={onClose} aria-label="Close">Close</button>
          </div>
        )}
        <div className="dash-modal-body">{children}</div>
      </div>
    </div>
  )
}
