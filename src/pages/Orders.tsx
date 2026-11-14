import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../context/StoreContext'
import { useAuth } from '../context/AuthContext'
import {
  formatOrderId,
  getOrderToken,
  GOOGLE_MAPS_REVIEW_URL,
  getOrderStatusDetails,
  getFulfillmentDetails,
  getOrderDeliveryOtp,
  isOrderOtpRequired,
} from '../lib/business'
import { printOrderInvoice } from '../lib/printOrder'
import { safeGetJSON } from '../lib/storage'

const QUICK_TAGS = ['Delicious Biryani', 'Crispy Kebabs', 'Hot & Fresh', 'Fast Service', 'Polite Staff']

const TIMELINE_STEPS = ['Pending', 'Confirmed', 'Cooking', 'Ready', 'Served'] as const
const TIMELINE_STATUS_INDEX: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  cooking: 2,
  ready: 3,
  delivered: 4,
}

function StatusTimeline({ status }: { status: string }) {
  const activeIdx = TIMELINE_STATUS_INDEX[status] ?? 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, margin: '0.75rem 0 0.6rem', padding: '0 0.1rem' }}>
      {TIMELINE_STEPS.map((step, idx) => {
        const done = idx < activeIdx
        const current = idx === activeIdx
        const color = current ? '#dfb15b' : done ? '#22c55e' : '#3f3f46'
        const textColor = current ? '#dfb15b' : done ? '#22c55e' : '#71717a'
        return (
          <div key={step} style={{ display: 'flex', alignItems: 'center', flex: idx < TIMELINE_STEPS.length - 1 ? '1 1 0' : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: 0 }}>
              <div style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                border: `2px solid ${color}`,
                background: done ? '#22c55e' : current ? '#dfb15b' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {done && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <polyline points="2,6 5,9 10,3" stroke="#18181b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span style={{ fontSize: '0.6rem', fontWeight: current ? 800 : 600, color: textColor, whiteSpace: 'nowrap', letterSpacing: '0.01em' }}>
                {step}
              </span>
            </div>
            {idx < TIMELINE_STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? '#22c55e' : '#27272a', margin: '0 2px', marginBottom: '14px', transition: 'background 0.3s' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function PendingBanner() {
  return (
    <>
      <style>{`
        @keyframes tfg-pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(0.72); }
        }
        .tfg-pulse-dot {
          animation: tfg-pulse-dot 1.5s ease-in-out infinite;
        }
      `}</style>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        background: 'rgba(223, 177, 91,0.08)',
        border: '1px solid rgba(223, 177, 91,0.28)',
        borderRadius: '10px',
        padding: '0.5rem 0.75rem',
        marginBottom: '0.6rem',
      }}>
        <span
          className="tfg-pulse-dot"
          style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#dfb15b',
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: '0.78rem', color: '#fdf3d6', fontWeight: 600, lineHeight: 1.4 }}>
          Waiting for kitchen approval &mdash; usually within 2 minutes
        </span>
      </div>
    </>
  )
}

function OtpChip({ otp, orderId, balance, revealedOtpId, setRevealedOtpId }: {
  otp: string
  orderId: string
  balance: number
  revealedOtpId: string | null
  setRevealedOtpId: (id: string | null) => void
}) {
  const revealed = revealedOtpId === orderId
  return (
    <div style={{
      display: 'inline-flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '0.45rem',
      background: 'rgba(99,102,241,0.1)',
      border: '1px solid rgba(99,102,241,0.35)',
      borderRadius: '10px',
      padding: '0.35rem 0.65rem',
      marginBottom: '0.6rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span style={{ fontSize: '0.72rem', color: '#a5b4fc', fontWeight: 700, letterSpacing: '0.03em' }}>Handover Code</span>
        <span style={{ fontSize: '0.85rem', color: '#e0e7ff', fontWeight: 900, letterSpacing: '0.15em', fontVariantNumeric: 'tabular-nums', minWidth: '2.5rem', textAlign: 'center' }}>
          {revealed ? otp : '\u2022\u2022\u2022\u2022'}
        </span>
        <button
          type="button"
          onClick={() => setRevealedOtpId(revealed ? null : orderId)}
          style={{
            background: 'rgba(99,102,241,0.18)',
            border: '1px solid rgba(99,102,241,0.4)',
            color: '#a5b4fc',
            borderRadius: '6px',
            padding: '2px 8px',
            fontSize: '0.68rem',
            fontWeight: 800,
            cursor: 'pointer',
            letterSpacing: '0.04em',
            minHeight: 24,
          }}
        >
          {revealed ? 'Hide' : 'Reveal'}
        </button>
      </div>
      {balance > 0 && (
        <span style={{ fontSize: '0.72rem', color: '#f3d085', fontWeight: 800 }}>
          · Pay balance ₹{balance} to rider
        </span>
      )}
    </div>
  )
}

function DestinationPill({ orderType, tableNo, address }: {
  orderType: string
  tableNo?: string | null
  address?: string | null
}) {
  let label: string
  let color: string
  let bg: string

  if (orderType === 'dine_in') {
    label = tableNo ? `Table ${tableNo}` : 'AC Hall / Cottage'
    color = '#34d399'
    bg = 'rgba(52,211,153,0.1)'
  } else if (orderType === 'takeaway') {
    label = 'Counter Pickup \u00b7 NH-116B'
    color = '#60a5fa'
    bg = 'rgba(96,165,250,0.1)'
  } else {
    const raw = address || 'Delivery Address'
    label = raw.length > 28 ? raw.slice(0, 28) + '\u2026' : raw
    color = '#f472b6'
    bg = 'rgba(244,114,182,0.1)'
  }

  return (
    <span style={{
      display: 'inline-block',
      background: bg,
      border: `1px solid ${color}44`,
      color: color,
      borderRadius: '8px',
      padding: '1px 8px',
      fontSize: '0.7rem',
      fontWeight: 700,
      letterSpacing: '0.02em',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

export default function Orders() {
  const { orders, reorder, cancelOrder, rateOrder, lang } = useStore()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [ratingModalOrderId, setRatingModalOrderId] = useState<string | null>(null)
  const [selectedStars, setSelectedStars] = useState(5)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [reviewNote, setReviewNote] = useState('')
  const [submittingRating, setSubmittingRating] = useState(false)
  const [revealedOtpId, setRevealedOtpId] = useState<string | null>(null)

  // Filter strictly by current user or guest session
  const myOrders = useMemo(() => {
    if (user) {
      return orders.filter((o) => o.phone === user.phone || o.userId === user.id)
    }
    const guestIds = safeGetJSON<string[]>('sk_guest_orders', [])
    return orders.filter((o) => guestIds.includes(o.id))
  }, [orders, user])

  const handleReorder = (o: any) => {
    reorder(o)
    navigate('/cart')
  }

  const handleCancel = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) return
    await cancelOrder(orderId)
  }

  const openRatingModal = (orderId: string, currentRating?: number) => {
    setRatingModalOrderId(orderId)
    setSelectedStars(currentRating || 5)
    setSelectedTags([])
    setReviewNote('')
  }

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const handleSaveRating = async () => {
    if (!ratingModalOrderId) return
    setSubmittingRating(true)
    await rateOrder(ratingModalOrderId, selectedStars, reviewNote, selectedTags)
    setSubmittingRating(false)
    setRatingModalOrderId(null)
  }

  const showOtpForStatuses = new Set(['confirmed', 'cooking', 'ready'])

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', paddingBottom: '3rem', color: '#fafaf9' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.4rem', color: '#fafaf9', margin: 0, fontWeight: 900 }}>
          My Orders ({myOrders.length})
        </h1>
        <Link to="/track" style={{ background: '#1c1917', border: '1px solid #3f3f46', color: '#dfb15b', padding: '0.4rem 0.85rem', borderRadius: '8px', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          Track Live &rarr;
        </Link>
      </div>

      {myOrders.length === 0 ? (
        <div className="empty-state tfg-glass" style={{ textAlign: 'center', padding: '3rem 1rem', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          </div>
          <p style={{ color: '#a1a1aa', marginBottom: '1rem' }}>No orders yet! Try our Charcoal Kebabs or Kolkata Dum Biryani.</p>
          <Link to="/" style={{ background: '#dfb15b', color: '#18181b', padding: '0.6rem 1.2rem', borderRadius: '10px', textDecoration: 'none', fontWeight: 900, fontSize: '0.9rem' }}>
            Browse Menu &rarr;
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {myOrders.map((o) => {
            const statusInfo = getOrderStatusDetails(o.status)
            const fulfillment = getFulfillmentDetails(o.orderType || 'dine_in')
            const isActive = ['pending', 'confirmed', 'cooking', 'ready'].includes(o.status)
            const canCancel = o.status === 'pending'
            const isDelivered = o.status === 'delivered'
            const showTimeline = !['cancelled', 'delivered'].includes(o.status) && isActive
            const showOtp = showOtpForStatuses.has(o.status) && !!user && isOrderOtpRequired(o)
            const otp = showOtp ? getOrderDeliveryOtp(o) : ''

            return (
              <div key={o.id} className="tfg-glass-card" style={{ border: `1px solid ${isActive ? statusInfo.color + '44' : 'rgba(255,255,255,0.08)'}`, borderRadius: '16px', padding: '1rem', boxShadow: isActive ? `0 0 16px ${statusInfo.color}15` : 'none' }}>

                {/* Order Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 900, background: 'rgba(223, 177, 91, 0.1)', padding: '2px 7px', borderRadius: '4px', border: '1px solid rgba(223, 177, 91, 0.3)' }}>
                        Token {getOrderToken(o.id)}
                      </span>
                      <strong style={{ fontSize: '0.95rem', color: '#fafaf9' }}>#{formatOrderId(o.id)}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>
                        {new Date(o.createdAt || o.created_at || Date.now()).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
                        {' \u00b7 '}
                        {fulfillment.shortLabel[lang || 'en']}
                      </span>
                      <DestinationPill orderType={o.orderType || 'dine_in'} tableNo={o.tableNo || o.table_number || ''} address={o.address || o.delivery_address || ''} />
                    </div>
                  </div>
                  <span style={{ background: statusInfo.bgColor, color: statusInfo.color, border: `1px solid ${statusInfo.color}44`, borderRadius: '12px', padding: '3px 10px', fontSize: '0.72rem', fontWeight: 900, whiteSpace: 'nowrap' }}>
                    {statusInfo.label[lang || 'en']}
                  </span>
                </div>

                {/* Status Timeline */}
                {showTimeline && <StatusTimeline status={o.status} />}

                {/* Pending Banner */}
                {o.status === 'pending' && <PendingBanner />}

                {/* OTP Chip (customer-only, prepaid) or Cash on Delivery / Verified Notice */}
                {showOtp ? (
                  <OtpChip
                    otp={otp}
                    orderId={o.id}
                    balance={Math.max(0, o.total - (o.advanceAmount || 0))}
                    revealedOtpId={revealedOtpId}
                    setRevealedOtpId={setRevealedOtpId}
                  />
                ) : isDelivered && isOrderOtpRequired(o) ? (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    background: 'rgba(34,197,94,0.08)',
                    border: '1px solid rgba(34,197,94,0.3)',
                    borderRadius: '10px',
                    padding: '0.3rem 0.65rem',
                    marginBottom: '0.6rem',
                  }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                    <span style={{ fontSize: '0.74rem', color: '#86efac', fontWeight: 800 }}>OTP Verified · Handed Over</span>
                  </div>
                ) : o.orderType === 'delivery' && !isDelivered && o.status !== 'cancelled' ? (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    background: 'rgba(34,197,94,0.08)',
                    border: '1px solid rgba(34,197,94,0.3)',
                    borderRadius: '10px',
                    padding: '0.3rem 0.6rem',
                    marginBottom: '0.6rem',
                  }}>
                    <span style={{ fontSize: '0.72rem', color: '#86efac', fontWeight: 700 }}>Cash on Delivery:</span>
                    <span style={{ fontSize: '0.78rem', color: '#f4f4f5', fontWeight: 800 }}>Pay ₹{o.total} cash to rider (No OTP needed)</span>
                  </div>
                ) : null}

                {/* Items Breakdown */}
                <div style={{ background: '#0d0d0f', borderRadius: '10px', padding: '0.6rem 0.8rem', margin: '0.5rem 0' }}>
                  {o.items.map((it) => (
                    <div key={`${it.productId}-${it.portion}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#d6d3d1', padding: '2px 0' }}>
                      <span>{it.name} <span style={{ color: '#a1a1aa', fontSize: '0.72rem' }}>({it.portion === 'A' ? 'Family' : it.portion === 'B' ? 'Full' : 'Half'})</span> &times; {it.qty}</span>
                      <span style={{ color: '#dfb15b' }}>₹{(it.unitPrice || it.price || 0) * (it.qty || it.quantity || 1)}</span>
                    </div>
                  ))}
                </div>

                {/* Payment & Total info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.6rem' }}>
                  <span>
                    {o.utr && o.utr !== 'CASH-OFFLINE' ? (
                      <span style={{ color: '#22c55e', fontWeight: 700 }}>Online Payment (Confirmed)</span>
                    ) : (
                      <span style={{ color: '#dfb15b', fontWeight: 700 }}>Cash on Counter / Delivery</span>
                    )}
                  </span>
                  <strong style={{ color: '#fafaf9', fontSize: '0.95rem' }}>Total: \u20b9{o.total}</strong>
                </div>

                {/* Existing Rating Badge if rated */}
                {o.rating && (
                  <div style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '8px', padding: '0.35rem 0.65rem', marginBottom: '0.6rem', fontSize: '0.78rem', color: '#fde047', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ display: 'inline-flex', gap: '2px', color: '#dfb15b' }}>
                      {Array.from({ length: o.rating }).map((_, i) => (
                        <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill="#dfb15b" stroke="#dfb15b" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      ))}
                    </span>
                    {o.review ? (
                      <span style={{ color: '#d6d3d1' }}>"{o.review}"</span>
                    ) : (
                      <span style={{ color: '#a1a1aa' }}>Rated {o.rating} / 5</span>
                    )}
                  </div>
                )}

                {/* Prominent Cancel for Pending — full-width, above action row */}
                {canCancel && (
                  <button
                    type="button"
                    onClick={() => handleCancel(o.id)}
                    style={{
                      display: 'block',
                      width: '100%',
                      background: 'transparent',
                      border: '1.5px solid #ef4444',
                      color: '#fca5a5',
                      padding: '0.65rem',
                      borderRadius: '10px',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      fontWeight: 800,
                      marginBottom: '0.5rem',
                      minHeight: '44px',
                      letterSpacing: '0.02em',
                    }}
                  >
                    Cancel Order
                  </button>
                )}

                {/* Action Buttons Row */}
                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* 1-Tap Reorder Button */}
                  <button
                    type="button"
                    onClick={() => handleReorder(o)}
                    style={{ background: 'linear-gradient(135deg, #dfb15b, #b88628)', border: 'none', color: '#18181b', padding: '0.4rem 0.85rem', borderRadius: '8px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 900, display: 'inline-flex', alignItems: 'center', gap: '4px', minHeight: '44px' }}
                  >
                    Reorder
                  </button>

                  {/* Rate Food Button (Delivered orders) */}
                  {isDelivered && (
                    <button
                      type="button"
                      onClick={() => openRatingModal(o.id, o.rating ?? undefined)}
                      style={{ background: '#27272a', border: '1px solid #eab308', color: '#fde047', padding: '0.4rem 0.75rem', borderRadius: '8px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 700, minHeight: '44px' }}
                    >
                      {o.rating ? 'Edit Rating' : 'Rate Food'}
                    </button>
                  )}

                  {/* Live Track Button */}
                  {isActive && (
                    <Link
                      to={`/track?id=${o.id}`}
                      style={{ background: statusInfo.bgColor, border: `1px solid ${statusInfo.color}44`, color: statusInfo.color, padding: '0.4rem 0.75rem', borderRadius: '8px', textDecoration: 'none', fontSize: '0.78rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', minHeight: '44px' }}
                    >
                      Track Live
                    </Link>
                  )}

                  {/* 1-Tap Concierge Support */}
                  <Link
                    to={`/support?orderId=${o.id}`}
                    style={{ background: '#27272a', border: '1px solid #3f3f46', color: '#d6d3d1', padding: '0.4rem 0.75rem', borderRadius: '8px', textDecoration: 'none', fontSize: '0.78rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px', minHeight: '44px' }}
                  >
                    Concierge
                  </Link>

                  {/* Receipt Button */}
                  <button
                    type="button"
                    onClick={() => printOrderInvoice(o)}
                    style={{ background: '#27272a', border: '1px solid #3f3f46', color: '#d6d3d1', padding: '0.4rem 0.75rem', borderRadius: '8px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600, marginLeft: 'auto', minHeight: '44px' }}
                  >
                    Bill
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Interactive Star Rating Modal */}
      {ratingModalOrderId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', zIndex: 10000, display: 'grid', placeItems: 'center', padding: '1rem' }}>
          <div className="tfg-glass-elevated" style={{ border: '1px solid rgba(223, 177, 91,0.4)', borderRadius: '24px', padding: '1.75rem', maxWidth: '420px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}>
            <h3 style={{ margin: '0 0 0.5rem', color: '#dfb15b', fontSize: '1.2rem', textAlign: 'center', fontWeight: 900 }}>
              Rate Your Food Experience
            </h3>
            <p style={{ color: '#a1a1aa', fontSize: '0.8rem', textAlign: 'center', margin: '0 0 1.25rem' }}>
              How was your meal from Shanti Kutir?
            </p>

            {/* Stars Selector */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setSelectedStars(star)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '4px',
                    cursor: 'pointer',
                    transform: selectedStars >= star ? 'scale(1.15)' : 'scale(1)',
                    transition: 'transform 0.15s ease',
                    minHeight: '44px',
                  }}
                  aria-label={`${star} star`}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill={selectedStars >= star ? '#dfb15b' : '#27272a'} stroke={selectedStars >= star ? '#dfb15b' : '#52525b'} strokeWidth="1.5">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </button>
              ))}
            </div>

            {/* Quick Feedback Tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
              {QUICK_TAGS.map((tag) => {
                const active = selectedTags.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    style={{
                      padding: '0.35rem 0.65rem',
                      borderRadius: '16px',
                      border: active ? '1px solid #dfb15b' : '1px solid #3f3f46',
                      background: active ? '#78350f' : '#27272a',
                      color: active ? '#fef3c7' : '#d6d3d1',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      fontWeight: active ? 700 : 500,
                      minHeight: '44px',
                    }}
                  >
                    {tag}
                  </button>
                )
              })}
            </div>

            {/* Review Note */}
            <textarea
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="Add an optional comment (e.g. delicious spices, perfect packaging)..."
              rows={3}
              style={{
                width: '100%',
                padding: '0.65rem',
                borderRadius: '10px',
                background: '#121214',
                border: '1px solid #3f3f46',
                color: '#fff',
                fontSize: '16px',
                marginBottom: selectedStars === 5 ? '0.75rem' : '1.25rem',
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box',
              }}
            />

            {/* Google Maps Review Prompt */}
            {selectedStars === 5 && (
              <div
                style={{
                  background: 'rgba(223, 177, 91,0.1)',
                  border: '1px dashed #dfb15b',
                  borderRadius: '10px',
                  padding: '0.65rem 0.85rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                }}
              >
                <div style={{ fontSize: '0.78rem', color: '#fef3c7' }}>
                  <strong>Love our food?</strong> Help travelers find us on Google!
                </div>
                <a
                  href={GOOGLE_MAPS_REVIEW_URL}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: '#dfb15b',
                    color: '#18181b',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: 900,
                    fontSize: '0.75rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Post on Google
                </a>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setRatingModalOrderId(null)}
                style={{ flex: 1, padding: '0.7rem', borderRadius: '10px', background: '#27272a', border: '1px solid #3f3f46', color: '#a1a1aa', fontWeight: 700, cursor: 'pointer', minHeight: '44px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingRating}
                onClick={handleSaveRating}
                style={{ flex: 2, padding: '0.7rem', borderRadius: '10px', background: 'linear-gradient(135deg, #dfb15b, #b88628)', border: 'none', color: '#18181b', fontWeight: 900, cursor: submittingRating ? 'not-allowed' : 'pointer', minHeight: '44px' }}
              >
                {submittingRating ? 'Saving...' : 'Submit Rating'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
