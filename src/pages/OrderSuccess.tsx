import { useLocation, useNavigate } from 'react-router-dom'
import { STORE_NAME } from '../lib/business'

export default function OrderSuccess() {
  const { state } = useLocation()
  const navigate = useNavigate()

  const orderId = state?.orderId ?? 'SK-XXXX-XXX'
  const paymentMethod = state?.paymentMethod ?? 'upi'
  const total = state?.total ?? 0

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', textAlign: 'center' }}>
      <div style={{ background: '#fff', borderRadius: '1rem', padding: '2.5rem 2rem', maxWidth: '420px', width: '100%', boxShadow: '0 4px 24px rgba(194,65,12,0.08)' }}>
        <div style={{ width: '4rem', height: '4rem', background: '#65a30d', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', fontSize: '1.8rem', color: '#fff' }}>
          &#10003;
        </div>
        <h2 style={{ fontFamily: 'Playfair Display, serif', color: 'var(--color-teak)', margin: '0 0 0.5rem' }}>Order Placed!</h2>
        <p style={{ color: '#78716c', margin: '0 0 1.5rem' }}>
          Thank you for ordering from {STORE_NAME}. We are preparing your food.
        </p>
        <div style={{ background: 'var(--color-bg)', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.85rem', color: '#78716c', marginBottom: '0.3rem' }}>Order ID</div>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-terracotta)' }}>{orderId}</div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#78716c' }}>
            Total: <strong>Rs. {total}</strong> · {paymentMethod === 'upi' ? 'UPI' : 'Cash'}
          </div>
        </div>

        {paymentMethod === 'upi' && (
          <p style={{ fontSize: '0.85rem', color: '#a8734e', marginBottom: '1.25rem' }}>
            Please ensure your UPI payment is complete. Share your UTR with staff if requested.
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            onClick={() => navigate('/track', { state: { orderId } })}
            style={{ background: 'var(--color-terracotta)', color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.8rem', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer' }}
          >
            Track Order
          </button>
          <button
            onClick={() => navigate('/')}
            style={{ background: '#fff', color: 'var(--color-terracotta)', border: '2px solid var(--color-terracotta)', borderRadius: '0.5rem', padding: '0.8rem', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer' }}
          >
            Order More
          </button>
        </div>
      </div>
    </div>
  )
}
