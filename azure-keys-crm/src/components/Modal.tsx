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

  // On desktop only: lock body scroll. Never on iOS — it breaks overlay scroll.
  useEffect(() => {
    if (isMobile) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [isMobile])

  if (isMobile) {
    return (
      // The overlay IS the scroll container — no flex, no justify, just scroll
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          overflowY: 'scroll',
          // iOS requires -webkit prefix for momentum scrolling
          WebkitOverflowScrolling: 'touch' as any,
          background: 'rgba(17,24,39,0.6)',
          backdropFilter: 'blur(4px)',
        }}
      >
        {/* Spacer pushes sheet to bottom on short content, tappable to close */}
        <div
          onClick={onClose}
          style={{ minHeight: '15vh' }}
        />

        {/* Sheet — no maxHeight, no overflow:hidden, grows to full content */}
        <div
          style={{
            width: '100%',
            background: 'var(--surface)',
            borderRadius: '20px 20px 0 0',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.4)',
            // Ensure it reaches the very bottom of the screen
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
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

  // Desktop: overlay scrolls, modal centered block, no height cap
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        overflowY: 'auto',
        background: 'rgba(17,24,39,0.55)',
        backdropFilter: 'blur(4px)',
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
