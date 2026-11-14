import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../../context/StoreContext'
import {
  exportOrdersToCSV,
  getLifetimeVault,
  archiveDeliveredOrdersApi,
  purgeCancelledOrdersApi,
  deleteOrderByIdApi,
  clearAppCacheAndReset,
  type LifetimeVaultData,
} from '../../lib/api'
import { formatOrderId } from '../../lib/business'
import { showToast } from '../../components/Toast'

export default function AdminCleaner() {
  const { orders, refreshOrders } = useStore()
  const [vault, setVault] = useState<LifetimeVaultData>(() => getLifetimeVault())
  const [purging, setPurging] = useState(false)
  const [searchOrderId, setSearchOrderId] = useState('')
  const [deletingId, setDeletingId] = useState(false)

  // Delivered stats
  const now = Date.now()
  const deliveredOrders = orders.filter((o) => o.status === 'delivered')
  const olderThan30Days = deliveredOrders.filter(
    (o) => now - new Date(o.createdAt || o.created_at || Date.now()).getTime() > 30 * 24 * 60 * 60 * 1000
  )
  const olderThan7Days = deliveredOrders.filter(
    (o) => now - new Date(o.createdAt || o.created_at || Date.now()).getTime() > 7 * 24 * 60 * 60 * 1000
  )
  const cancelledOrders = orders.filter((o) => o.status === 'cancelled')

  // Total Lifetime Calculation (Vault + Current Live DB Orders)
  const currentDbRevenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((s, o) => s + (o.total || 0), 0)
  const totalLifetimeRevenue = vault.vaultRevenue + currentDbRevenue
  const totalLifetimeOrders = vault.vaultOrdersCount + orders.filter((o) => o.status !== 'cancelled').length

  // Match order by ID or short format for manual delete
  const targetOrder = useMemo(() => {
    const q = searchOrderId.trim().toLowerCase()
    if (!q) return null
    return orders.find(
      (o) => o.id.toLowerCase() === q || formatOrderId(o.id).toLowerCase() === q.replace(/^#/, '')
    )
  }, [orders, searchOrderId])

  const handleDeleteSpecificOrder = async () => {
    if (!targetOrder) return
    const shortId = formatOrderId(targetOrder.id)

    if (
      !confirm(
        `Are you sure you want to PERMANENTLY DELETE Order #${shortId} (Rs ${targetOrder.total}) from the Supabase Database?\n\nIf delivered, its revenue will be preserved in Lifetime Vault.`
      )
    )
      return

    setDeletingId(true)
    try {
      const ok = await deleteOrderByIdApi(targetOrder.id, targetOrder)
      if (ok) {
        setVault(getLifetimeVault())
        await refreshOrders?.()
        setSearchOrderId('')
        showToast(`Order #${shortId} permanently deleted from database`, 'i')
      } else {
        showToast('Failed to delete order from database', '!')
      }
    } finally {
      setDeletingId(false)
    }
  }

  const handleCleanAppCache = () => {
    if (
      !confirm(
        'Clean local browser app cache & reset temporary data?\n\nYour login and account PIN will remain safe.'
      )
    )
      return

    clearAppCacheAndReset()
    showToast('App cache cleaned successfully. Reloading...', 'i')
    setTimeout(() => {
      window.location.reload()
    }, 1200)
  }

  const handleArchive30 = async () => {
    if (olderThan30Days.length === 0) {
      showToast('No delivered orders older than 30 days found', 'i')
      return
    }

    if (
      !confirm(
        `Consolidate Rs ${olderThan30Days.reduce((s, o) => s + o.total, 0)} from ${olderThan30Days.length} orders into Lifetime Vault and free database storage?`
      )
    )
      return

    setPurging(true)
    try {
      const res = await archiveDeliveredOrdersApi(orders, 30)
      setVault(getLifetimeVault())
      await refreshOrders?.()
      showToast(`Archived ${res.purgedCount} orders into Lifetime Vault`, 'i')
    } finally {
      setPurging(false)
    }
  }

  const handleArchive7 = async () => {
    if (olderThan7Days.length === 0) {
      showToast('No delivered orders older than 7 days found', 'i')
      return
    }

    if (
      !confirm(
        `Consolidate Rs ${olderThan7Days.reduce((s, o) => s + o.total, 0)} from ${olderThan7Days.length} orders into Lifetime Vault and free database storage?`
      )
    )
      return

    setPurging(true)
    try {
      const res = await archiveDeliveredOrdersApi(orders, 7)
      setVault(getLifetimeVault())
      await refreshOrders?.()
      showToast(`Archived ${res.purgedCount} orders into Lifetime Vault`, 'i')
    } finally {
      setPurging(false)
    }
  }

  const handlePurgeCancelled = async () => {
    if (cancelledOrders.length === 0) {
      showToast('No cancelled/trash orders to purge', 'i')
      return
    }

    if (!confirm(`Permanently delete all ${cancelledOrders.length} cancelled/fake orders?`)) return

    setPurging(true)
    try {
      const count = await purgeCancelledOrdersApi(orders)
      await refreshOrders?.()
      showToast(`Purged ${count} cancelled orders`, 'i')
    } finally {
      setPurging(false)
    }
  }

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', paddingBottom: '3.5rem', color: '#fafaf9', paddingLeft: '1rem', paddingRight: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dfb15b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            <h1 style={{ fontSize: '1.4rem', color: '#dfb15b', margin: 0, fontWeight: 900, letterSpacing: '-0.02em' }}>
              Database Cleaner & Lifetime Vault
            </h1>
          </div>
          <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>
            Keep Supabase storage lean and fast while preserving 100% of your earnings history
          </span>
        </div>
        <Link
          to="/admin"
          className="tfg-glass-card"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#d6d3d1', padding: '0.5rem 0.9rem', borderRadius: '10px', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 700, minHeight: '44px' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Admin Portal
        </Link>
      </div>

      {/* Lifetime Vault Banner */}
      <div
        className="tfg-glass-elevated"
        style={{
          border: '1.5px solid rgba(223, 177, 91,0.45)',
          borderRadius: '20px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.35rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(223, 177, 91,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dfb15b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 9v1" />
                  <path d="M12 14v1" />
                </svg>
              </div>
              <strong style={{ fontSize: '1.15rem', color: '#fafaf9', fontWeight: 900 }}>Lifetime Revenue Vault</strong>
              <span style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.4)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.68rem', fontWeight: 900 }}>
                100% PRESERVED
              </span>
            </div>
            <p style={{ color: '#d6d3d1', fontSize: '0.82rem', margin: '0 0 0.75rem', lineHeight: 1.45 }}>
              Even when old orders are purged from database storage, all gross earnings and dish sales stay locked in this vault forever.
            </p>
          </div>

          <button
            type="button"
            onClick={() => exportOrdersToCSV(orders)}
            style={{
              background: 'linear-gradient(135deg, #dfb15b, #c89838)',
              color: '#111',
              border: 'none',
              padding: '0.6rem 1.1rem',
              borderRadius: '10px',
              fontWeight: 900,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(223, 177, 91,0.3)',
              minHeight: '44px',
              touchAction: 'manipulation',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download Sales Backup (CSV)
          </button>
        </div>

        {/* Financial Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
          <div className="tfg-glass-card" style={{ padding: '1rem', background: 'rgba(18, 18, 20, 0.7)' }}>
            <span style={{ fontSize: '0.72rem', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>Lifetime Gross Revenue</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#22c55e', marginTop: '2px', letterSpacing: '-0.02em' }}>Rs {totalLifetimeRevenue.toLocaleString()}</div>
            <span style={{ fontSize: '0.68rem', color: '#71717a', display: 'block', marginTop: '2px' }}>Vault: Rs {vault.vaultRevenue.toLocaleString()} + Live: Rs {currentDbRevenue.toLocaleString()}</span>
          </div>

          <div className="tfg-glass-card" style={{ padding: '1rem', background: 'rgba(18, 18, 20, 0.7)' }}>
            <span style={{ fontSize: '0.72rem', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>Total All-Time Orders</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#dfb15b', marginTop: '2px', letterSpacing: '-0.02em' }}>{totalLifetimeOrders}</div>
            <span style={{ fontSize: '0.68rem', color: '#71717a', display: 'block', marginTop: '2px' }}>Vault: {vault.vaultOrdersCount} + Live: {orders.length}</span>
          </div>

          <div className="tfg-glass-card" style={{ padding: '1rem', background: 'rgba(18, 18, 20, 0.7)' }}>
            <span style={{ fontSize: '0.72rem', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>Last Vault Archival</span>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fafaf9', marginTop: '6px' }}>
              {vault.lastArchivedAt ? new Date(vault.lastArchivedAt).toLocaleDateString() : 'Never'}
            </div>
            <span style={{ fontSize: '0.68rem', color: '#71717a', display: 'block', marginTop: '2px' }}>Auto-synced securely</span>
          </div>
        </div>
      </div>

      {/* Controls Grid */}
      <h2 style={{ fontSize: '1.1rem', color: '#fafaf9', fontWeight: 800, marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dfb15b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        Database & Cache Optimization Controls
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {/* CARD 1: Delete Specific Order by ID */}
        <div className="tfg-glass-card" style={{ padding: '1.25rem', borderColor: 'rgba(223, 177, 91,0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.35rem' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dfb15b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <line x1="7" y1="8" x2="17" y2="8" />
              <line x1="7" y1="12" x2="17" y2="12" />
              <line x1="7" y1="16" x2="13" y2="16" />
            </svg>
            <strong style={{ fontSize: '0.98rem', color: '#dfb15b' }}>
              Delete Specific Order by ID (Database Purge)
            </strong>
          </div>
          <p style={{ color: '#a1a1aa', fontSize: '0.78rem', margin: '0 0 0.85rem' }}>
            Enter an Order ID to locate and permanently remove it from the Supabase database.
          </p>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={searchOrderId}
              onChange={(e) => setSearchOrderId(e.target.value)}
              placeholder="Enter Order ID (e.g. TFG-412 or full ID)..."
              style={{
                flex: 1,
                minWidth: '220px',
                minHeight: '44px',
                padding: '0.65rem 0.85rem',
                borderRadius: '10px',
                background: 'rgba(18, 18, 20, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#fff',
                fontSize: '16px',
                outline: 'none',
              }}
            />
          </div>

          {targetOrder && (
            <div className="tfg-glass-card" style={{ padding: '1rem', marginTop: '0.85rem', background: 'rgba(18, 18, 20, 0.7)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <strong style={{ fontSize: '1rem', color: '#fafaf9' }}>
                    Order #{formatOrderId(targetOrder.id)}
                  </strong>
                  <span style={{ fontSize: '0.78rem', color: '#a1a1aa', display: 'block', marginTop: '3px' }}>
                    {targetOrder.userName || targetOrder.customer_name} - {targetOrder.phone || targetOrder.customer_phone} - {(targetOrder.orderType || targetOrder.dining_mode || 'dine_in').toUpperCase()}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ fontSize: '1.1rem', color: '#22c55e' }}>Rs {targetOrder.total}</strong>
                  <span style={{ fontSize: '0.72rem', color: '#dfb15b', display: 'block', fontWeight: 700, marginTop: '2px' }}>
                    Status: {targetOrder.status.toUpperCase()}
                  </span>
                </div>
              </div>

              <div style={{ fontSize: '0.78rem', color: '#d6d3d1', marginBottom: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.5rem' }}>
                {targetOrder.items.map((it) => `${it.qty}x ${it.name}`).join(', ')}
              </div>

              <button
                type="button"
                disabled={deletingId}
                onClick={handleDeleteSpecificOrder}
                style={{
                  width: '100%',
                  minHeight: '44px',
                  padding: '0.65rem',
                  background: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 900,
                  fontSize: '0.84rem',
                  cursor: deletingId ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  touchAction: 'manipulation',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                {deletingId ? 'Deleting from Database...' : `Confirm Delete #${formatOrderId(targetOrder.id)} from Database`}
              </button>
            </div>
          )}
        </div>

        {/* CARD 2: Clean App Cache & PWA Refresh */}
        <div className="tfg-glass-card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <strong style={{ fontSize: '0.95rem', color: '#38bdf8', display: 'block' }}>
              Clear Client App Cache & Asset Reset
            </strong>
            <span style={{ fontSize: '0.78rem', color: '#a1a1aa', marginTop: '2px', display: 'block' }}>
              Flushes stale browser storage and forces fresh menu items without logging you out.
            </span>
          </div>
          <button
            type="button"
            onClick={handleCleanAppCache}
            style={{
              minHeight: '44px',
              padding: '0.55rem 1rem',
              background: '#0284c7',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              touchAction: 'manipulation',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21h5v-5" />
            </svg>
            Clean Local Cache
          </button>
        </div>

        {/* CARD 3: 30-Day Purge */}
        <div className="tfg-glass-card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <strong style={{ fontSize: '0.95rem', color: '#fafaf9', display: 'block' }}>
              Archive Delivered Orders Older Than 30 Days (Recommended)
            </strong>
            <span style={{ fontSize: '0.78rem', color: '#a1a1aa', marginTop: '2px', display: 'block' }}>
              Consolidates earnings into Lifetime Vault, then frees {olderThan30Days.length} order row(s) from Supabase.
            </span>
          </div>
          <button
            type="button"
            disabled={purging || olderThan30Days.length === 0}
            onClick={handleArchive30}
            style={{
              minHeight: '44px',
              padding: '0.55rem 1rem',
              background: olderThan30Days.length > 0 ? '#dfb15b' : 'rgba(255,255,255,0.08)',
              color: olderThan30Days.length > 0 ? '#111' : '#71717a',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: olderThan30Days.length > 0 ? 'pointer' : 'not-allowed',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              touchAction: 'manipulation',
            }}
          >
            {purging ? 'Archiving...' : `Archive (${olderThan30Days.length})`}
          </button>
        </div>

        {/* CARD 4: 7-Day Purge */}
        <div className="tfg-glass-card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <strong style={{ fontSize: '0.95rem', color: '#fafaf9', display: 'block' }}>
              Archive Delivered Orders Older Than 7 Days (High Volume)
            </strong>
            <span style={{ fontSize: '0.78rem', color: '#a1a1aa', marginTop: '2px', display: 'block' }}>
              For high-traffic highway rush seasons. Qualifies {olderThan7Days.length} order row(s).
            </span>
          </div>
          <button
            type="button"
            disabled={purging || olderThan7Days.length === 0}
            onClick={handleArchive7}
            style={{
              minHeight: '44px',
              padding: '0.55rem 1rem',
              background: olderThan7Days.length > 0 ? '#c89838' : 'rgba(255,255,255,0.08)',
              color: olderThan7Days.length > 0 ? '#fff' : '#71717a',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: olderThan7Days.length > 0 ? 'pointer' : 'not-allowed',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              touchAction: 'manipulation',
            }}
          >
            {purging ? 'Archiving...' : `Archive (${olderThan7Days.length})`}
          </button>
        </div>

        {/* CARD 5: Cancelled Orders Purge */}
        <div className="tfg-glass-card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <strong style={{ fontSize: '0.95rem', color: '#f87171', display: 'block' }}>
              Purge Cancelled / Trash Orders Immediately
            </strong>
            <span style={{ fontSize: '0.78rem', color: '#a1a1aa', marginTop: '2px', display: 'block' }}>
              Permanently deletes {cancelledOrders.length} failed/cancelled order attempt(s) taking up storage.
            </span>
          </div>
          <button
            type="button"
            disabled={purging || cancelledOrders.length === 0}
            onClick={handlePurgeCancelled}
            style={{
              minHeight: '44px',
              padding: '0.55rem 1rem',
              background: cancelledOrders.length > 0 ? '#dc2626' : 'rgba(255,255,255,0.08)',
              color: cancelledOrders.length > 0 ? '#fff' : '#71717a',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: cancelledOrders.length > 0 ? 'pointer' : 'not-allowed',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              touchAction: 'manipulation',
            }}
          >
            {purging ? 'Purging...' : `Purge (${cancelledOrders.length})`}
          </button>
        </div>
      </div>
    </div>
  )
}

