import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useStore } from '../context/StoreContext'
import { MIN_ORDER_AMOUNT, PORTION_LABELS, SUPPORT_WHATSAPP, STORE_NAME } from '../lib/business'

export default function Cart() {
  const { user } = useAuth()
  const { cart, menu, cartTotal, updateCartQty, removeFromCart, priceFor, lang } = useStore()

  if (cart.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4.5rem 1rem 3.5rem', color: '#a1a1aa' }}>
        <div
          style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 1.25rem',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(245, 158, 11, 0.16) 0%, rgba(245, 158, 11, 0.03) 70%, transparent 100%)',
            border: '1.5px solid rgba(245, 158, 11, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 30px rgba(245, 158, 11, 0.12)',
          }}
        >
          <svg
            width="38"
            height="38"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
            <path d="M3 6h18" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
        </div>
        <h2 style={{ color: '#fafaf9', margin: '0 0 0.5rem', fontSize: '1.4rem', fontWeight: 800 }}>
          {lang === 'bn' ? 'আপনার কার্ট খালি' : 'Your order is empty'}
        </h2>
        <p style={{ margin: '0 0 1.5rem', fontSize: '0.9rem', color: '#a1a1aa' }}>
          {lang === 'bn' ? 'মেনু থেকে সুস্বাদু খাবার বেছে নিন।' : 'Browse our authentic menu and add delicious food to your order.'}
        </p>
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#f59e0b',
            color: '#18181b',
            padding: '0.75rem 1.5rem',
            borderRadius: '10px',
            textDecoration: 'none',
            fontWeight: 800,
            boxShadow: '0 4px 14px rgba(245, 158, 11, 0.25)',
          }}
        >
          {lang === 'bn' ? 'মেনু দেখুন ->' : 'Explore Menu ->'}
        </Link>
      </div>
    )
  }

  const isMinMet = cartTotal >= MIN_ORDER_AMOUNT
  const shortfall = Math.max(0, MIN_ORDER_AMOUNT - cartTotal)
  const minProgress = Math.min(100, Math.round((cartTotal / MIN_ORDER_AMOUNT) * 100))

  const handleWhatsAppOrder = () => {
    const lines = cart.map((c) => {
      const prodId = c.productId || c.product?.id || ''
      const p = menu.find((m) => m.id === prodId) || c.product
      const name = p ? p.name : 'Food Item'
      const portionKey = ((c.portion || c.size || 'b').toUpperCase()) as 'A' | 'B' | 'C'
      const portion = PORTION_LABELS[portionKey]?.en || portionKey
      const qty = c.qty ?? c.quantity ?? 1
      const price = p ? priceFor(p, portionKey) * qty : 0
      return `- ${name} (${portion}) x ${qty} = Rs.${price}`
    })

    const text = encodeURIComponent(
      `${STORE_NAME} - Food Order Inquiry:\n\n${lines.join('\n')}\n\nTotal: Rs.${cartTotal}\n\nPlease confirm availability!`
    )
    window.open(`https://wa.me/${SUPPORT_WHATSAPP}?text=${text}`, '_blank')
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', paddingBottom: '5.5rem' }}>
      <h1 style={{ fontSize: '1.4rem', color: '#fafaf9', marginBottom: '0.85rem' }}>
        {lang === 'bn' ? 'আপনার অর্ডার কার্ট' : 'Your Food Order'} ({cart.length} items)
      </h1>

      {/* Free Delivery & Minimum Order Progress Badge */}
      <div
        style={{
          background: isMinMet ? 'rgba(34, 197, 94, 0.12)' : 'rgba(245, 158, 11, 0.12)',
          border: `1.5px solid ${isMinMet ? 'rgba(34, 197, 94, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
          borderRadius: '14px',
          padding: '0.85rem 1rem',
          marginBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.4rem' }}>
          <strong style={{ fontSize: '0.86rem', color: isMinMet ? '#4ade80' : '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>
              {isMinMet
                ? (lang === 'bn' ? `ফ্রি হোম ডেলিভারি যোগ্য (Rs.${MIN_ORDER_AMOUNT}+ অর্ডার)` : `Free Home Delivery Unlocked (Orders Rs.${MIN_ORDER_AMOUNT}+)`)
                : (lang === 'bn' ? `ডেলিভারির জন্য আরও Rs.${shortfall} যোগ করুন` : `Add Rs.${shortfall} more for Free Delivery`)}
            </span>
          </strong>
          <span style={{ fontSize: '0.74rem', color: '#a1a1aa', fontWeight: 700 }}>
            Rs.{cartTotal} / Rs.{MIN_ORDER_AMOUNT}
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ height: '6px', background: '#27272a', borderRadius: '9999px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${minProgress}%`,
              background: isMinMet ? 'linear-gradient(90deg, #22c55e, #10b981)' : 'linear-gradient(90deg, #f59e0b, #d97706)',
              borderRadius: '9999px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Cart Items List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {cart.map((c) => {
          const prodId = c.productId || c.product?.id || ''
          const item = menu.find((m) => m.id === prodId) || c.product
          if (!item) return null
          const portionKey = ((c.portion || c.size || 'b').toUpperCase()) as 'A' | 'B' | 'C'
          const portionLabel = PORTION_LABELS[portionKey]?.en || portionKey
          const qty = c.qty ?? c.quantity ?? 1
          const unitPrice = priceFor(item, portionKey)
          const totalItemPrice = unitPrice * qty

          return (
            <div
              key={`${prodId}-${portionKey}`}
              style={{
                background: '#221f1c',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '160px', flex: 1 }}>
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                    onError={(e) => {
                      const target = e.currentTarget
                      if (!target.dataset.hasFallback) {
                        target.dataset.hasFallback = 'true'
                        target.src = '/dishes/chicken-dum-biryani.jpg'
                      } else {
                        target.style.display = 'none'
                      }
                    }}
                  />
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '18px',
                      height: '18px',
                      border: `2px solid ${item.isVeg ? '#22c55e' : '#ef4444'}`,
                      borderRadius: '3px',
                      padding: '2px',
                      flexShrink: 0,
                    }}
                    title={item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                  >
                    <span
                      style={{
                        display: 'block',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: item.isVeg ? '#22c55e' : '#ef4444',
                      }}
                    />
                  </span>
                )}
                <div>
                  <strong style={{ color: '#fafaf9', fontSize: '0.95rem', display: 'block' }}>
                    {lang === 'bn' ? item.bnName || item.name_bn || item.name : item.name}
                  </strong>
                  <span style={{ color: '#f59e0b', fontSize: '0.78rem', fontWeight: 600 }}>
                    {portionLabel} · Rs.{unitPrice}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginLeft: 'auto' }}>
                {/* Stepper */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#181614', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '2px 4px' }}>
                  <button
                    type="button"
                    onClick={() => updateCartQty(prodId, portionKey, qty - 1)}
                    aria-label="Decrease quantity"
                    style={{ background: 'transparent', border: 'none', color: '#f59e0b', fontSize: '1.2rem', fontWeight: 800, cursor: 'pointer', width: '32px', height: '32px', minWidth: '32px', display: 'grid', placeItems: 'center', touchAction: 'manipulation' }}
                  >
                    -
                  </button>
                  <span style={{ fontWeight: 800, color: '#fafaf9', fontSize: '0.88rem', minWidth: '20px', textAlign: 'center' }}>{qty}</span>
                  <button
                    type="button"
                    onClick={() => updateCartQty(prodId, portionKey, qty + 1)}
                    aria-label="Increase quantity"
                    style={{ background: 'transparent', border: 'none', color: '#f59e0b', fontSize: '1.2rem', fontWeight: 800, cursor: 'pointer', width: '32px', height: '32px', minWidth: '32px', display: 'grid', placeItems: 'center', touchAction: 'manipulation' }}
                  >
                    +
                  </button>
                </div>

                <strong style={{ color: '#fafaf9', fontSize: '0.95rem', minWidth: '55px', textAlign: 'right' }}>
                  Rs.{totalItemPrice}
                </strong>

                <button
                  type="button"
                  onClick={() => removeFromCart(prodId, portionKey)}
                  aria-label="Remove item"
                  style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '1.1rem', cursor: 'pointer', width: '32px', height: '32px', display: 'grid', placeItems: 'center', touchAction: 'manipulation' }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Bill Summary */}
      <div style={{ background: '#221f1c', border: '1.5px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '1.25rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#d6d3d1', fontSize: '0.9rem' }}>
          <span>Food Subtotal</span>
          <strong style={{ color: '#fafaf9' }}>Rs.{cartTotal}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#d6d3d1', fontSize: '0.9rem' }}>
          <span>Doorstep Delivery</span>
          <strong style={{ color: '#4ade80' }}>Rs.0 FREE</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.75rem', marginTop: '0.5rem', fontSize: '1.1rem' }}>
          <strong style={{ color: '#fafaf9' }}>Total Bill</strong>
          <strong style={{ color: '#f59e0b' }}>Rs.{cartTotal}</strong>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {isMinMet ? (
          <>
            <Link
              to={user ? "/checkout" : "/auth?redirect=/checkout&mode=register"}
              style={{
                display: 'block',
                textAlign: 'center',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#18181b',
                padding: '0.85rem',
                borderRadius: '10px',
                textDecoration: 'none',
                fontWeight: 800,
                fontSize: '1rem',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)',
              }}
            >
              {lang === 'bn'
                ? (user ? 'চেকআউট করুন (ফ্রি ডেলিভারি) ->' : 'অ্যাকাউন্ট তৈরি করুন ও অর্ডার করুন ->')
                : (user ? 'Proceed to Checkout (FREE Delivery) ->' : 'Sign Up & Place Order ->')}
            </Link>
            {!user && (
              <span style={{ textAlign: 'center', fontSize: '0.75rem', color: '#a1a1aa' }}>
                Quick sign up in seconds - your cart items will be saved!
              </span>
            )}
          </>
        ) : (
          <Link
            to="/"
            style={{
              display: 'block',
              textAlign: 'center',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1.5px dashed #f59e0b',
              color: '#fbbf24',
              padding: '0.85rem',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: 800,
              fontSize: '0.92rem',
            }}
          >
            {lang === 'bn'
              ? `আরও Rs.${shortfall} যোগ করে চেকআউট করুন ->`
              : `Add Rs.${shortfall} more to checkout (Min Rs.${MIN_ORDER_AMOUNT}) ->`}
          </Link>
        )}

        <button
          type="button"
          onClick={handleWhatsAppOrder}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            background: '#14532d',
            border: '1px solid #22c55e',
            color: '#86efac',
            padding: '0.75rem',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            touchAction: 'manipulation',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.23 8.23 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.63c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.03-1.25-.75-.67-1.26-1.5-1.41-1.75-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.34-.76-1.84-.2-.49-.4-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.78 2.71 4.3 3.8.6.26 1.07.41 1.44.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.17-.48-.29" />
          </svg>
          <span>Order via WhatsApp Direct</span>
        </button>
      </div>
    </div>
  )
}
