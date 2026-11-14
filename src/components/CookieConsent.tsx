import { useState, useEffect } from 'react'

export interface CookiePreferences {
  accepted: boolean
  level: 'all' | 'essential'
  timestamp: string
}

const STORAGE_KEY = 'sk_cookie_consent_v1'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    // Check if consent has already been recorded
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        // Small delay so page loads smoothly before showing banner
        const timer = setTimeout(() => setVisible(true), 1200)
        return () => clearTimeout(timer)
      }
    } catch {
      // Storage access disabled (e.g. strict private mode)
      setVisible(false)
    }
  }, [])

  const saveConsent = (level: 'all' | 'essential') => {
    try {
      const pref: CookiePreferences = {
        accepted: true,
        level,
        timestamp: new Date().toISOString(),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pref))
    } catch {}
    setVisible(false)
  }

  if (!visible) return null

  return (
    <aside
      aria-label="Cookie and Privacy Consent"
      style={{
        position: 'fixed',
        bottom: '1rem',
        left: '1rem',
        right: '1rem',
        maxWidth: '560px',
        margin: '0 auto',
        zIndex: 9999,
        background: 'rgba(18, 18, 20, 0.96)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1.5px solid rgba(245, 158, 11, 0.45)',
        borderRadius: '20px',
        padding: '1.25rem 1.35rem',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.75), 0 0 25px rgba(245, 158, 11, 0.15)',
        color: '#fafaf9',
        animation: 'slideUp 0.35s ease-out',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
        <div
          style={{
            display: 'grid',
            placeItems: 'center',
            width: '36px',
            height: '36px',
            background: 'rgba(245, 158, 11, 0.12)',
            borderRadius: '12px',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            flexShrink: 0,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
            <strong style={{ fontSize: '0.98rem', color: '#f59e0b', fontWeight: 900, letterSpacing: '0.02em' }}>
              Cookie & Data Privacy Notice
            </strong>
            <span
              style={{
                fontSize: '0.68rem',
                background: 'rgba(34, 197, 94, 0.15)',
                color: '#4ade80',
                padding: '2px 8px',
                borderRadius: '9999px',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                fontWeight: 700,
              }}
            >
              DPDP Compliant
            </span>
          </div>

          <p style={{ fontSize: '0.82rem', color: '#d6d3d1', margin: '0 0 0.85rem', lineHeight: 1.5 }}>
            Shanti Kutir uses cookies and secure local storage to keep your session alive across page refreshes,
            remember your food cart, save dine-in preferences, and enable real-time GPS delivery tracking along NH-116.
          </p>

          {showDetails && (
            <div
              style={{
                background: 'rgba(28, 25, 23, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '0.75rem',
                marginBottom: '0.85rem',
                fontSize: '0.75rem',
                color: '#a1a1aa',
                lineHeight: 1.45,
              }}
            >
              <div style={{ marginBottom: '0.4rem' }}>
                <b style={{ color: '#f59e0b' }}>â€¢ Essential Storage:</b> Keeps you logged in as customer, staff, or rider; preserves active cart.
              </div>
              <div style={{ marginBottom: '0.4rem' }}>
                <b style={{ color: '#38bdf8' }}>â€¢ Functional Storage:</b> Remembers language choice (EN/BN) and sound alerts for kitchen orders.
              </div>
              <div>
                <b style={{ color: '#22c55e' }}>â€¢ Live GPS Tracking:</b> Calculates strict 5 km delivery radius from our Bhabanipur hub.
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => saveConsent('all')}
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#18181b',
                border: 'none',
                borderRadius: '10px',
                padding: '0.55rem 1.1rem',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
                transition: 'transform 0.15s ease',
              }}
            >
              Accept All
            </button>

            <button
              type="button"
              onClick={() => saveConsent('essential')}
              style={{
                background: '#27272a',
                color: '#fafaf9',
                border: '1px solid #3f3f46',
                borderRadius: '10px',
                padding: '0.55rem 0.9rem',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Essential Only
            </button>

            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              style={{
                background: 'transparent',
                color: '#a1a1aa',
                border: 'none',
                padding: '0.55rem 0.4rem',
                fontSize: '0.78rem',
                fontWeight: 600,
                textDecoration: 'underline',
                cursor: 'pointer',
                marginLeft: 'auto',
              }}
            >
              {showDetails ? 'Hide Details' : 'Cookie Details'}
            </button>

            <a
              href="/legal?tab=privacy"
              style={{
                color: '#f59e0b',
                fontSize: '0.74rem',
                textDecoration: 'none',
                fontWeight: 700,
                padding: '4px 8px',
                borderRadius: '6px',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
              }}
            >
              Privacy Policy â†’
            </a>
          </div>
        </div>
      </div>
    </aside>
  )
}

