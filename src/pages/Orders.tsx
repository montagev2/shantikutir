import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useStore } from '../context/StoreContext'
import { supabase } from '../lib/supabase'
import { rateOrder } from '../lib/api'
import { Toast, useToast } from '../components/Toast'
import { Loader } from '../components/Loader'
import { STORE_NAME } from '../lib/business'

interface OrderHistoryItem {
  id: string
  created_at: string
  status: string
  total: number
  dining_mode: string
  payment_method: string
  rating: number | null
  items: Array<{
    product_name: string
    quantity: number
    price: number
    size_label: string
  }>
}

const STATUS_TAGS: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Order Placed', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  confirmed: { label: 'Confirmed', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' },
  preparing: { label: 'Cooking', color: '#c084fc', bg: 'rgba(192, 132, 252, 0.15)' },
  ready: { label: 'Ready for Pickup / Handover', color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)' },
  delivered: { label: 'Completed', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  cancelled: { label: 'Cancelled', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
}

export default function Orders() {
  const { profile } = useAuth()
  const { dispatch, products } = useStore()
  const navigate = useNavigate()
  const { toast, showToast, hideToast } = useToast()
  const [orders, setOrders] = useState<OrderHistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  async function loadOrders() {
    if (!profile) {
      setLoading(false)
      return
    }
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          created_at,
          status,
          total,
          dining_mode,
          payment_method,
          rating,
          items:order_items (
            product_name,
            quantity,
            price,
            size_label
          )
        `)
        .eq('customer_id', profile.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders((data ?? []) as unknown as OrderHistoryItem[])
    } catch {
      showToast('Could not fetch order history', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [profile])

  async function handleRate(orderId: string, rating: number) {
    try {
      await rateOrder(orderId, rating)
      showToast(`Thank you for rating ${rating} stars!`, 'success')
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, rating } : o))
      )
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not submit rating', 'error')
    }
  }

  function handleReorder(order: OrderHistoryItem) {
    let addedCount = 0
    for (const item of order.items) {
      const prod = products.find((p) => p.name.toLowerCase() === item.product_name.toLowerCase())
      if (prod && prod.in_stock) {
        dispatch({
          type: 'ADD_TO_CART',
          item: {
            product: prod,
            quantity: item.quantity,
            size: item.size_label === prod.label_b ? 'b' : item.size_label === prod.label_c ? 'c' : 'a',
          },
        })
        addedCount++
      }
    }
    if (addedCount > 0) {
      showToast(`Added ${addedCount} dishes to your cart`, 'success')
      navigate('/cart')
    } else {
      showToast('Dishes from this order are currently out of stock', 'error')
    }
  }

  if (loading) return <Loader text="Loading your orders..." />

  if (!profile) {
    return (
      <div className="site-container" style={{ padding: '4rem 1rem', textAlign: 'center', maxWidth: '440px' }}>
        <div className="glass-panel" style={{ padding: '2.5rem 1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}></div>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Sign In to View Orders</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Enter your mobile number to view past orders, track deliveries, and rate your meals.
          </p>
          <button className="btn-primary" onClick={() => navigate('/auth')} style={{ width: '100%' }}>
            Sign In with Mobile
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="site-container animate-fade-in" style={{ paddingTop: '2rem' }}>
      {toast && <Toast key={toast.key} message={toast.message} type={toast.type} onClose={hideToast} />}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: '#fff', margin: 0 }}>My Orders</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
            Track and review your authentic culinary experiences at {STORE_NAME}
          </p>
        </div>
        <Link to="/" className="btn-ghost" style={{ fontSize: '0.85rem' }}>
          Browse Menu
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3.5rem 1.5rem', textAlign: 'center', borderRadius: 'var(--radius-lg)', maxWidth: '480px', margin: '2rem auto' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}></div>
          <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>No orders placed yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Explore our highway thalis and hot charcoal tandoor specials.
          </p>
          <Link to="/" className="btn-gold">
            Order Food Now
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '780px' }}>
          {orders.map((order) => {
            const st = STATUS_TAGS[order.status] || { label: order.status, color: '#a8a29e', bg: 'rgba(255,255,255,0.08)' }
            const dateStr = new Date(order.created_at).toLocaleString('en-IN', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })
            return (
              <div key={order.id} className="glass-panel" style={{ borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.85rem', marginBottom: '0.85rem' }}>
                  <div>
                    <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 800, fontSize: '1.1rem', color: '#fff' }}>
                      {order.id}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '0.75rem' }}>
                      {dateStr}
                    </span>
                  </div>
                  <span
                    style={{
                      background: st.bg,
                      color: st.color,
                      border: `1px solid ${st.color}40`,
                      borderRadius: 'var(--radius-full)',
                      padding: '0.25rem 0.75rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}
                  >
                    {st.label}
                  </span>
                </div>

                {/* Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
                  {(order.items || []).map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                      <span>
                        <strong style={{ color: '#fff' }}>{item.quantity}x</strong> {item.product_name} ({item.size_label})
                      </span>
                      <span>₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>

                {/* Footer total + actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total: </span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--font-serif)' }}>
                      ₹{order.total}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginLeft: '0.5rem', textTransform: 'uppercase' }}>
                      ({order.payment_method})
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    {/* Reorder Button */}
                    <button
                      className="btn-ghost"
                      onClick={() => handleReorder(order)}
                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                    >
                       Reorder
                    </button>

                    {/* Track Button */}
                    <button
                      className="btn-primary"
                      onClick={() => navigate('/track', { state: { orderId: order.id } })}
                      style={{ padding: '0.4rem 0.95rem', fontSize: '0.8rem' }}
                    >
                      Track Order
                    </button>
                  </div>
                </div>

                {/* Rating component if delivered */}
                {order.status === 'delivered' && (
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.6rem', borderTop: '1px dashed var(--glass-border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {order.rating ? 'Your Rating:' : 'Rate this meal:'}
                    </span>
                    <div style={{ display: 'flex', gap: '0.2rem' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => !order.rating && handleRate(order.id, star)}
                          style={{
                            fontSize: '1.1rem',
                            color: (order.rating || 0) >= star ? 'var(--gold)' : '#57534e',
                            cursor: order.rating ? 'default' : 'pointer',
                            padding: '0 0.1rem',
                          }}
                          disabled={Boolean(order.rating)}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
