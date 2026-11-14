import { useLocation, useNavigate, Link } from 'react-router-dom'
import { STORE_NAME, SUPPORT_PHONE } from '../lib/business'

export default function OrderSuccess() {
  const { state } = useLocation()
  const navigate = useNavigate()

  const orderId = state?.orderId ?? 'SK-ORDER'
  const paymentMethod = state?.paymentMethod ?? 'upi'
  const total = state?.total ?? 0

  return (
    <div className="site-container animate-fade-in" style={{ padding: '3.5rem 1rem', maxWidth: '520px' }}>
      <div
        className="glass-panel-elevated animate-pop-in"
        style={{
          borderRadius: 'var(--radius-lg)',
          padding: '2.5rem 2rem',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Glow ambient background */}
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '240px',
            height: '160px',
            background: 'radial-gradient(circle, rgba(16,185,129,0.25) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Checkmark icon */}
        <div
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--emerald) 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            color: '#fff',
            fontSize: '2rem',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.45)',
          }}
        >
          ✓
        </div>

        <h1 style={{ fontSize: '1.75rem', color: '#fff', margin: '0 0 0.5rem' }}>Order Confirmed!</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: '0 0 1.75rem', lineHeight: 1.5 }}>
          Your meal is being prepared with authentic Bengali warmth at {STORE_NAME}.
        </p>

        {/* Order ID Pill Card */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1.5px solid rgba(223, 177, 91, 0.35)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            marginBottom: '1.75rem',
          }}
        >
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Your Order Tracking ID
          </div>
          <div
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.65rem',
              fontWeight: 800,
              color: 'var(--gold)',
              margin: '0.35rem 0',
            }}
          >
            {orderId}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Total: <strong style={{ color: '#fff' }}>₹{total}</strong> · Paid via <strong style={{ textTransform: 'uppercase' }}>{paymentMethod}</strong>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--emerald)', marginTop: '0.4rem', fontWeight: 600 }}>
            Estimated Kitchen Time: ~15-20 Mins
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            className="btn-gold"
            onClick={() => navigate('/track', { state: { orderId } })}
            style={{ padding: '0.85rem', fontSize: '1rem', width: '100%', borderRadius: 'var(--radius-md)' }}
          >
            ⏱️ Track Live Order Status
          </button>
          <Link
            to="/"
            className="btn-ghost"
            style={{ padding: '0.75rem', fontSize: '0.9rem', width: '100%', borderRadius: 'var(--radius-md)' }}
          >
            Return to Menu
          </Link>
        </div>

        <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: '1.5rem', marginBottom: 0 }}>
          For inquiries or dietary changes, call our highway kitchen at{' '}
          <a href={`tel:${SUPPORT_PHONE}`} style={{ color: 'var(--gold)', textDecoration: 'underline' }}>
            {SUPPORT_PHONE}
          </a>
        </p>
      </div>
    </div>
  )
}
