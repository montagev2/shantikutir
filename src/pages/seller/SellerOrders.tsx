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
    } catch (err) {
      showToast('Failed to load orders', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 15000)
    return () => clearInterval(interval)
  }, [])

  async function advance(order: Order) {
    if (!profile) return
    const idx = STATUS_FLOW.indexOf(order.status)
    if (idx < 0 || idx >= STATUS_FLOW.length - 1) return
    const nextStatus = STATUS_FLOW[idx + 1]
    if (nextStatus === 'delivered' && order.payment_method === 'upi' && !order.utr_verified) {
      showToast('Verify UTR before marking delivered', 'error')
      return
    }
    if (nextStatus === 'delivered' && order.otp_code) {
      const enteredOtp = otp[order.id] ?? ''
      if (!isValidOtp(enteredOtp) || enteredOtp !== order.otp_code) {
        showToast('Enter correct 4-digit OTP from customer', 'error')
        return
      }
    }
    try {
      await updateOrderStatus(order.id, nextStatus, profile.id)
      showToast('Status updated', 'success')
      fetchOrders()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed', 'error')
    }
  }

  async function handleVerifyUtr(order: Order) {
    if (!profile) return
    try {
      await verifyUtr(order.id, profile.id, true)
      showToast('UTR verified', 'success')
      fetchOrders()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed', 'error')
    }
  }

  if (loading) return <Loader text="Loading orders..." />

  const active = orders.filter(o => !['delivered', 'cancelled'].includes(o.status))
  const done = orders.filter(o => ['delivered', 'cancelled'].includes(o.status))

  return (
    <div style={{ padding: '1rem', background: 'var(--color-bg)', minHeight: '100vh' }}>
      {toast && <Toast key={toast.key} message={toast.message} type={toast.type} onClose={hideToast} />}
      <h2 style={{ fontFamily: 'Playfair Display, serif', color: 'var(--color-terracotta)', margin: '0 0 1rem' }}>Active Orders ({active.length})</h2>

      {active.length === 0 && <p style={{ color: '#78716c' }}>No active orders</p>}

      {active.map(order => (
        <div key={order.id} style={{ background: '#fff', borderRadius: '0.75rem', padding: '1rem', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <strong style={{ color: 'var(--color-teak)', fontFamily: 'Playfair Display, serif' }}>{order.id}</strong>
            <span style={{ background: 'var(--color-terracotta)', color: '#fff', borderRadius: '999px', padding: '0.2rem 0.6rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'capitalize' }}>{order.status}</span>
          </div>
          <p style={{ margin: '0 0 0.3rem', fontSize: '0.9rem', color: '#78716c' }}>
            {order.customer_name} · {order.customer_phone} · {order.dining_mode}
          </p>
          {(order.items ?? []).map((item, i) => (
            <p key={i} style={{ margin: 0, fontSize: '0.85rem', color: '#57534e' }}>
              {item.quantity}x {item.product_name} ({item.size_label}) — Rs. {item.price * item.quantity}
            </p>
          ))}
          <p style={{ margin: '0.5rem 0 0', fontWeight: 700, color: 'var(--color-terracotta)' }}>Total: Rs. {order.total}</p>
          <p style={{ margin: '0.2rem 0', fontSize: '0.82rem', color: '#78716c' }}>Payment: {order.payment_method.toUpperCase()} {order.utr_number ? `· UTR ${order.utr_number}` : ''}</p>

          {order.payment_method === 'upi' && !order.utr_verified && (
            <button onClick={() => handleVerifyUtr(order)} style={{ marginTop: '0.5rem', background: '#d97706', color: '#fff', border: 'none', borderRadius: '0.4rem', padding: '0.4rem 0.9rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
              Verify UTR
            </button>
          )}

          {order.status === 'ready' && order.otp_code && (
            <div style={{ marginTop: '0.5rem' }}>
              <input
                type="text"
                placeholder="4-digit OTP from customer"
                value={otp[order.id] ?? ''}
                onChange={e => setOtp(o => ({ ...o, [order.id]: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                style={{ border: '1.5px solid #e7e5e4', borderRadius: '0.4rem', padding: '0.4rem 0.75rem', fontSize: '0.9rem', width: '11rem' }}
              />
            </div>
          )}

          {order.status !== 'cancelled' && STATUS_FLOW.indexOf(order.status) < STATUS_FLOW.length - 1 && (
            <button onClick={() => advance(order)} style={{ marginTop: '0.5rem', background: 'var(--color-terracotta)', color: '#fff', border: 'none', borderRadius: '0.4rem', padding: '0.4rem 0.9rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
              Mark {STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1]}
            </button>
          )}
        </div>
      ))}

      {done.length > 0 && (
        <>
          <h3 style={{ fontFamily: 'Playfair Display, serif', color: '#78716c', margin: '1.5rem 0 0.75rem' }}>Completed ({done.length})</h3>
          {done.slice(0, 10).map(order => (
            <div key={order.id} style={{ background: '#f5f5f4', borderRadius: '0.6rem', padding: '0.75rem 1rem', marginBottom: '0.5rem', opacity: 0.75 }}>
              <span style={{ fontWeight: 600, color: 'var(--color-teak)' }}>{order.id}</span>
              <span style={{ marginLeft: '0.75rem', fontSize: '0.82rem', color: '#78716c', textTransform: 'capitalize' }}>{order.status}</span>
              <span style={{ marginLeft: '0.75rem', fontSize: '0.82rem', color: '#78716c' }}>Rs. {order.total}</span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
