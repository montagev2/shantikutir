import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../context/StoreContext'
import { useAuth } from '../context/AuthContext'
import { submitOrder } from '../lib/api'
import { buildUpiDeepLink, buildQrUrl, DINING_MODE_LABELS } from '../lib/business'
import { sanitiseAddress, isValidPhone, sanitisePhone } from '../lib/security'
import { Toast, useToast } from '../components/Toast'

export default function Checkout() {
  const { cart, diningMode, tableNumber, deliveryAddress, deliveryLat, deliveryLng, cartTotal, cartSubtotal, cartDiscount, appliedCoupon, dispatch } = useStore()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { toast, showToast, hideToast } = useToast()

  const [customerName, setCustomerName] = useState(profile?.name ?? '')
  const [customerPhone, setCustomerPhone] = useState(profile?.phone ?? '')
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'cash'>('upi')
  const [utrNumber, setUtrNumber] = useState('')
  const [guestDeliveryAddress, setGuestDeliveryAddress] = useState(deliveryAddress)
  const [busy, setBusy] = useState(false)

  if (cart.length === 0) {
    navigate('/')
    return null
  }

  async function handlePlaceOrder() {
    if (!customerName.trim()) { showToast('Please enter your name', 'error'); return }
    const cleanPhone = sanitisePhone(customerPhone)
    if (!isValidPhone(cleanPhone)) { showToast('Enter a valid 10-digit mobile number', 'error'); return }
    if (diningMode === 'delivery') {
      const addr = sanitiseAddress(guestDeliveryAddress)
      if (!addr) { showToast('Please enter delivery address', 'error'); return }
    }
    setBusy(true)
    try {
      const id = await submitOrder({
        p_customer_id: profile?.id ?? null,
        p_customer_name: customerName.trim(),
        p_customer_phone: cleanPhone,
        p_dining_mode: diningMode,
        p_table_number: diningMode === 'dine_in' ? tableNumber || null : null,
        p_delivery_address: diningMode === 'delivery' ? sanitiseAddress(guestDeliveryAddress) : null,
        p_delivery_lat: deliveryLat,
        p_delivery_lng: deliveryLng,
        p_items: cart.map(item => ({
          product_id: item.product.id,
          product_name: item.product.name,
          size_label:
            item.size === 'a'
              ? item.product.label_a
              : item.size === 'b'
                ? (item.product.label_b ?? 'Regular')
                : (item.product.label_c ?? 'Large'),
          price:
            item.size === 'a'
              ? item.product.price_a
              : item.size === 'b'
                ? (item.product.price_b ?? item.product.price_a)
                : (item.product.price_c ?? item.product.price_a),
          quantity: item.quantity,
        })),
        p_subtotal: cartSubtotal,
        p_discount_amount: cartDiscount,
        p_total: cartTotal,
        p_payment_method: paymentMethod,
        p_coupon_code: appliedCoupon?.code ?? null,
      })
      void id // id is passed directly to navigate state below
      dispatch({ type: 'CLEAR_CART' })
      navigate('/order-success', { state: { orderId: id, paymentMethod, total: cartTotal } })
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Order failed. Try again.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', paddingBottom: '2rem' }}>
      {toast && <Toast key={toast.key} message={toast.message} type={toast.type} onClose={hideToast} />}

      <header style={{ background: 'var(--color-terracotta)', color: '#fff', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button onClick={() => navigate('/cart')} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.3rem', cursor: 'pointer' }}>&#8592;</button>
        <h2 style={{ margin: 0, fontFamily: 'Playfair Display, serif', fontSize: '1.3rem' }}>Checkout</h2>
      </header>

      <div style={{ padding: '1.25rem' }}>
        {/* Customer details */}
        <section style={{ background: '#fff', borderRadius: '0.75rem', padding: '1rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: '1rem' }}>
          <h3 style={{ margin: '0 0 0.75rem', fontFamily: 'Playfair Display, serif', color: 'var(--color-teak)' }}>Your Details</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input
              type="text"
              placeholder="Your name *"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              maxLength={60}
              style={inputStyle}
            />
            <input
              type="tel"
              placeholder="Mobile number *"
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
              maxLength={13}
              style={inputStyle}
            />
            {diningMode === 'delivery' && (
              <input
                type="text"
                placeholder="Delivery address *"
                value={guestDeliveryAddress}
                onChange={e => setGuestDeliveryAddress(e.target.value)}
                maxLength={200}
                style={inputStyle}
              />
            )}
          </div>
        </section>

        {/* Order mode summary */}
        <section style={{ background: '#fff3e0', borderRadius: '0.75rem', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.9rem', color: '#a8734e' }}>
          <strong>Mode:</strong> {DINING_MODE_LABELS[diningMode]}
          {diningMode === 'dine_in' && tableNumber && <> · Table {tableNumber}</>}
        </section>

        {/* Payment method */}
        <section style={{ background: '#fff', borderRadius: '0.75rem', padding: '1rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: '1rem' }}>
          <h3 style={{ margin: '0 0 0.75rem', fontFamily: 'Playfair Display, serif', color: 'var(--color-teak)' }}>Payment</h3>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {(['upi', 'cash'] as const).map(m => (
              <button
                key={m}
                onClick={() => setPaymentMethod(m)}
                style={{
                  flex: 1,
                  padding: '0.65rem',
                  border: `2px solid ${paymentMethod === m ? 'var(--color-terracotta)' : '#e7e5e4'}`,
                  borderRadius: '0.5rem',
                  background: paymentMethod === m ? '#fff3e0' : '#fff',
                  color: 'var(--color-teak)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  textTransform: 'uppercase',
                  fontSize: '0.85rem',
                }}
              >
                {m === 'upi' ? 'Pay via UPI' : 'Pay by Cash'}
              </button>
            ))}
          </div>

          {paymentMethod === 'upi' && (
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <p style={{ fontSize: '0.88rem', color: '#78716c', marginBottom: '0.5rem' }}>
                Scan QR or click button to pay Rs. {cartTotal}
              </p>
              <img src={buildQrUrl(buildUpiDeepLink(cartTotal, 'SK-ORDER'))} alt="UPI QR Code" style={{ width: '160px', height: '160px', borderRadius: '0.5rem' }} />
              <div style={{ marginTop: '0.75rem' }}>
                <a
                  href={buildUpiDeepLink(cartTotal, 'SK-ORDER')}
                  style={{ display: 'inline-block', background: '#5b21b6', color: '#fff', padding: '0.6rem 1.5rem', borderRadius: '0.4rem', fontSize: '0.9rem', fontWeight: 600, textDecoration: 'none' }}
                >
                  Open UPI App
                </a>
              </div>
              <input
                type="text"
                placeholder="Enter UTR / Transaction ID after payment"
                value={utrNumber}
                onChange={e => setUtrNumber(e.target.value.replace(/\D/g, '').slice(0, 22))}
                style={{ ...inputStyle, marginTop: '0.75rem' }}
              />
            </div>
          )}
        </section>

        {/* Total */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-teak)' }}>
          <span>Total</span>
          <span style={{ color: 'var(--color-terracotta)' }}>Rs. {cartTotal}</span>
        </div>

        <button
          onClick={handlePlaceOrder}
          disabled={busy}
          style={{ ...primaryBtnStyle, width: '100%', opacity: busy ? 0.6 : 1 }}
        >
          {busy ? 'Placing Order...' : 'Place Order'}
        </button>
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
  padding: '0.9rem',
  fontSize: '1rem',
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'Inter, sans-serif',
}
