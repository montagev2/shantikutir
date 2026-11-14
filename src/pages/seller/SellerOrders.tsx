import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getAllOrdersStaff, updateOrderStatus, verifyUtr } from '../../lib/api'
import { isValidOtp } from '../../lib/security'
import { Toast, useToast } from '../../components/Toast'
import { Loader } from '../../components/Loader'
import type { Order } from '../../types'

const STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'ready', 'delivered']

export default function SellerOrders() {
  const { profile } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [otp, setOtp] = useState<Record<string, string>>({})
  const { toast, showToast, hideToast } = useToast()

  async function fetchOrders() {
    try {
      const data = await getAllOrdersStaff()
      setOrders((data ?? []) as Order[])
    } catch {
      showToast('Failed to load orders', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 10000)
    return () => clearInterval(interval)
  }, [])

  async function advance(order: Order) {
    if (!profile) return
    const idx = STATUS_FLOW.indexOf(order.status)
    if (idx < 0 || idx >= STATUS_FLOW.length - 1) return
    const nextStatus = STATUS_FLOW[idx + 1]

    if (nextStatus === 'delivered' && order.payment_method === 'upi' && !order.utr_verified) {
      showToast('Verify UPI / UTR payment before completing order', 'error')
      return
    }
    if (nextStatus === 'delivered' && order.otp_code) {
      const enteredOtp = otp[order.id] ?? ''
      if (!isValidOtp(enteredOtp) || enteredOtp !== order.otp_code) {
        showToast('Please enter the correct 4-digit handover OTP from the customer', 'error')
        return
      }
    }

    try {
      await updateOrderStatus(order.id, nextStatus, profile.id)
      showToast(`Order status updated to: ${nextStatus.toUpperCase()}`, 'success')
      fetchOrders()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Update failed', 'error')
    }
  }

  async function handleVerifyUtr(order: Order) {
    if (!profile) return
    try {
      await verifyUtr(order.id, profile.id, true)
      showToast('UTR payment verified successfully', 'success')
      fetchOrders()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Verification failed', 'error')
    }
  }

  if (loading) return <Loader text="Connecting to Kitchen Order Queue..." />

  const active = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status))
  const completed = orders.filter((o) => ['delivered', 'cancelled'].includes(o.status))

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {toast && <Toast key={toast.key} message={toast.message} type={toast.type} onClose={hideToast} />}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', color: '#fff', margin: 0 }}>
            Active Kitchen Queue ({active.length})
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
            Auto-refreshes every 10s · Live status changes update customer tracker immediately
          </p>
        </div>
        <button className="btn-ghost" onClick={fetchOrders} style={{ fontSize: '0.85rem' }}>
           Refresh Now
        </button>
      </div>

      {active.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem 1.5rem', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}></div>
          <h3 style={{ fontSize: '1.3rem', color: '#fff', marginBottom: '0.5rem' }}>Kitchen is Clear!</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No active orders waiting in queue right now.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
          {active.map((order) => {
            const currentIdx = STATUS_FLOW.indexOf(order.status)
            const nextStep = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null

            return (
              <div
                key={order.id}
                className="glass-panel-elevated"
                style={{
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: order.status === 'pending' ? '1.5px solid var(--gold)' : '1px solid var(--glass-border)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.65rem' }}>
                    <div>
                      <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 800, fontSize: '1.15rem', color: 'var(--gold)' }}>
                        {order.id}
                      </span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <span
                      style={{
                        background: order.status === 'pending' ? 'rgba(223, 177, 91, 0.2)' : 'rgba(194, 65, 12, 0.2)',
                        color: order.status === 'pending' ? 'var(--gold)' : 'var(--primary)',
                        border: `1px solid ${order.status === 'pending' ? 'var(--gold)' : 'var(--primary)'}`,
                        borderRadius: 'var(--radius-full)',
                        padding: '0.2rem 0.65rem',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                      }}
                    >
                      {order.status}
                    </span>
                  </div>

                  {/* Customer & Location */}
                  <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.85rem', fontSize: '0.82rem' }}>
                    <div style={{ color: '#fff', fontWeight: 700 }}>
                       {order.customer_name} ({order.customer_phone})
                    </div>
                    <div style={{ color: 'var(--gold)', fontWeight: 600, marginTop: '0.2rem' }}>
                       Mode: {order.dining_mode.toUpperCase()}
                      {order.table_number && ` · Table #${order.table_number}`}
                    </div>
                    {order.delivery_address && (
                      <div style={{ color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        {order.delivery_address}
                      </div>
                    )}
                  </div>

                  {/* Dish Items */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
                    {(order.items ?? []).map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                        <span>
                          <strong style={{ color: '#fff' }}>{item.quantity}x</strong> {item.product_name}
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                            ({item.size_label})
                          </span>
                        </span>
                        <span>₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Payment: <strong style={{ textTransform: 'uppercase', color: '#fff' }}>{order.payment_method}</strong>
                    </span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--font-serif)' }}>
                      ₹{order.total}
                    </span>
                  </div>

                  {order.payment_method === 'upi' && !order.utr_verified && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(223, 177, 91, 0.1)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--gold)' }}>
                        UTR: {order.utr_number || 'Awaiting customer entry'}
                      </span>
                      <button
                        className="btn-gold"
                        onClick={() => handleVerifyUtr(order)}
                        style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}
                      >
                        Verify UTR ✓
                      </button>
                    </div>
                  )}

                  {order.status === 'ready' && order.otp_code && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--gold)', marginBottom: '0.25rem', fontWeight: 700 }}>
                        Enter 4-Digit Customer OTP:
                      </label>
                      <input
                        type="text"
                        placeholder="••••"
                        value={otp[order.id] ?? ''}
                        onChange={(e) =>
                          setOtp((o) => ({ ...o, [order.id]: e.target.value.replace(/\D/g, '').slice(0, 4) }))
                        }
                        style={{ width: '100%', padding: '0.45rem', fontSize: '1rem', textAlign: 'center', letterSpacing: '0.2em' }}
                      />
                    </div>
                  )}

                  {nextStep && (
                    <button
                      className="btn-primary"
                      onClick={() => advance(order)}
                      style={{ width: '100%', padding: '0.65rem', fontSize: '0.9rem' }}
                    >
                      Advance Status → {nextStep.toUpperCase()}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Completed Orders Fold */}
      {completed.length > 0 && (
        <div style={{ marginTop: '3rem' }}>
          <h3 style={{ fontSize: '1.25rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Completed Today ({completed.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {completed.slice(0, 8).map((order) => (
              <div
                key={order.id}
                className="glass-panel"
                style={{
                  padding: '0.75rem 1.25rem',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  opacity: 0.7,
                }}
              >
                <div>
                  <span style={{ fontWeight: 700, color: '#fff' }}>{order.id}</span>
                  <span style={{ marginLeft: '1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    {order.customer_name} · {order.dining_mode}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--gold)', fontWeight: 800 }}>₹{order.total}</span>
                  <span style={{ marginLeft: '0.75rem', fontSize: '0.78rem', color: 'var(--emerald)', textTransform: 'uppercase', fontWeight: 700 }}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
