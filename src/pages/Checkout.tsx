import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../context/StoreContext'
import { useAuth } from '../context/AuthContext'
import { submitOrder } from '../lib/api'
import {
  buildUpiDeepLink,
  buildQrUrl,
  DINING_MODE_LABELS,
  STORE_NAME,
  PORTION_LABELS,
} from '../lib/business'
import { sanitiseAddress, isValidPhone, sanitisePhone } from '../lib/security'
import { Toast, useToast } from '../components/Toast'

export default function Checkout() {
  const {
    cart,
    diningMode,
    tableNumber,
    deliveryAddress,
    deliveryLat,
    deliveryLng,
    cartTotal,
    cartSubtotal,
    cartDiscount,
    appliedCoupon,
    dispatch,
    menu,
    priceFor,
  } = useStore()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { toast, showToast, hideToast } = useToast()

  const [customerName, setCustomerName] = useState(profile?.name ?? '')
  const [customerPhone, setCustomerPhone] = useState(profile?.phone ?? '')
  const [table, setTable] = useState(tableNumber || '')
  const [address, setAddress] = useState(deliveryAddress || '')
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'cash'>('upi')
  const [utrNumber, setUtrNumber] = useState('')
  const [busy, setBusy] = useState(false)

  if (cart.length === 0) {
    navigate('/')
    return null
  }

  // Dynamic UPI Link for Shanti Kutir
  const upiLink = buildUpiDeepLink(cartTotal, 'SK-ORDER', 'Shanti Kutir Order')
  const qrUrl = buildQrUrl(upiLink, 220)

  async function handlePlaceOrder() {
    if (!customerName.trim()) {
      showToast('Please enter your full name', 'error')
      return
    }
    const cleanPhone = sanitisePhone(customerPhone)
    if (!isValidPhone(cleanPhone)) {
      showToast('Enter a valid 10-digit mobile number', 'error')
      return
    }
    if (diningMode === 'dine_in' && !table.trim()) {
      showToast('Please enter your table number', 'error')
      return
    }
    if (diningMode === 'delivery' && !address.trim()) {
      showToast('Please provide your complete delivery address', 'error')
      return
    }

    setBusy(true)
    try {
      const orderId = await submitOrder({
        p_customer_id: profile?.id ?? null,
        p_customer_name: customerName.trim(),
        p_customer_phone: cleanPhone,
        p_dining_mode: diningMode,
        p_table_number: diningMode === 'dine_in' ? table.trim() : null,
        p_delivery_address: diningMode === 'delivery' ? sanitiseAddress(address) : null,
        p_delivery_lat: deliveryLat,
        p_delivery_lng: deliveryLng,
        p_items: cart.map((item) => {
          const prodId = item.productId || item.product?.id || ''
          const prod = menu.find((m) => m.id === prodId) || item.product
          const portionKey = ((item.portion || item.size || 'b').toUpperCase()) as 'A' | 'B' | 'C'
          const portionLabel = PORTION_LABELS[portionKey]?.en || portionKey
          const price = prod ? priceFor(prod, portionKey) : 0
          const qty = item.qty || item.quantity || 1
          return {
            product_id: prodId,
            product_name: prod ? prod.name : 'Food Item',
            size_label: portionLabel,
            price,
            quantity: qty,
          }
        }),
        p_subtotal: cartSubtotal,
        p_discount_amount: cartDiscount,
        p_total: cartTotal,
        p_payment_method: paymentMethod,
        p_coupon_code: appliedCoupon?.code ?? null,
      })

      // Update stored table/address if changed
      if (table) dispatch({ type: 'SET_TABLE', table })
      if (address) dispatch({ type: 'SET_DELIVERY_ADDRESS', address, lat: deliveryLat, lng: deliveryLng })

      dispatch({ type: 'CLEAR_CART' })
      navigate('/order-success', {
        state: { orderId, paymentMethod, total: cartTotal },
      })
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not place order', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="site-container animate-fade-in" style={{ paddingTop: '2rem', maxWidth: '720px' }}>
      {toast && <Toast key={toast.key} message={toast.message} type={toast.type} onClose={hideToast} />}

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.75rem' }}>
        <button
          onClick={() => navigate('/cart')}
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-sm)',
            width: '38px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '1.1rem',
          }}
        >
          ←
        </button>
        <div>
          <h1 style={{ fontSize: '1.65rem', color: '#fff', margin: 0 }}>Checkout</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.15rem 0 0' }}>
            Finalize contact details and select payment method
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* ── 1. Contact Information ── */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-md)', padding: '1.35rem' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--gold)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span></span>
            <span>Your Contact Details</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                Full Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Debajyoti Mondal"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                maxLength={60}
                style={{ width: '100%', padding: '0.65rem 0.9rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                Mobile Number *
              </label>
              <input
                type="tel"
                placeholder="10-digit mobile number"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                maxLength={13}
                style={{ width: '100%', padding: '0.65rem 0.9rem' }}
              />
            </div>
          </div>
        </div>

        {/* ── 2. Dining Location & Mode ── */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-md)', padding: '1.35rem' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--gold)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span></span>
            <span>Dining & Delivery Location ({DINING_MODE_LABELS[diningMode]})</span>
          </h3>

          {diningMode === 'dine_in' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                Table Number (Required for table delivery) *
              </label>
              <input
                type="text"
                placeholder="e.g. Table 4 or Cabana 2"
                value={table}
                onChange={(e) => setTable(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.9rem' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: '0.3rem', display: 'block' }}>
                Waiters at {STORE_NAME} will bring your order directly to this table.
              </span>
            </div>
          )}

          {diningMode === 'takeaway' && (
            <div style={{ padding: '0.75rem 1rem', background: 'rgba(223, 177, 91, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(223, 177, 91, 0.2)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
               <strong>Highway Counter Curbside Pickup:</strong> Your order will be packed hot in tamper-proof containers. Please collect from the main highway pickup window when your order is marked Ready.
            </div>
          )}

          {diningMode === 'delivery' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                Complete Delivery Address *
              </label>
              <textarea
                rows={3}
                placeholder="House / Flat No, Landmark, Village / Area near NH-116..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.9rem', resize: 'vertical' }}
              />
            </div>
          )}
        </div>

        {/* ── 3. Payment Method & UPI QR ── */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-md)', padding: '1.35rem' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--gold)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span></span>
            <span>Payment Options</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <button
              onClick={() => setPaymentMethod('upi')}
              style={{
                padding: '0.85rem',
                borderRadius: 'var(--radius-md)',
                border: `2px solid ${paymentMethod === 'upi' ? 'var(--gold)' : 'var(--glass-border)'}`,
                background: paymentMethod === 'upi' ? 'rgba(223, 177, 91, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                color: paymentMethod === 'upi' ? '#fff' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.9rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <span style={{ fontSize: '1.3rem' }}>⚡</span>
              <span>UPI Instant Pay</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--gold)' }}>GPay · PhonePe · Paytm</span>
            </button>

            <button
              onClick={() => setPaymentMethod('cash')}
              style={{
                padding: '0.85rem',
                borderRadius: 'var(--radius-md)',
                border: `2px solid ${paymentMethod === 'cash' ? 'var(--gold)' : 'var(--glass-border)'}`,
                background: paymentMethod === 'cash' ? 'rgba(223, 177, 91, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                color: paymentMethod === 'cash' ? '#fff' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.9rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <span style={{ fontSize: '1.3rem' }}></span>
              <span>Cash at Counter</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Pay on Delivery/Handover</span>
            </button>
          </div>

          {/* UPI Live QR & Deep Link */}
          {paymentMethod === 'upi' && (
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                Scan with any UPI App or click the direct payment button below
              </p>

              {/* Dynamic QR */}
              <div
                style={{
                  display: 'inline-block',
                  padding: '10px',
                  background: '#fff',
                  borderRadius: '12px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  marginBottom: '1rem',
                }}
              >
                <img
                  src={qrUrl}
                  alt="UPI QR Code"
                  style={{ width: '180px', height: '180px', display: 'block' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <a
                  href={upiLink}
                  className="btn-gold"
                  style={{
                    display: 'inline-flex',
                    padding: '0.7rem 1.8rem',
                    fontSize: '0.95rem',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                   Open Installed UPI App (₹{cartTotal})
                </a>
              </div>

              <div style={{ maxWidth: '380px', margin: '0 auto' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                  Transaction / UTR Number (Optional, from UPI app):
                </label>
                <input
                  type="text"
                  placeholder="e.g. 432109876543 (12 digits)"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value.replace(/\D/g, '').slice(0, 22))}
                  style={{ width: '100%', padding: '0.55rem 0.85rem', textAlign: 'center', fontSize: '0.88rem' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── 4. Order Total & Place Order Button ── */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-md)', padding: '1.35rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Amount Payable</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--font-serif)' }}>
                ₹{cartTotal}
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <div>{cart.reduce((s, i) => s + i.quantity, 0)} Items Selected</div>
              <div style={{ color: 'var(--emerald)', fontWeight: 600 }}>Zero Platform Fee</div>
            </div>
          </div>

          <button
            className="btn-primary"
            onClick={handlePlaceOrder}
            disabled={busy}
            style={{
              width: '100%',
              padding: '0.95rem',
              fontSize: '1.05rem',
              borderRadius: 'var(--radius-md)',
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? 'Placing Your Order...' : `Confirm & Place Order (₹${cartTotal}) →`}
          </button>
        </div>
      </div>
    </div>
  )
}
