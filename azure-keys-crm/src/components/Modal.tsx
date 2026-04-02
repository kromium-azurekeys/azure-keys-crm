'use client'

import { useEffect } from 'react'
import { useIsMobile } from '@/hooks/useIsMobile'

interface ModalProps {
  onClose: () => void
  children: React.ReactNode
  maxWidth?: number
}

export default function Modal({ onClose, children, maxWidth = 580 }: ModalProps) {
  const isMobile = useIsMobile()

  // Desktop only: lock body scroll. Never on iOS — breaks overlay scroll.
  useEffect(() => {
    if (isMobile) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [isMobile])

  if (isMobile) {
    return (
      // Overlay IS the scroll container
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          overflowY: 'scroll',
          WebkitOverflowScrolling: 'touch' as any,
          background: 'rgba(17,24,39,0.6)',
          backdropFilter: 'blur(4px)',
        }}
      >
        {/* Tappable spacer to close */}
        <div onClick={onClose} style={{ minHeight: '15vh' }} />
        {/* Sheet slides up from bottom */}
        <div style={{
          width: '100%',
          background: 'var(--surface)',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.4)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          border: '1px solid var(--border)',
        }}>
          {/* Drag handle */}
          <div style={{
            width: 40, height: 4, borderRadius: 2,
            background: 'var(--border-strong)',
            margin: '12px auto 4px',
          }} />
          {children}
        </div>
      </div>
    )
  }

  // Desktop: overlay is a plain scrollable block.
  // The .modal div centers itself with margin: 0 auto (set in globals.css).
  // No flex on the overlay — flex prevents tall modals from scrolling correctly.
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        overflowY: 'auto',
        background: 'rgba(17,24,39,0.55)',
        backdropFilter: 'blur(4px)',
        padding: '32px 20px 48px',
      }}
    >
      {children}
    </div>
  )
}
