import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../../context/StoreContext'
import { useAuth } from '../../context/AuthContext'
import { formatOrderId, getOrderDeliveryOtp, isOrderOtpRequired } from '../../lib/business'
import { formatWhatsAppPhone, openRiderArrivalWhatsApp } from '../../lib/whatsapp'
import { showToast } from '../../components/Toast'
import type { Order, OrderStatus } from '../../types'

export default function RiderView() {
  const { orders, updateOrderStatus } = useStore()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [otpModalOrder, setOtpModalOrder] = useState<Order | null>(null)
  const [cashConfirmOrder, setCashConfirmOrder] = useState<Order | null>(null)
  const [inputOtp, setInputOtp] = useState('')
  const [otpError, setOtpError] = useState('')

  // Screen WakeLock: keeps rider phone screen awake on motorcycle mount during delivery duty
  useEffect(() => {
    let wakeLockSentinel: any = null
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockSentinel = await (navigator as any).wakeLock.request('screen')
        }
      } catch {}
    }
    void requestWakeLock()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void requestWakeLock()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (wakeLockSentinel) {
        wakeLockSentinel.release().catch(() => {})
      }
    }
  }, [])

  // Today's date
  const today = new Date().toDateString()

  // Filter deliveries — Riders ONLY see orders after staff checks and confirms them
  const allDeliveries = orders.filter((o) => o.orderType === 'delivery')
  const activeDeliveries = allDeliveries.filter((o) => ['confirmed', 'cooking', 'ready'].includes(o.status))
  const completedToday = allDeliveries.filter((o) => o.status === 'delivered' && new Date(o.createdAt || o.created_at || Date.now()).toDateString() === today)

  // Cash stats
  const pendingCashToCollect = activeDeliveries.reduce((sum, o) => sum + Math.max(0, o.total - (o.advanceAmount || 0)), 0)
  const cashCollectedToday = completedToday.reduce((sum, o) => sum + Math.max(0, o.total - (o.advanceAmount || 0)), 0)

  const handleStatusChange = async (orderId: string, nextStatus: OrderStatus) => {
    const target = orders.find((o) => o.id === orderId)
    if (!target) return

    if (nextStatus === 'delivered') {
      if (!target.utrVerified) {
        showToast('Payment not verified yet! Wait for kitchen confirmation.', '!')
        return
      }
      if (target.status !== 'ready') {
        showToast('Food is not ready yet! Wait for kitchen to mark "Ready".', '!')
        return
      }
    }

    setUpdatingId(orderId)
    const ok = await updateOrderStatus(orderId, nextStatus)
    setUpdatingId(null)

    if (ok) {
      if (nextStatus === 'delivered') {
        showToast('Delivery marked as completed!', '')
      } else {
        showToast('Order status updated!', '')
      }
    }
  }

  const displayedOrders = activeTab === 'active' ? activeDeliveries : completedToday

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', paddingBottom: '4rem', color: '#fafaf9' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', color: '#34d399', margin: 0, fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
            </svg>
            Rider Delivery Terminal
          </h1>
          <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>
            Welcome, <b>{user?.name}</b> — Focus on safe & fast delivery
          </span>
        </div>
        <Link
          to="/profile"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#d6d3d1', minHeight: '38px', padding: '0.4rem 0.85rem', borderRadius: '8px', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem', touchAction: 'manipulation' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/></svg>
          Profile
        </Link>
      </div>

      {/* ── KPI Stats Grid ─────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.65rem', marginBottom: '1.25rem' }}>
        <div className="tfg-glass-card" style={{ padding: '1rem', textAlign: 'center', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.35rem' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#34d399' }}>{activeDeliveries.length}</div>
          <div style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Active Trips</div>
        </div>

        <div className="tfg-glass-card" style={{ padding: '1rem', textAlign: 'center', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.35rem' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f59e0b' }}>₹{pendingCashToCollect}</div>
          <div style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Pending Cash</div>
        </div>

        <div className="tfg-glass-card" style={{ padding: '1rem', textAlign: 'center', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.35rem' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#22c55e' }}>{completedToday.length}</div>
          <div style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Delivered Today</div>
        </div>

        <div className="tfg-glass-card" style={{ padding: '1rem', textAlign: 'center', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.35rem' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10b981' }}>₹{cashCollectedToday}</div>
          <div style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Cash Collected</div>
        </div>
      </div>

      {/* ── Filter Tabs ────────────────────────────────────── */}
      <div className="tfg-glass-card" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', padding: '5px', borderRadius: '12px', width: 'fit-content' }}>
        <button
          type="button"
          onClick={() => setActiveTab('active')}
          style={{
            padding: '0.55rem 1.1rem',
            minHeight: '44px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'active' ? '#10b981' : 'transparent',
            color: activeTab === 'active' ? '#18181b' : '#a1a1aa',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            touchAction: 'manipulation',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>
          Active Deliveries ({activeDeliveries.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('completed')}
          style={{
            padding: '0.55rem 1.1rem',
            minHeight: '44px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'completed' ? '#10b981' : 'transparent',
            color: activeTab === 'completed' ? '#18181b' : '#a1a1aa',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            touchAction: 'manipulation',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Completed Today ({completedToday.length})
        </button>
      </div>

      {/* ── Order Cards ────────────────────────────────────── */}
      {displayedOrders.length === 0 ? (
        <div className="tfg-glass-card" style={{ textAlign: 'center', padding: '3.5rem 1rem', borderRadius: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>
          </div>
          <h3 style={{ color: '#fafaf9', margin: '0 0 0.25rem' }}>
            {activeTab === 'active' ? 'No active deliveries right now' : 'No deliveries completed today yet'}
          </h3>
          <p style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>
            {activeTab === 'active' ? 'New home delivery orders will pop up here live.' : 'Your delivered trips will be logged here.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {displayedOrders.map((o) => {
            const extraCash = Number((o as any).extraDeliveryCharge || 0)
            const orderBalance = Math.max(0, o.total - (o.advanceAmount || 0))
            const balance = orderBalance + extraCash
            const isUpdating = updatingId === o.id
            const isReady = o.status === 'ready'
            const canDeliver = isReady
            const mapQuery = ((o as any).geoLat && (o as any).geoLng)
              ? `${(o as any).geoLat},${(o as any).geoLng}`
              : encodeURIComponent(`${o.address}, Tamluk-Nandakumar Road, Purba Medinipur, West Bengal`)

            return (
              <div
                key={o.id}
                style={{
                  background: '#1c1917',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px',
                  padding: '1.25rem',
                }}
              >
                {/* Top Row: Order ID + Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 900, color: '#fafaf9' }}>
                      #{formatOrderId(o.id || "")}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>
                      {new Date(o.createdAt || o.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: '8px',
                      background: isReady ? 'rgba(168, 85, 247, 0.15)' : 'rgba(251, 146, 60, 0.15)',
                      color: isReady ? '#c084fc' : '#fb923c',
                      border: `1px solid ${isReady ? 'rgba(168, 85, 247, 0.3)' : 'rgba(251, 146, 60, 0.3)'}`,
                    }}
                  >
                    {isReady ? 'Ready to Deliver' : o.status === 'cooking' ? 'Cooking' : 'Processing'}
                  </span>
                </div>

                {/* Customer Details */}
                <div style={{ marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fafaf9' }}>{o.userName}</span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <a
                        href={`tel:${o.phone}`}
                        style={{
                          background: '#047857',
                          border: '1px solid #10b981',
                          color: '#d1fae5',
                          minHeight: '38px',
                          padding: '0.35rem 0.85rem',
                          borderRadius: '8px',
                          textDecoration: 'none',
                          fontWeight: 800,
                          fontSize: '0.78rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          touchAction: 'manipulation',
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        Call
                      </a>
                      <a
                        href={`https://wa.me/${formatWhatsAppPhone(o.phone)}?text=${encodeURIComponent(
                          `নমস্কার ${o.userName}, Shanti Kutir থেকে আপনার ফুড অর্ডার #${formatOrderId(o.id || "")} নিয়ে রাইডার রওনা দিয়েছেন।`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          background: '#15803d',
                          border: '1px solid #22c55e',
                          color: '#bbf7d0',
                          minHeight: '38px',
                          padding: '0.35rem 0.85rem',
                          borderRadius: '8px',
                          textDecoration: 'none',
                          fontWeight: 800,
                          fontSize: '0.78rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          touchAction: 'manipulation',
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
                        </svg>
                        WhatsApp
                      </a>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '0.65rem 0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      <div>
                        <span style={{ fontSize: '0.72rem', color: '#a1a1aa', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                          Delivery Destination:
                        </span>
                        <span style={{ fontSize: '0.88rem', color: '#fafaf9', fontWeight: 600 }}>{o.address}</span>
                      </div>
                    </div>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&origin=22.177882,87.869264&destination=${((o as any).geoLat && (o as any).geoLng) ? `${(o as any).geoLat},${(o as any).geoLng}` : encodeURIComponent(o.address || '')}&travelmode=driving`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                        border: '1px solid #3b82f6',
                        color: '#ffffff',
                        minHeight: '38px',
                        padding: '0.45rem 0.85rem',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        flexShrink: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 8px rgba(37,99,235,0.4)',
                        touchAction: 'manipulation',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                      {((o as any).geoLat && (o as any).geoLng) ? 'Live GPS Nav ->' : 'GPS Nav ->'}
                    </a>
                  </div>
                </div>

                {/* Items Checklist */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '0.65rem 0.85rem', marginBottom: '0.85rem' }}>
                  <span style={{ fontSize: '0.72rem', color: '#a1a1aa', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase', fontWeight: 700 }}>
                    Food Items Checklist ({o.items.length}):
                  </span>
                  {o.items.map((it) => (
                    <div key={`${it.productId}-${it.portion}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#d6d3d1', padding: '3px 0' }}>
                      <span>
                        {it.name} <span style={{ color: '#a1a1aa', fontSize: '0.72rem' }}>({it.portion === 'A' ? 'Family' : it.portion === 'B' ? 'Full' : 'Half'})</span>
                      </span>
                      <strong style={{ color: '#fafaf9' }}>× {it.qty}</strong>
                    </div>
                  ))}
                </div>

                {/* Extended Delivery — Extra Cash Collection Notice */}
                {(o as any).isExtendedDelivery && (
                  <div style={{
                    background: (o as any).extendedDeliveryApproved ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
                    border: `1.5px solid ${(o as any).extendedDeliveryApproved ? 'rgba(34,197,94,0.4)' : 'rgba(245,158,11,0.4)'}`,
                    borderRadius: '12px',
                    padding: '0.65rem 0.9rem',
                    marginBottom: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                  }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                      {(o as any).extendedDeliveryApproved ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      )}
                    </span>
                    <div>
                      <strong style={{
                        fontSize: '0.82rem',
                        color: (o as any).extendedDeliveryApproved ? '#4ade80' : '#fbbf24',
                        display: 'block',
                      }}>
                        {(o as any).extendedDeliveryApproved ? 'Approved by Kitchen Staff' : 'Awaiting Staff Approval'}
                      </strong>
                      {(o as any).extendedDeliveryApproved && (o as any).extraDeliveryCharge > 0 && (
                        <span style={{ fontSize: '0.78rem', color: '#fca5a5', fontWeight: 700 }}>
                          Collect ₹{(o as any).extraDeliveryCharge} extra cash at doorstep
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Cash Due Card */}
                <div
                  style={{
                    background: balance > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(34, 197, 94, 0.12)',
                    border: balance > 0 ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(34, 197, 94, 0.35)',
                    borderRadius: '12px',
                    padding: '0.65rem 0.85rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.72rem', color: balance > 0 ? '#fca5a5' : '#86efac', display: 'block', fontWeight: 700 }}>
                      {balance > 0 ? 'CASH TO COLLECT AT DOORSTEP:' : 'FULLY PAID ONLINE'}
                    </span>
                    <strong style={{ fontSize: '1.2rem', color: balance > 0 ? '#ef4444' : '#22c55e' }}>
                      {balance > 0 ? `₹${balance}` : '₹0 Balance'}
                    </strong>
                    {extraCash > 0 && (
                      <span style={{ fontSize: '0.72rem', color: '#fbbf24', display: 'block', marginTop: '2px', fontWeight: 700 }}>
                        (Includes ₹{extraCash} distance delivery surcharge)
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.78rem', color: '#a1a1aa' }}>
                    Total: ₹{o.total} (Adv: ₹{(o.advanceAmount || 0)})
                  </span>
                </div>

                {/* Readiness Status Banner */}
                {activeTab === 'active' && !canDeliver && (
                  <div
                    style={{
                      background: 'rgba(245, 158, 11, 0.12)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '10px',
                      padding: '0.6rem 0.85rem',
                      fontSize: '0.78rem',
                      color: '#fef3c7',
                      marginBottom: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 2v6a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V2"/><path d="M12 11v11"/></svg>
                    <span>Food is currently being prepared in kitchen. Wait for "Ready" status to deliver.</span>
                  </div>
                )}

                {/* Action Buttons */}
                {activeTab === 'active' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          minHeight: '44px',
                          padding: '0.75rem',
                          background: '#2563eb',
                          color: '#fff',
                          borderRadius: '10px',
                          textDecoration: 'none',
                          textAlign: 'center',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          touchAction: 'manipulation',
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
                        GPS Maps
                      </a>

                      <button
                        type="button"
                        onClick={() => openRiderArrivalWhatsApp(o)}
                        style={{
                          minHeight: '44px',
                          padding: '0.75rem',
                          background: 'rgba(34, 197, 94, 0.15)',
                          border: '1px solid rgba(34, 197, 94, 0.4)',
                          color: '#22c55e',
                          borderRadius: '10px',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          touchAction: 'manipulation',
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
                        </svg>
                        Arrived Alert
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={isUpdating || !canDeliver}
                      onClick={() => {
                        if (isOrderOtpRequired(o)) {
                          setOtpModalOrder(o)
                          setInputOtp('')
                          setOtpError('')
                        } else {
                          setCashConfirmOrder(o)
                        }
                      }}
                      style={{
                        minHeight: '48px',
                        padding: '0.85rem',
                        background: canDeliver
                          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                          : '#27272a',
                        color: canDeliver ? '#18181b' : '#71717a',
                        borderRadius: '10px',
                        border: 'none',
                        fontWeight: 900,
                        fontSize: '0.9rem',
                        cursor: canDeliver && !isUpdating ? 'pointer' : 'not-allowed',
                        boxShadow: canDeliver ? '0 4px 12px rgba(16, 185, 129, 0.35)' : 'none',
                        opacity: canDeliver ? 1 : 0.65,
                        touchAction: 'manipulation',
                      }}
                      title={
                        !isReady
                          ? 'Waiting for food to be marked Ready by kitchen'
                          : isOrderOtpRequired(o)
                          ? 'Verify Customer OTP & Deliver'
                          : 'Collect Cash & Complete Delivery'
                      }
                    >
                      {isUpdating
                        ? 'Saving...'
                        : !canDeliver
                        ? 'Cooking in Kitchen'
                        : isOrderOtpRequired(o)
                        ? (balance > 0 ? `Collect ₹${balance} & Verify OTP` : 'Verify Customer OTP & Deliver')
                        : `Collect ₹${balance} Cash & Hand Over`}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Handover OTP Verification Modal */}
      {otpModalOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setOtpModalOrder(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="tfg-glass-elevated"
            style={{
              width: '100%',
              maxWidth: '420px',
              border: '1.5px solid rgba(16, 185, 129, 0.45)',
              borderRadius: '24px',
              padding: '1.75rem',
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '20px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 1rem',
                color: '#34d399',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>

            <h3 style={{ fontSize: '1.25rem', color: '#34d399', margin: '0 0 0.4rem', fontWeight: 900 }}>
              Verify Handover OTP
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#a1a1aa', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
              Ask <strong style={{ color: '#fafaf9' }}>{otpModalOrder.userName}</strong> for the 4-digit code shown on their tracking screen to complete delivery.
            </p>

            {Math.max(0, otpModalOrder.total - (otpModalOrder.advanceAmount || 0)) > 0 && (
              <div
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                  borderRadius: '12px',
                  padding: '0.65rem 1rem',
                  marginBottom: '1rem',
                  fontSize: '0.88rem',
                  color: '#fbbf24',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                Collect Cash / Balance: ₹{Math.max(0, otpModalOrder.total - (otpModalOrder.advanceAmount || 0))}
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault()
                const expectedOtp = getOrderDeliveryOtp(otpModalOrder)
                if (inputOtp.trim() === expectedOtp) {
                  const targetId = otpModalOrder.id
                  setOtpModalOrder(null)
                  await handleStatusChange(targetId, 'delivered')
                } else {
                  setOtpError('Incorrect OTP! Ask customer to check their live tracking screen.')
                }
              }}
            >
              <input
                type="text"
                pattern="[0-9]*"
                maxLength={4}
                autoFocus
                placeholder="••••"
                value={inputOtp}
                onChange={(e) => {
                  setInputOtp(e.target.value.replace(/\D/g, ''))
                  setOtpError('')
                }}
                style={{
                  width: '100%',
                  background: '#121214',
                  border: otpError ? '2px solid #ef4444' : '2px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '14px',
                  padding: '0.75rem',
                  fontSize: '1.8rem',
                  fontWeight: 900,
                  letterSpacing: '8px',
                  textAlign: 'center',
                  color: '#34d399',
                  outline: 'none',
                  boxSizing: 'border-box',
                  marginBottom: '0.5rem',
                }}
              />

              {otpError && (
                <span style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 700, display: 'block', marginBottom: '0.75rem' }}>
                  {otpError}
                </span>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setOtpModalOrder(null)}
                  style={{
                    flex: 1,
                    background: '#27272a',
                    border: '1px solid #3f3f46',
                    color: '#d6d3d1',
                    borderRadius: '12px',
                    padding: '0.75rem',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inputOtp.length !== 4}
                  style={{
                    flex: 2,
                    background: inputOtp.length === 4 ? 'linear-gradient(135deg, #10b981, #059669)' : '#27272a',
                    color: inputOtp.length === 4 ? '#18181b' : '#71717a',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '0.75rem',
                    fontWeight: 900,
                    fontSize: '0.88rem',
                    cursor: inputOtp.length === 4 ? 'pointer' : 'not-allowed',
                    boxShadow: inputOtp.length === 4 ? '0 4px 16px rgba(16,185,129,0.35)' : 'none',
                  }}
                >
                  Confirm and Complete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cash on Delivery Handover Confirmation Modal (No OTP Needed) */}
      {cashConfirmOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setCashConfirmOrder(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="tfg-glass-elevated"
            style={{
              width: '100%',
              maxWidth: '420px',
              border: '1.5px solid rgba(34, 197, 94, 0.45)',
              borderRadius: '24px',
              padding: '1.75rem',
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '20px',
                background: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.4)',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 1rem',
                color: '#4ade80',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <line x1="2" y1="10" x2="22" y2="10"/>
              </svg>
            </div>

            <h3 style={{ fontSize: '1.25rem', color: '#4ade80', margin: '0 0 0.4rem', fontWeight: 900 }}>
              Cash on Delivery Handover
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#a1a1aa', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
              Collect <strong style={{ color: '#fafaf9' }}>₹{Math.max(0, cashConfirmOrder.total - (cashConfirmOrder.advanceAmount || 0))}</strong> cash from <strong style={{ color: '#fafaf9' }}>{cashConfirmOrder.userName}</strong>. Physical cash collection is proof of handover. No OTP needed.
            </p>

            <div
              style={{
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '12px',
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem',
                fontSize: '1.3rem',
                color: '#4ade80',
                fontWeight: 900,
              }}
            >
              ₹{Math.max(0, cashConfirmOrder.total - (cashConfirmOrder.advanceAmount || 0))} Cash Collected
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setCashConfirmOrder(null)}
                style={{
                  flex: 1,
                  background: '#27272a',
                  border: '1px solid #3f3f46',
                  color: '#d6d3d1',
                  borderRadius: '12px',
                  padding: '0.75rem',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const targetId = cashConfirmOrder.id
                  setCashConfirmOrder(null)
                  await handleStatusChange(targetId, 'delivered')
                }}
                style={{
                  flex: 2,
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#18181b',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '0.75rem',
                  fontWeight: 900,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(16,185,129,0.35)',
                }}
              >
                Confirm Cash & Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
