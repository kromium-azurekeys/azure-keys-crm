'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useIsMobile } from '@/hooks/useIsMobile'

interface ModalProps {
  onClose: () => void
  children: React.ReactNode
  maxWidth?: number
}

export default function Modal({ onClose, children }: ModalProps) {
  const isMobile = useIsMobile()
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true

    // Lock body scroll on desktop only — never on iOS (breaks overlay scroll)
    if (!isMobile) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [isMobile])

  // Render into document.body via portal so the modal escapes any
  // overflow:hidden / height:100vh ancestors in the CRM layout tree.
  // Without a portal, position:fixed children are still clipped by
  // parent stacking contexts created by overflow:hidden on a height-constrained div.
  if (typeof document === 'undefined') return null

  const overlay = isMobile ? (
    // ── MOBILE: full-screen scroll container, sheet at bottom ──
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        overflowY: 'scroll',
        WebkitOverflowScrolling: 'touch' as any,
        background: 'rgba(17,24,39,0.6)',
        backdropFilter: 'blur(4px)',
      }}
    >
      {/* Tappable spacer to close */}
      <div onClick={onClose} style={{ minHeight: '15vh' }} />
      {/* Sheet */}
      <div style={{
        width: '100%',
        background: 'var(--surface)',
        borderRadius: '20px 20px 0 0',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.4)',
        border: '1px solid var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
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
  ) : (
    // ── DESKTOP: scrollable overlay, .modal card centers with margin:auto ──
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        overflowY: 'auto',
        background: 'rgba(17,24,39,0.55)',
        backdropFilter: 'blur(4px)',
        padding: '40px 20px 60px',
      }}
    >
      {children}
    </div>
  )

  return createPortal(overlay, document.body)
}
