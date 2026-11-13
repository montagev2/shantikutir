import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { trackOrderPublic } from '../lib/api'

export default function TrackOrder() {
  const { state } = useLocation()
  const [orderId, setOrderId] = useState<string>(state?.orderId ?? '')
  const [orderData, setOrderData] = useState<Record<string, unknown> | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleTrack() {
    if (!orderId.trim()) { setError('Please enter an order ID'); return }
    setError('')
    setBusy(true)
    try {
      const data = await trackOrderPublic(orderId.trim().toUpperCase())
      setOrderData(data as Record<string, unknown>)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Order not found')
    } finally {
      setBusy(false)
    }
  }

  const STATUS_COLORS: Record<string, string> = {
    pending: '#d97706',
    confirmed: '#2563eb',
    preparing: '#7c3aed',
    ready: '#0891b2',
    delivered: '#65a30d',
    cancelled: '#c2410c',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>
        <h2 style={{ fontFamily: 'Playfair Display, serif', color: 'var(--color-terracotta)', marginBottom: '1.5rem', textAlign: 'center' }}>
          Track Your Order
        </h2>
        <div style={{ background: '#fff', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="Enter order ID (e.g. SK-1411-123)"
            value={orderId}
            onChange={e => setOrderId(e.target.value.toUpperCase())}
            style={inputStyle}
          />
          <button
            onClick={handleTrack}
            disabled={busy}
            style={{ ...primaryBtnStyle, marginTop: '0.75rem', width: '100%' }}
          >
            {busy ? 'Searching...' : 'Track Order'}
          </button>
          {error && <p style={{ color: '#c2410c', fontSize: '0.88rem', marginTop: '0.5rem', textAlign: 'center' }}>{error}</p>}
        </div>

        {orderData && (
          <div style={{ background: '#fff', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <strong style={{ fontFamily: 'Playfair Display, serif', color: 'var(--color-teak)' }}>
                {String(orderData.id)}
              </strong>
              <span style={{
                background: STATUS_COLORS[String(orderData.status)] ?? '#78716c',
                color: '#fff',
                borderRadius: '999px',
                padding: '0.2rem 0.75rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                textTransform: 'capitalize',
              }}>
                {String(orderData.status)}
              </span>
            </div>
            <p style={{ color: '#78716c', fontSize: '0.9rem', margin: 0 }}>
              Total: <strong>Rs. {String(orderData.total)}</strong>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  border: '1.5px solid #e7e5e4',
  borderRadius: '0.5rem',
  padding: '0.7rem 1rem',
  fontSize: '0.95rem',
  fontFamily: 'Inter, sans-serif',
  color: 'var(--color-teak)',
  background: 'var(--color-bg)',
  width: '100%',
  boxSizing: 'border-box',
}

const primaryBtnStyle: React.CSSProperties = {
  background: 'var(--color-terracotta)',
  color: '#fff',
  border: 'none',
  borderRadius: '0.5rem',
  padding: '0.8rem',
  fontSize: '0.95rem',
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'Inter, sans-serif',
}
