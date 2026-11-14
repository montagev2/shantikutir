import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { trackOrderPublic } from '../lib/api'
import { STORE_NAME, SUPPORT_PHONE } from '../lib/business'
import { Toast, useToast } from '../components/Toast'

const STEPS = [
  { key: 'pending', label: 'Order Placed', desc: 'Sent to Shanti Kutir kitchen' },
  { key: 'confirmed', label: 'Confirmed', desc: 'Kitchen accepted the order' },
  { key: 'preparing', label: 'Cooking', desc: 'Slow-cooking Dum Biryani & Tandoor' },
  { key: 'ready', label: 'Food Ready', desc: 'Packed hot for pickup or dispatch' },
  { key: 'delivered', label: 'Completed', desc: 'Delivered / Handed over' },
]

export default function TrackOrder() {
  const { state } = useLocation()
  const [orderId, setOrderId] = useState<string>(state?.orderId ?? '')
  const [orderData, setOrderData] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const { toast, showToast, hideToast } = useToast()

  async function fetchStatus(id: string) {
    if (!id.trim()) return
    setBusy(true)
    try {
      const data = await trackOrderPublic(id.trim().toUpperCase())
      setOrderData(data)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Order not found', 'error')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (state?.orderId) {
      fetchStatus(state.orderId)
    }
  }, [state])

  // Polling every 12 seconds when tracking
  useEffect(() => {
    if (!orderId || !orderData || orderData.status === 'delivered' || orderData.status === 'cancelled') return
    const interval = setInterval(() => {
      fetchStatus(orderId)
    }, 12000)
    return () => clearInterval(interval)
  }, [orderId, orderData])

  const currentStepIdx = orderData ? STEPS.findIndex((s) => s.key === orderData.status) : -1

  return (
    <div className="site-container animate-fade-in" style={{ paddingTop: '2.5rem', maxWidth: '640px' }}>
      {toast && <Toast key={toast.key} message={toast.message} type={toast.type} onClose={hideToast} />}

      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', color: '#fff', margin: '0 0 0.5rem' }}>Live Order Tracker</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
          Follow your authentic Bengali meal in real-time at {STORE_NAME}
        </p>
      </div>

      {/* ── Search Input ── */}
      <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <input
            type="text"
            placeholder="Enter Order ID (e.g. SK-1411-123)"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value.toUpperCase())}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              fontSize: '1rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
            }}
          />
          <button
            className="btn-gold"
            onClick={() => fetchStatus(orderId)}
            disabled={busy || !orderId.trim()}
            style={{ padding: '0.75rem 1.4rem', whiteSpace: 'nowrap' }}
          >
            {busy ? 'Searching...' : 'Track'}
          </button>
        </div>
      </div>

      {/* ── Order Status Details ── */}
      {orderData && (
        <div className="glass-panel animate-pop-in" style={{ borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Order ID</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--font-serif)' }}>
                {orderData.id}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Total Amount</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                ₹{orderData.total}
              </div>
            </div>
          </div>

          {/* Stepper Timeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative', paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
            {/* Vertical Line */}
            <div
              style={{
                position: 'absolute',
                top: '12px',
                bottom: '12px',
                left: '26px',
                width: '3px',
                background: 'rgba(255, 255, 255, 0.08)',
                zIndex: 1,
              }}
            />

            {STEPS.map((step, idx) => {
              const isPast = currentStepIdx > idx
              const isCurrent = currentStepIdx === idx

              return (
                <div key={step.key} style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem', position: 'relative', zIndex: 2 }}>
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: isPast
                        ? 'var(--emerald)'
                        : isCurrent
                        ? 'var(--gold)'
                        : 'var(--surface-2)',
                      border: `3px solid ${isCurrent ? 'var(--gold-glow)' : 'var(--bg-main)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isPast || isCurrent ? '#0c0b0a' : 'var(--text-muted)',
                      fontSize: '0.75rem',
                      fontWeight: 900,
                      boxShadow: isCurrent ? '0 0 16px var(--gold)' : 'none',
                      flexShrink: 0,
                    }}
                  >
                    {isPast ? '✓' : idx + 1}
                  </div>
                  <div>
                    <div style={{ fontWeight: isCurrent ? 800 : 600, fontSize: '0.98rem', color: isCurrent ? 'var(--gold)' : isPast ? '#fff' : 'var(--text-muted)' }}>
                      {step.label}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-faint)', marginTop: '0.15rem' }}>
                      {step.desc}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Quick Help & Call Button */}
          <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Need urgent updates on your order?
            </span>
            <a
              href={`tel:${SUPPORT_PHONE}`}
              className="btn-ghost"
              style={{ fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <span></span>
              <span>Call Restaurant</span>
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
