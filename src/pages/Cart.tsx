import { useNavigate } from 'react-router-dom'
import { useStore } from '../context/StoreContext'
import { DINING_MODE_LABELS, MIN_ORDER_AMOUNT } from '../lib/business'

export default function Cart() {
  const { cart, dispatch, diningMode, tableNumber, deliveryAddress, cartSubtotal, cartDiscount, cartTotal, appliedCoupon } = useStore()
  const navigate = useNavigate()

  if (cart.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
        <p style={{ color: '#78716c', fontSize: '1.1rem' }}>Your cart is empty</p>
        <button onClick={() => navigate('/')} style={primaryBtnStyle}>Browse Menu</button>
      </div>
    )
  }

  const canCheckout = cartTotal >= MIN_ORDER_AMOUNT

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', paddingBottom: '5rem' }}>
      <header style={{ background: 'var(--color-terracotta)', color: '#fff', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.3rem', cursor: 'pointer' }}>&#8592;</button>
        <h2 style={{ margin: 0, fontFamily: 'Playfair Display, serif', fontSize: '1.3rem' }}>Your Cart</h2>
      </header>

      <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {cart.map(item => {
          const price =
            item.size === 'a'
              ? item.product.price_a
              : item.size === 'b'
                ? (item.product.price_b ?? item.product.price_a)
                : (item.product.price_c ?? item.product.price_a)
          const sizeLabel =
            item.size === 'a'
              ? item.product.label_a
              : item.size === 'b'
                ? item.product.label_b
                : item.product.label_c
          return (
            <div key={`${item.product.id}-${item.size}`} style={{ background: '#fff', borderRadius: '0.75rem', padding: '0.9rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--color-teak)', fontFamily: 'Playfair Display, serif' }}>{item.product.name}</div>
                <div style={{ fontSize: '0.82rem', color: '#78716c' }}>{sizeLabel} · Rs. {price} each</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button onClick={() => {
                  if (item.quantity <= 1) dispatch({ type: 'REMOVE_FROM_CART', productId: item.product.id, size: item.size })
                  else dispatch({ type: 'UPDATE_QTY', productId: item.product.id, size: item.size, qty: item.quantity - 1 })
                }} style={qtyBtnStyle}>-</button>
                <span style={{ fontWeight: 700, minWidth: '1.2rem', textAlign: 'center' }}>{item.quantity}</span>
                <button onClick={() => dispatch({ type: 'ADD_TO_CART', item: { ...item, quantity: 1 } })} style={qtyBtnStyle}>+</button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Order type info */}
      <div style={{ margin: '0 1.25rem', background: '#fff3e0', borderRadius: '0.75rem', padding: '0.75rem 1rem', fontSize: '0.88rem', color: '#a8734e' }}>
        <strong>Mode:</strong> {DINING_MODE_LABELS[diningMode]}
        {diningMode === 'dine_in' && tableNumber && <> · Table {tableNumber}</>}
        {diningMode === 'delivery' && deliveryAddress && <> · {deliveryAddress}</>}
      </div>

      {/* Bill summary */}
      <div style={{ margin: '1rem 1.25rem', background: '#fff', borderRadius: '0.75rem', padding: '1rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontFamily: 'Playfair Display, serif', color: 'var(--color-teak)' }}>Bill Summary</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.95rem', color: '#78716c' }}>
          <Row label="Subtotal" value={`Rs. ${cartSubtotal}`} />
          {cartDiscount > 0 && <Row label={`Coupon (${appliedCoupon?.code})`} value={`-Rs. ${cartDiscount}`} valueColor="#65a30d" />}
          <hr style={{ border: 'none', borderTop: '1px solid #e7e5e4', margin: '0.25rem 0' }} />
          <Row label="Total" value={`Rs. ${cartTotal}`} bold />
        </div>
      </div>

      {!canCheckout && (
        <p style={{ textAlign: 'center', color: '#c2410c', fontSize: '0.88rem', margin: '0 1.25rem' }}>
          Minimum order is Rs. {MIN_ORDER_AMOUNT}
        </p>
      )}

      <div style={{ padding: '0 1.25rem', marginTop: '0.5rem' }}>
        <button
          onClick={() => navigate('/checkout')}
          disabled={!canCheckout}
          style={{ ...primaryBtnStyle, opacity: canCheckout ? 1 : 0.5, width: '100%' }}
        >
          Proceed to Checkout
        </button>
      </div>
    </div>
  )
}

function Row({ label, value, bold = false, valueColor }: { label: string; value: string; bold?: boolean; valueColor?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ fontWeight: bold ? 700 : 400, color: bold ? 'var(--color-teak)' : undefined }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 400, color: valueColor ?? (bold ? 'var(--color-terracotta)' : undefined) }}>{value}</span>
    </div>
  )
}

const primaryBtnStyle: React.CSSProperties = {
  background: 'var(--color-terracotta)',
  color: '#fff',
  border: 'none',
  borderRadius: '0.5rem',
  padding: '0.85rem 1.5rem',
  fontSize: '1rem',
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'Inter, sans-serif',
  textAlign: 'center',
}

const qtyBtnStyle: React.CSSProperties = {
  background: 'var(--color-terracotta)',
  color: '#fff',
  border: 'none',
  borderRadius: '50%',
  width: '1.6rem',
  height: '1.6rem',
  fontSize: '1rem',
  fontWeight: 700,
  cursor: 'pointer',
}
