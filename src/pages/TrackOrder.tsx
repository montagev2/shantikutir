import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useStore } from '../context/StoreContext'
import { formatOrderId, getOrderToken, getOrderDeliveryOtp, isOrderOtpRequired, STORE_NAME, GOOGLE_MAPS_REVIEW_URL } from '../lib/business'
import { playChime } from '../lib/notifications'
import { fetchOrderByIdOrPhoneApi } from '../lib/api'
import { supabase } from '../lib/supabase'
import type { Order, OrderStatus } from '../types'
import LiveDeliveryRadar from '../components/LiveDeliveryRadar'

// ─── Status Map ───────────────────────────────────────────────────────────────
const STATUS_MAP: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  pending:      { label: 'Pending Kitchen Approval',     color: '#dfb15b', bg: 'rgba(223, 177, 91,0.12)'  },
  advance_paid: { label: 'Advance Paid',                 color: '#eab308', bg: 'rgba(234,179,8,0.12)'   },
  confirmed:    { label: 'Kitchen Confirmed',            color: '#38bdf8', bg: 'rgba(56,189,248,0.12)'  },
  preparing:    { label: 'Cooking in Kitchen',          color: '#fb923c', bg: 'rgba(251,146,60,0.12)'  },
  cooking:      { label: 'Cooking in Kitchen',          color: '#fb923c', bg: 'rgba(251,146,60,0.12)'  },
  ready:        { label: 'Ready to Serve',               color: '#a855f7', bg: 'rgba(168,85,247,0.12)'  },
  delivered:    { label: 'Delivered / Served',           color: '#22c55e', bg: 'rgba(34,197,94,0.12)'   },
  cancelled:    { label: 'Cancelled',                    color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
  refunded:     { label: 'Refunded',                     color: '#a1a1aa', bg: 'rgba(161,161,170,0.10)' },
}

// ─── 5-Stage Timeline config ──────────────────────────────────────────────────
type TsState = 'completed' | 'active' | 'pending'

interface TimelineStage {
  icon: string
  label: string
  sublabel: (o: Order) => string
  state: (o: Order) => TsState
}

const TIMELINE_STAGES: TimelineStage[] = [
  {
    icon: '1',
    label: 'Order Received',
    sublabel: (o) => o.status === 'pending'
      ? 'Awaiting kitchen confirmation...'
      : 'Confirmed & sent to kitchen',
    state: (o) => o.status === 'pending' ? 'active' : 'completed',
  },
  {
    icon: '2',
    label: 'Kitchen Confirmed',
    sublabel: (o) =>
      ['cooking', 'ready', 'delivered'].includes(o.status)
        ? 'Kitchen chef accepted your order'
        : ['confirmed', 'advance_paid'].includes(o.status)
        ? 'Kitchen accepted your order'
        : 'Waiting for kitchen staff...',
    state: (o) => {
      if (['cooking', 'ready', 'delivered'].includes(o.status)) return 'completed'
      if (['confirmed', 'advance_paid'].includes(o.status)) return 'active'
      return 'pending'
    },
  },
  {
    icon: '3',
    label: 'Cooking Fresh in Kitchen',
    sublabel: (o) =>
      ['ready', 'delivered'].includes(o.status)
        ? 'Cooked and plated hot'
        : o.status === 'cooking'
        ? 'Sizzling on the tandoor / wok'
        : 'Queued in the kitchen',
    state: (o) => {
      if (['ready', 'delivered'].includes(o.status)) return 'completed'
      if (o.status === 'cooking') return 'active'
      return 'pending'
    },
  },
  {
    icon: '4',
    label: 'Ready · Out for Delivery / Table Service',
    sublabel: (o) =>
      o.status === 'delivered'
        ? o.orderType === 'delivery'
          ? 'Handed to delivery rider'
          : 'Served at your table'
        : o.status === 'ready'
        ? o.orderType === 'delivery'
          ? 'Rider picking up shortly...'
          : 'Coming to your table'
        : 'Being prepared...',
    state: (o) => {
      if (o.status === 'delivered') return 'completed'
      if (o.status === 'ready') return 'active'
      return 'pending'
    },
  },
  {
    icon: '5',
    label: 'Delivered — Enjoy Your Meal',
    sublabel: (o) =>
      o.status === 'delivered'
        ? 'Bon Appétit from Shanti Kutir'
        : 'Almost there — we\'re nearly done',
    state: (o) => {
      if (o.status === 'delivered') return 'completed'
      if (o.status === 'ready') return 'active'
      return 'pending'
    },
  },
]

// ─── Component ────────────────────────────────────────────────────────────────
export default function TrackOrder() {
  const { orders } = useStore()
  const [searchParams] = useSearchParams()
  const initialQuery = searchParams.get('id') || searchParams.get('phone') || ''

  const [searchId, setSearchId] = useState(initialQuery)
  const [queriedOrder, setQueriedOrder] = useState<Order | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  const activeOrders = orders.filter((o) => o.status !== 'cancelled')
  const cleanSearch = searchId.replace(/^#/, '').trim().toLowerCase()
  const localMatch = cleanSearch
    ? activeOrders.find((o) => {
        const oId = o.id.toLowerCase()
        const token = getOrderToken(o.id).replace(/^#/, '').toLowerCase()
        return (
          oId.includes(cleanSearch) ||
          token === cleanSearch ||
          token === cleanSearch.padStart(3, '0') ||
          (o.phone || o.customer_phone || '').includes(cleanSearch)
        )
      })
    : activeOrders[0]

  const matched = queriedOrder || localMatch

  // Direct search via secure tracking RPC
  const handleSearch = useCallback(async (queryText?: string) => {
    const q = (queryText || searchId).trim()
    if (!q) return

    setSearching(true)
    setSearchError('')

    try {
      const fetchedOrder = await fetchOrderByIdOrPhoneApi(q)

      if (!fetchedOrder) {
        if (!localMatch) {
          setSearchError(`No order found for "${q}". Check your Order ID or phone number.`)
          setQueriedOrder(null)
        }
      } else {
        setQueriedOrder(fetchedOrder)
      }
    } catch {
      if (!localMatch) setSearchError('Error connecting to tracking system.')
    } finally {
      setSearching(false)
    }
  }, [searchId, localMatch])

  // Auto search on mount if URL param was supplied
  useEffect(() => {
    if (initialQuery) void handleSearch(initialQuery)
  }, [initialQuery, handleSearch])

  // ── Debounced Auto-Search (450ms quiet time prevents hammering Supabase) ────
  useEffect(() => {
    const q = searchId.replace(/^#/, '').trim()
    if (q.length < 3 || q === initialQuery.trim()) return

    // If in-memory state already has an exact match, save the database hit
    if (localMatch && (localMatch.id.toLowerCase() === q.toLowerCase() || localMatch.phone === q)) {
      return
    }

    const timer = setTimeout(() => {
      void handleSearch(q)
    }, 450)

    return () => clearTimeout(timer)
  }, [searchId, initialQuery, localMatch, handleSearch])

  // Real-time live updates
  useEffect(() => {
    if (!matched?.id) return

    const channel = supabase
      .channel(`live-track-${matched.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${matched.id}` },
        (payload) => {
          const row = payload.new as any
          setQueriedOrder((prev) => {
            if (!prev || prev.id !== row.id) return prev
            // Soft luxury audio chime when status progresses (mute on cancellation/refund)
            if (prev.status !== row.status && row.status !== 'cancelled' && row.status !== 'refunded') {
              playChime(row.status === 'ready' || row.status === 'delivered' ? 'ready' : 'delivery')
            }
            return {
              ...prev,
              status: row.status as OrderStatus,
              utrVerified: Boolean(row.utr_verified),
              isExtendedDelivery: Boolean(row.is_extended_delivery),
              extendedDeliveryApproved: Boolean(row.extended_delivery_approved),
              extraDeliveryCharge: Number(row.extra_delivery_charge || 0),
            }
          })
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[Track Live] WebSocket channel dropped, reconnecting...')
        }
      })

    return () => { supabase.removeChannel(channel) }
  }, [matched?.id])

  const statusInfo = matched ? STATUS_MAP[matched.status as OrderStatus] ?? STATUS_MAP.pending : null

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', paddingBottom: '3rem', color: 'var(--text-primary)' }}>

      {/* Official Branded Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.75rem' }}>
        <img
          src="/tfg-logo.png"
          alt="Shanti Kutir Logo"
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            objectFit: 'cover',
            border: '2px solid var(--primary)',
            boxShadow: '0 4px 16px rgba(223, 177, 91, 0.3)',
          }}
        />
        <div>
          <h1 style={{ fontSize: '1.35rem', color: 'var(--text-primary)', margin: 0, fontWeight: 900 }}>
            Live Kitchen & Delivery Tracking
          </h1>
          <span style={{ fontSize: '0.76rem', color: 'var(--primary)', fontWeight: 700 }}>
            {STORE_NAME} · Official Live Radar
          </span>
        </div>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
        Track your Biryani, Kebabs & Mocktails live — from kitchen to table / doorstep.
      </p>

      {/* Search Bar */}
      <form
        onSubmit={(e) => { e.preventDefault(); void handleSearch() }}
        style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}
      >
        <input
          type="text"
          value={searchId}
          onChange={(e) => { setSearchId(e.target.value); setSearchError('') }}
          placeholder="Order ID or registered mobile number..."
          style={{
            flex: 1,
            padding: '0.72rem 1rem',
            borderRadius: '12px',
            background: 'var(--surface)',
            border: '1.5px solid var(--border-strong)',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            outline: 'none',
            fontFamily: 'inherit',
            transition: 'border-color 0.15s ease',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--primary)' }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)' }}
        />
        <button
          type="submit"
          disabled={searching}
          style={{
            padding: '0.72rem 1.25rem',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
            color: '#111',
            border: 'none',
            fontWeight: 800,
            cursor: searching ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem',
            fontFamily: 'inherit',
            opacity: searching ? 0.7 : 1,
            boxShadow: 'var(--shadow-primary)',
            transition: 'opacity 0.15s ease',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          {searching ? 'Locating...' : 'Track'}
        </button>
      </form>

      {/* Error */}
      {searchError && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#fca5a5', marginBottom: '1.25rem', fontWeight: 600 }}>
          {searchError}
        </div>
      )}

      {matched ? (
        <div
          className="tfg-glass-card"
          style={{
            padding: '1.5rem',
            borderRadius: '22px',
          }}
        >
          {/* Order Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '3px' }}>
                {matched.orderType === 'dine_in' ? 'Dine-In Order' : matched.orderType === 'takeaway' ? 'Takeaway Order' : 'Delivery Order'}
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '1.45rem', color: 'var(--primary)', letterSpacing: '-0.02em', fontWeight: 900 }}>
                  Token {getOrderToken(matched.id)}
                </strong>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  (#{formatOrderId(matched.id)})
                </span>
              </div>
              {matched.tableNo && (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                  Table: {matched.tableNo}
                </span>
              )}
              <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)', display: 'block', marginTop: '2px' }}>
                {new Date(matched.createdAt || matched.created_at || Date.now()).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
              </span>
            </div>
            {statusInfo && (
              <span
                style={{
                  background: statusInfo.bg,
                  color: statusInfo.color,
                  border: `1px solid ${statusInfo.color}44`,
                  padding: '5px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                }}
              >
                {statusInfo.label}
              </span>
            )}
          </div>

          {/* Cancelled Order Hero Notice */}
          {matched.status === 'cancelled' ? (
            <div
              style={{
                background: 'linear-gradient(145deg, rgba(239, 68, 68, 0.12), rgba(24, 24, 27, 0.95))',
                border: '1.5px solid rgba(239, 68, 68, 0.35)',
                borderRadius: '20px',
                padding: '1.5rem',
                margin: '1.25rem 0',
                boxShadow: '0 12px 36px rgba(0,0,0,0.55)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.85rem' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.18)',
                    border: '1.5px solid rgba(239, 68, 68, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#f87171',
                    flexShrink: 0,
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fafaf9', fontWeight: 900 }}>
                    This Order Has Been Cancelled
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#fca5a5', fontWeight: 600 }}>
                    Token #{getOrderToken(matched.id)} · Reference #{formatOrderId(matched.id)}
                  </span>
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.45)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '12px',
                  padding: '0.85rem 1rem',
                  marginBottom: '1rem',
                  fontSize: '0.82rem',
                  color: '#d6d3d1',
                  lineHeight: 1.5,
                }}
              >
                {(matched.advanceAmount || 0) > 0 ? (
                  <>
                    <strong style={{ color: '#4ade80', display: 'block', marginBottom: '3px' }}>
                      100% Refund Initiated (₹{matched.advanceAmount || 0})
                    </strong>
                    Your prepaid UPI payment of ₹{matched.advanceAmount} has been marked for reversal. It will automatically reflect in your linked bank account within 24 to 48 business hours.
                  </>
                ) : (
                  <>
                    <strong style={{ color: '#fca5a5', display: 'block', marginBottom: '3px' }}>
                      Zero Payment Due
                    </strong>
                    This was a cash-based order. Since it was cancelled, no cash payment is required.
                  </>
                )}
              </div>

              {/* Quick Actions */}
              <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                <Link
                  to="/"
                  style={{
                    flex: 1,
                    minHeight: '44px',
                    background: 'linear-gradient(135deg, #dfb15b, #b88628)',
                    color: '#18181b',
                    fontWeight: 900,
                    fontSize: '0.85rem',
                    borderRadius: '10px',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 16px rgba(223, 177, 91, 0.25)',
                    touchAction: 'manipulation',
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                  Browse Menu & Reorder
                </Link>
                <Link
                  to={`/support?orderId=${matched.id}`}
                  style={{
                    minHeight: '44px',
                    padding: '0 1rem',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fafaf9',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    borderRadius: '10px',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    touchAction: 'manipulation',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  Need Help?
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Live Delivery Radar */}
              {matched.orderType === 'delivery' && (
                <LiveDeliveryRadar order={matched} />
              )}

              {/* Extended / Distance Delivery Surcharge Notice */}
              {(matched.isExtendedDelivery || (matched.extraDeliveryCharge && matched.extraDeliveryCharge > 0)) && (
                <div style={{
                  background: (matched.extraDeliveryCharge && matched.extraDeliveryCharge > 0)
                    ? 'rgba(223, 177, 91,0.08)'
                    : 'rgba(56,189,248,0.08)',
                  border: `1.5px solid ${(matched.extraDeliveryCharge && matched.extraDeliveryCharge > 0) ? 'rgba(223, 177, 91,0.35)' : 'rgba(56,189,248,0.35)'}`,
                  borderRadius: '14px',
                  padding: '0.75rem 1rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                      {(matched.extraDeliveryCharge && matched.extraDeliveryCharge > 0) ? (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f3d085" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      )}
                    </span>
                    <div>
                      <strong style={{ fontSize: '0.84rem', color: (matched.extraDeliveryCharge && matched.extraDeliveryCharge > 0) ? '#f3d085' : '#38bdf8', display: 'block', marginBottom: '1px' }}>
                        {(matched.extraDeliveryCharge && matched.extraDeliveryCharge > 0)
                          ? `Distance Delivery Surcharge: ₹${matched.extraDeliveryCharge}`
                          : 'Extended Delivery (~5 km+) Under Review'}
                      </strong>
                      <p style={{ margin: 0, fontSize: '0.74rem', color: '#d6d3d1', lineHeight: 1.4 }}>
                        {(matched.extraDeliveryCharge && matched.extraDeliveryCharge > 0)
                          ? `Staff added a delivery surcharge of ₹${matched.extraDeliveryCharge}. Please pay cash to the rider at doorstep.`
                          : 'Staff is reviewing your delivery destination for rider dispatch.'}
                      </p>
                    </div>
                  </div>
                  {(matched.extraDeliveryCharge && matched.extraDeliveryCharge > 0) && (
                    <div style={{
                      background: '#18181b',
                      border: '1px solid rgba(223, 177, 91,0.5)',
                      color: '#f3d085',
                      borderRadius: '8px',
                      padding: '4px 10px',
                      fontWeight: 900,
                      fontSize: '0.86rem',
                      letterSpacing: '0.02em',
                      whiteSpace: 'nowrap',
                    }}>
                      ₹{matched.extraDeliveryCharge} Doorstep Cash
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Handover & Service Cards */}
          {matched.status !== 'cancelled' && matched.status !== 'delivered' && (
            matched.orderType === 'delivery' ? (
              !isOrderOtpRequired(matched) ? (
                <div
                  style={{
                    background: 'rgba(34, 197, 94, 0.08)',
                    border: '1.5px solid rgba(34, 197, 94, 0.35)',
                    borderRadius: '16px',
                    padding: '0.85rem 1.15rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#86efac', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      Payment: Cash on Delivery
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#f4f4f5', marginTop: '2px', display: 'block', fontWeight: 600 }}>
                      Pay ₹{matched.total} cash to your delivery rider upon doorstep arrival. No OTP required.
                    </span>
                  </div>
                  <div
                    style={{
                      background: '#1c1917',
                      border: '1.5px solid #22c55e',
                      borderRadius: '12px',
                      padding: '0.35rem 0.95rem',
                      fontSize: '1.25rem',
                      fontWeight: 900,
                      color: '#4ade80',
                    }}
                  >
                    ₹{matched.total}
                  </div>
                </div>
              ) : matched.status === 'pending' ? (
                <div
                  style={{
                    background: 'rgba(223, 177, 91, 0.06)',
                    border: '1.5px dashed rgba(223, 177, 91, 0.35)',
                    borderRadius: '16px',
                    padding: '0.85rem 1.15rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#dfb15b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      Delivery Handover Verification OTP
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#a1a1aa', marginTop: '2px', display: 'block' }}>
                      Awaiting kitchen acceptance. Your 4-digit code will activate once staff approves.
                    </span>
                  </div>
                  <div
                    style={{
                      background: '#1c1917',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      padding: '0.35rem 0.95rem',
                      fontSize: '1.3rem',
                      fontWeight: 800,
                      color: '#71717a',
                      letterSpacing: '5px',
                    }}
                  >
                    ••••
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: 'linear-gradient(135deg, rgba(223, 177, 91, 0.12), rgba(200, 152, 56, 0.05))',
                    border: '1.5px solid rgba(223, 177, 91, 0.4)',
                    borderRadius: '16px',
                    padding: '0.85rem 1.15rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#dfb15b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      Delivery Handover Verification OTP
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#d6d3d1', marginTop: '2px', display: 'block' }}>
                      {Math.max(0, matched.total - (matched.advanceAmount || 0)) > 0
                        ? `Advance Paid: ₹${matched.advanceAmount || 0}. Pay remaining balance ₹${Math.max(0, matched.total - (matched.advanceAmount || 0))} and share code with rider.`
                        : 'Share this 4-digit code with your delivery rider upon doorstep arrival.'}
                    </span>
                  </div>
                  <div
                    style={{
                      background: '#1c1917',
                      border: '1.5px solid #dfb15b',
                      borderRadius: '12px',
                      padding: '0.35rem 0.95rem',
                      fontSize: '1.6rem',
                      fontWeight: 900,
                      color: '#dfb15b',
                      letterSpacing: '5px',
                      boxShadow: '0 4px 16px rgba(223, 177, 91,0.25)',
                    }}
                  >
                    {getOrderDeliveryOtp(matched)}
                  </div>
                </div>
              )
            ) : matched.orderType === 'dine_in' ? (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  borderRadius: '14px',
                  padding: '0.75rem 1rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  fontSize: '0.84rem',
                  color: '#86efac',
                }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.2)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                </div>
                <div>
                  <strong style={{ display: 'block', color: '#34d399', fontSize: '0.88rem' }}>Dine-In Table Service</strong>
                  <span style={{ color: '#d1fae5', fontSize: '0.78rem' }}>
                    Your dishes will be served directly to {matched.tableNo || 'your table'} as soon as they are cooked hot & fresh!
                  </span>
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.35)',
                  borderRadius: '14px',
                  padding: '0.75rem 1rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  fontSize: '0.84rem',
                  color: '#93c5fd',
                }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.2)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 17h10M12 7v6"/></svg>
                </div>
                <div>
                  <strong style={{ display: 'block', color: '#60a5fa', fontSize: '0.88rem' }}>Takeaway Counter Pickup</strong>
                  <span style={{ color: '#dbeafe', fontSize: '0.78rem' }}>
                    Show your Order #{formatOrderId(matched.id)} at the counter to collect your packed food.
                  </span>
                </div>
              </div>
            )
          )}

          {/* ═══ 5-Stage Animated Timeline (Only for active / non-cancelled orders) ════════════════════════════════ */}
          {matched.status !== 'cancelled' && (
            <div style={{ margin: '1.5rem 0' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '1.1rem' }}>
                Live Order Progress
              </span>

              <div className="order-timeline">
                {TIMELINE_STAGES.map((stage, idx) => {
                  const tsState = stage.state(matched)
                  const stateClass =
                    tsState === 'completed' ? 'ts-completed' :
                    tsState === 'active'    ? 'ts-active'    : ''

                  return (
                    <div key={idx} className={`timeline-step ${stateClass}`}>
                      {/* Dot */}
                      <div className={`timeline-dot ${stateClass}`}>
                        {tsState === 'completed'
                          ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                          : tsState === 'active'
                          ? <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>{stage.icon}</span>
                          : <span style={{ fontSize: '0.85rem', color: 'var(--text-faint)' }}>{idx + 1}</span>
                        }
                      </div>

                      {/* Text */}
                      <div className="timeline-content">
                        <div className="timeline-label">{stage.label}</div>
                        <div className="timeline-sublabel">{stage.sublabel(matched)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Items Summary */}
          <div
            style={{
              background: 'var(--surface-2)',
              borderRadius: '14px',
              padding: '1rem',
              marginTop: '1rem',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Order Items ({matched.items.length})
              </span>
              <span style={{ fontSize: '0.88rem', color: 'var(--primary)', fontWeight: 900 }}>
                Total ₹{matched.total}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {matched.items.map((it) => (
                <div
                  key={`${it.productId}-${it.portion}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.85rem',
                    padding: '0.3rem 0',
                    color: 'var(--text-secondary)',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <span>
                    {it.name}{' '}
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.73rem' }}>
                      ({it.portion === 'A' ? 'Family' : it.portion === 'B' ? 'Full' : 'Half'})
                    </span>{' '}
                    × {it.qty}
                  </span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>₹{(it.unitPrice || it.price || 0) * (it.qty || it.quantity || 1)}</span>
                </div>
              ))}
            </div>

            {/* Payment status strip */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.65rem', padding: '0.5rem 0.75rem', background: 'rgba(34,197,94,0.08)', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.2)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Advance Paid (Food Total)
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--garden-green-light)', fontWeight: 800 }}>
                ₹{matched.advanceAmount} (Confirmed)
              </span>
            </div>

            {/* Extra Distance Delivery Surcharge if added by staff */}
            {matched.extraDeliveryCharge && matched.extraDeliveryCharge > 0 ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem', padding: '0.45rem 0.75rem', background: 'rgba(223, 177, 91,0.08)', borderRadius: '8px', border: '1px solid rgba(223, 177, 91,0.3)' }}>
                <div>
                  <span style={{ fontSize: '0.76rem', color: '#f3d085', fontWeight: 800, display: 'block' }}>
                    Distance Delivery Surcharge
                  </span>
                  <span style={{ fontSize: '0.68rem', color: '#a1a1aa' }}>
                    Payable in cash to delivery rider at doorstep
                  </span>
                </div>
                <span style={{ fontSize: '0.86rem', color: '#f3d085', fontWeight: 900 }}>
                  +₹{matched.extraDeliveryCharge}
                </span>
              </div>
            ) : null}

            {/* Google Maps 5-Star Review Booster */}
            {matched.status === 'delivered' && (
              <div
                style={{
                  marginTop: '0.85rem',
                  background: 'linear-gradient(135deg, rgba(223, 177, 91,0.12), rgba(200, 152, 56,0.06))',
                  border: '1.5px solid rgba(223, 177, 91,0.4)',
                  borderRadius: '14px',
                  padding: '0.85rem',
                  textAlign: 'center',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '0.4rem' }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <svg key={i} width="18" height="18" viewBox="0 0 24 24" fill="#dfb15b" stroke="#dfb15b" strokeWidth="1" aria-hidden="true">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  ))}
                </div>
                <strong style={{ fontSize: '0.9rem', color: 'var(--primary)', display: 'block' }}>
                  Enjoyed your meal at Shanti Kutir?
                </strong>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0.65rem', lineHeight: 1.4 }}>
                  Your 5-star review helps highway travelers discover our delicious Kolkata Dum Biryani & Tandoori Kebabs!
                </p>
                <a
                  href={GOOGLE_MAPS_REVIEW_URL}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: 'linear-gradient(135deg, #dfb15b, #b88628)',
                    color: '#111',
                    padding: '0.5rem 1rem',
                    borderRadius: '9999px',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    textDecoration: 'none',
                    boxShadow: '0 4px 12px rgba(223, 177, 91,0.3)',
                  }}
                >
                  Rate 5 Stars on Google Maps
                </a>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <Link
              to="/"
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '0.65rem',
                background: 'var(--surface-2)',
                border: '1px solid var(--border-strong)',
                borderRadius: '10px',
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
              Back to Menu
            </Link>
            <Link
              to="/orders"
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '0.65rem',
                background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                borderRadius: '10px',
                color: '#111',
                textDecoration: 'none',
                fontWeight: 800,
                fontSize: '0.85rem',
                boxShadow: 'var(--shadow-primary)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
              Order History
            </Link>

            <Link
              to={`/support?orderId=${matched.id}`}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '0.65rem',
                background: '#27272a',
                border: '1px solid #3f3f46',
                borderRadius: '10px',
                color: '#fafaf9',
                textDecoration: 'none',
                fontWeight: 800,
                fontSize: '0.85rem',
                marginTop: '0.4rem',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
              Need Assistance? Connect with Concierge &rarr;
            </Link>
          </div>
        </div>
      ) : (
        /* Empty / No match state */
        <div className="empty-state tfg-glass" style={{ borderRadius: '20px', padding: '3rem 1.25rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: 1.55 }}>
            Enter your Order ID or registered mobile number above to track your order live.
          </p>
          <Link to="/" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none', fontSize: '0.9rem' }}>
            Browse Menu &rarr;
          </Link>
        </div>
      )}
    </div>
  )
}
