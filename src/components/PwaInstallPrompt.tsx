import { useState, useEffect } from 'react'
import { STORE_NAME } from '../lib/business'

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    // Check if already running in standalone/installed mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    if (isStandalone) return

    // Check if user dismissed prompt recently
    const dismissed = localStorage.getItem('sk_pwa_dismissed')
    if (dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000) {
      return // Don't prompt for 7 days
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowPrompt(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('sk_pwa_dismissed', Date.now().toString())
  }

  if (!showPrompt) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(420px, 92vw)',
        background: '#1a1917',
        border: '1.5px solid #f59e0b',
        borderRadius: '16px',
        padding: '1rem',
        zIndex: 9990,
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6), 0 0 20px rgba(245, 158, 11, 0.25)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.85rem',
        animation: 'modalPop 0.3s ease-out',
      }}
    >
      <div
        style={{
          width: '46px',
          height: '46px',
          borderRadius: '12px',
          backgroundColor: '#d97706',
          backgroundImage: 'linear-gradient(135deg, #f59e0b, #d97706)',
          display: 'grid',
          placeItems: 'center',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <img src="/sk-logo.png" alt="" aria-hidden="true" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#f5f5f4', fontWeight: 800, fontSize: '0.9rem', lineHeight: 1.35, wordBreak: 'break-word' }}>
          Install {STORE_NAME} App
        </div>
        <div style={{ color: '#d6d3d1', fontSize: '0.78rem', marginTop: '2px', lineHeight: 1.4 }}>
          Fast 1-tap ordering directly from your home screen.
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
        <button
          type="button"
          onClick={handleInstall}
          style={{
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: '#111',
            border: 'none',
            padding: '0.45rem 0.85rem',
            borderRadius: '9999px',
            fontWeight: 800,
            fontSize: '0.8rem',
            cursor: 'pointer',
          }}
        >
          Install
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#78716c',
            fontSize: '1rem',
            padding: '0.2rem 0.4rem',
            cursor: 'pointer',
          }}
          aria-label="Dismiss"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
  )
}

