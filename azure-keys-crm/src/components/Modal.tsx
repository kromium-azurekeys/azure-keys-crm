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

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  if (isMobile) {
    return (
      // Overlay: fills screen, scrolls vertically, content sticks to bottom
      <div
        onClick={e => e.target === e.currentTarget && onClose()}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(17,24,39,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 50,
          // Scroll container — overflow:auto here, NOT on the modal
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch' as any,
          // Push content to bottom using padding at top
          paddingTop: '15vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
        }}
      >
        {/* Sheet — grows to full content height, no clipping */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%',
            background: 'var(--surface)',
            borderRadius: '20px 20px 0 0',
            boxShadow: '0 -4px 32px rgba(0,0,0,0.3)',
            animation: 'slideUp 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
            // No maxHeight, no overflow:hidden — content is fully visible
            flexShrink: 0,
          }}
        >
          {/* Drag handle pill */}
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

  // Desktop: overlay scrolls, modal is a plain centered block
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(17,24,39,0.55)',
        backdropFilter: 'blur(4px)',
        zIndex: 50,
        overflowY: 'auto',
        padding: '32px 20px 48px',
      }}
    >
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: 14,
          boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          border: '1px solid var(--border)',
          animation: 'fadeUp 0.2s ease',
          width: '90%',
          maxWidth,
          margin: '0 auto',
        }}
      >
        {children}
      </div>
    </div>
  )
}
