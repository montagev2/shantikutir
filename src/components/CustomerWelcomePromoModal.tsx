import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchActiveCouponsForUserApi } from '../lib/api'
import { showToast } from './Toast'
import type { Coupon } from '../types'

function formatCountdown(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return 'Expired'
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return `${days}d ${hours % 24}h remaining`
  }
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
}

export default function CustomerWelcomePromoModal() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [promoCoupon, setPromoCoupon] = useState<Coupon | null>(null)
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    let isMounted = true

    const checkCoupons = async () => {
      try {
        const coupons = await fetchActiveCouponsForUserApi(user?.phone)
        if (!isMounted || !coupons || coupons.length === 0) return

        // Look for valid coupons with show_popup enabled, prioritizing personal targeted ones first
        const candidates = coupons.filter((c: Coupon) => {
          if (!c.valid || !c.show_popup) return false
          if (c.expires_at && new Date(c.expires_at).getTime() <= Date.now()) return false
          const dismissedKey = `sk_dismissed_promo_${c.code}`
          try {
            return !sessionStorage.getItem(dismissedKey)
          } catch {
            return true
          }
        })

        candidates.sort((a: Coupon, b: Coupon) => {
          const aTargeted = a.target_phone ? 1 : 0
          const bTargeted = b.target_phone ? 1 : 0
          if (bTargeted !== aTargeted) return bTargeted - aTargeted
          return (b.discount_value || 0) - (a.discount_value || 0)
        })

        const candidate = candidates[0]

        if (candidate) {
          setPromoCoupon(candidate)
          if (candidate.expires_at) {
            setTimeLeft(formatCountdown(candidate.expires_at))
          }
        }
      } catch (err) {
        console.warn('[CustomerWelcomePromoModal] fetch error:', err)
      }
    }

    void checkCoupons()

    return () => {
      isMounted = false
    }
  }, [user?.phone])

  // Countdown timer
  useEffect(() => {
    if (!promoCoupon || !promoCoupon.expires_at) return
    const timer = setInterval(() => {
      const remaining = formatCountdown(promoCoupon.expires_at!)
      if (remaining === 'Expired') {
        setPromoCoupon(null)
        clearInterval(timer)
      } else {
        setTimeLeft(remaining)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [promoCoupon])

  if (!promoCoupon) return null

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(`sk_dismissed_promo_${promoCoupon.code}`, '1')
    } catch {}
    setPromoCoupon(null)
  }

  const handleClaimAndApply = () => {
    try {
      localStorage.setItem('sk_claimed_coupon', promoCoupon.code)
      sessionStorage.setItem(`sk_dismissed_promo_${promoCoupon.code}`, '1')
    } catch {}
    showToast(`Code ${promoCoupon.code} applied to your checkout!`, 'i')
    setPromoCoupon(null)
    navigate('/cart')
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'grid',
        placeItems: 'center',
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleDismiss()
      }}
    >
      <div
        className="tfg-glass-elevated"
        style={{
          background: 'linear-gradient(145deg, rgba(28, 25, 23, 0.98), rgba(18, 18, 20, 0.98))',
          border: '1.5px solid rgba(245, 158, 11, 0.5)',
          borderRadius: '24px',
          padding: '1.75rem',
          maxWidth: '440px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(245, 158, 11, 0.2)',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            color: '#a1a1aa',
            fontSize: '1rem',
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
            touchAction: 'manipulation',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        {/* Exclusive Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: '20px', padding: '4px 14px', fontSize: '0.74rem', fontWeight: 800, color: '#f59e0b', margin: '0 auto 1rem' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
          <span>{promoCoupon.target_phone ? 'Exclusive Member Reward' : 'Resort Special Offer'}</span>
        </div>

        {/* Title */}
        <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#fafaf9', margin: '0 0 0.35rem', letterSpacing: '-0.02em' }}>
          {promoCoupon.popup_title || (promoCoupon.target_phone ? 'Special Gift Just For You!' : 'Special Offer for You!')}
        </h2>
        <p style={{ fontSize: '0.82rem', color: '#a1a1aa', margin: '0 0 1.25rem' }}>
          {promoCoupon.target_phone
            ? 'You have an exclusive dining credit waiting on your account.'
            : 'Enjoy a special dining discount on your next resort order.'}
        </p>

        {/* Value Callout Card */}
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px dashed rgba(245, 158, 11, 0.5)',
            borderRadius: '16px',
            padding: '1rem',
            marginBottom: '1rem',
          }}
        >
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#f59e0b', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {promoCoupon.discount_type === 'flat' ? `Flat Rs ${promoCoupon.discount_value} OFF` : `${promoCoupon.discount_value}% OFF`}
          </div>
          {promoCoupon.min_order > 0 ? (
            <div style={{ fontSize: '0.75rem', color: '#d6d3d1', marginTop: '4px' }}>
              Valid on orders above Rs {promoCoupon.min_order}
            </div>
          ) : (
            <div style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 700, marginTop: '4px' }}>
              Valid on all orders â€” Zero minimum order!
            </div>
          )}

          {/* Code display */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: '#121214',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '10px',
              padding: '6px 14px',
              marginTop: '0.75rem',
            }}
          >
            <span style={{ fontSize: '0.72rem', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 700 }}>Code:</span>
            <code style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fafaf9', letterSpacing: '0.08em' }}>
              {promoCoupon.code}
            </code>
          </div>
        </div>

        {/* Live Countdown Timer */}
        {promoCoupon.expires_at && timeLeft && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '20px',
              padding: '4px 12px',
              fontSize: '0.75rem',
              fontWeight: 800,
              color: '#fca5a5',
              marginBottom: '1.25rem',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>Expires in: {timeLeft}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
          <button
            type="button"
            onClick={handleClaimAndApply}
            style={{
              width: '100%',
              minHeight: '46px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              border: 'none',
              borderRadius: '12px',
              color: '#18181b',
              fontWeight: 900,
              fontSize: '0.92rem',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(245, 158, 11, 0.35)',
              touchAction: 'manipulation',
            }}
          >
            Claim & Apply to Cart
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#a1a1aa',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '0.4rem',
              touchAction: 'manipulation',
            }}
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  )
}

