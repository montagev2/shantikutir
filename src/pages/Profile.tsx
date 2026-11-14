import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useStore } from '../context/StoreContext'
import { showToast } from '../components/Toast'

const ROLE_BADGE: Record<string, { label: string; color: string }> = {
  admin:    { label: 'Admin',          color: '#a78bfa' },
  seller:   { label: 'Kitchen Staff',  color: '#f59e0b' },
  rider:    { label: 'Delivery Rider', color: '#22c55e' },
  customer: { label: 'Customer',       color: '#a1a1aa' },
}

export default function Profile() {
  const { user, logout, updateOwnName, updateOwnPin } = useAuth()
  const { orders, addresses, deleteAddress, lang } = useStore()

  // Change Name state
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(user?.name || '')
  const [savingName, setSavingName] = useState(false)

  // Change PIN state
  const [editingPin, setEditingPin] = useState(false)
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [savingPin, setSavingPin] = useState(false)

  if (!user) return (
    <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#fafaf9' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/></svg>
      </div>
      <h2 style={{ color: '#f59e0b' }}>You are not signed in</h2>
      <Link to="/auth" style={{ display: 'inline-block', marginTop: '1rem', padding: '0.65rem 1.5rem', background: '#f59e0b', color: '#18181b', borderRadius: '10px', fontWeight: 800, textDecoration: 'none' }}>
        Sign In / Register
      </Link>
    </div>
  )

  const badge = ROLE_BADGE[user.role] || ROLE_BADGE.customer
  const myOrders = orders.filter((o) => o.phone === user.phone || o.userId === user.id)
  const totalSpend = myOrders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0)

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nameInput.trim()) {
      showToast('Name cannot be blank', '!')
      return
    }
    setSavingName(true)
    const res = await updateOwnName(nameInput.trim())
    setSavingName(false)
    if (res.ok) setEditingName(false)
  }

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanNewPin = newPin.trim().toLowerCase().replace(/\s+/g, '')
    const cleanConfirmPin = confirmPin.trim().toLowerCase().replace(/\s+/g, '')
    if (cleanNewPin.length < 4 || cleanNewPin.length > 32) {
      showToast('PIN / Password must be between 4 and 32 characters', '!')
      return
    }
    if (cleanNewPin !== cleanConfirmPin) {
      showToast('PINs / Passwords do not match', '!')
      return
    }
    setSavingPin(true)
    const res = await updateOwnPin(cleanNewPin)
    setSavingPin(false)
    if (res.ok) {
      setNewPin('')
      setConfirmPin('')
      setEditingPin(false)
    }
  }

  return (
    <div style={{ maxWidth: '540px', margin: '0 auto', paddingBottom: '3rem', color: '#fafaf9' }}>

      {/* Profile Card */}
      <div className="tfg-glass-card" style={{ padding: '2rem', textAlign: 'center', marginBottom: '1rem', borderRadius: '24px' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#18181b', fontSize: '2rem', display: 'grid', placeItems: 'center', margin: '0 auto 0.85rem', fontWeight: 900, boxShadow: '0 4px 16px rgba(245,158,11,0.4)' }}>
          {user.name?.[0]?.toUpperCase() || '?'}
        </div>

        {editingName ? (
          <form onSubmit={handleSaveName} style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', margin: '0.5rem 0' }}>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Your full name"
              style={{ padding: '0.45rem 0.75rem', borderRadius: '8px', background: '#121214', border: '1px solid #f59e0b', color: '#fff', fontSize: '1rem', touchAction: 'manipulation' }}
            />
            <button
              type="submit"
              disabled={savingName}
              style={{ minHeight: '44px', padding: '0.45rem 0.85rem', borderRadius: '8px', background: '#f59e0b', color: '#18181b', border: 'none', fontWeight: 800, cursor: 'pointer', touchAction: 'manipulation' }}
            >
              {savingName ? '...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setEditingName(false)}
              aria-label="Cancel editing"
              style={{ minHeight: '44px', padding: '0.45rem 0.75rem', borderRadius: '8px', background: '#27272a', color: '#a1a1aa', border: '1px solid #3f3f46', cursor: 'pointer', touchAction: 'manipulation', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </form>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h1 style={{ margin: 0, color: '#fafaf9', fontSize: '1.3rem', fontWeight: 900 }}>{user.name}</h1>
            <button
              type="button"
              onClick={() => {
                setNameInput(user.name || '')
                setEditingName(true)
              }}
              style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', padding: '6px', display: 'inline-flex', alignItems: 'center' }}
              title="Edit Name"
              aria-label="Edit Name"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </button>
          </div>
        )}

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(255,255,255,0.06)', border: `1px solid ${badge.color}44`, borderRadius: '20px', padding: '4px 14px', fontSize: '0.8rem', color: badge.color, fontWeight: 800, marginBottom: '0.5rem' }}>
          <span>{badge.label}</span>
        </div>
        <p style={{ color: '#a1a1aa', fontSize: '0.85rem', margin: '0.25rem 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          +91 {user.phone}
        </p>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem', marginBottom: '1rem' }}>
        {[
          {
            label: 'Total Orders',
            value: myOrders.length,
            icon: (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            )
          },
          {
            label: 'Total Spend',
            value: `₹${totalSpend.toLocaleString()}`,
            icon: (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <line x1="2" y1="10" x2="22" y2="10"/>
              </svg>
            )
          },
          {
            label: 'Completed',
            value: myOrders.filter((o) => o.status === 'delivered').length,
            icon: (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            )
          },
        ].map((s) => (
          <div key={s.label} className="tfg-glass-card" style={{ padding: '0.85rem 0.5rem', textAlign: 'center', borderRadius: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.35rem' }}>{s.icon}</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#f59e0b' }}>{s.value}</div>
            <div style={{ fontSize: '0.68rem', color: '#a1a1aa', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Security & PIN Settings */}
      <div className="tfg-glass-card" style={{ padding: '1.25rem', marginBottom: '1rem', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 2l-2 2m-1.5 1.5L16 7l-1.5-1.5L13 7l-2-2-4 4 1.5 1.5L7 12l-1.5 1.5L7 15l-4 4v3h3l4-4 1.5 1.5L13 14l1.5-1.5L16 14l1.5-1.5L19 14l3-3-4-4 3-3z"/>
            </svg>
            <div>
              <strong style={{ color: '#fafaf9', fontSize: '0.92rem', display: 'block' }}>Account Security PIN</strong>
              <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>Used for quick sign in</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditingPin(!editingPin)}
            style={{ minHeight: '36px', padding: '0.4rem 0.85rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#f59e0b', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', touchAction: 'manipulation' }}
          >
            {editingPin ? 'Cancel' : 'Change PIN'}
          </button>
        </div>

        {editingPin && (
          <form onSubmit={handleSavePin} style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: '#a1a1aa', display: 'block', marginBottom: '3px' }}>New PIN / Password (min 4 chars)</label>
              <input
                type="password"
                required
                maxLength={32}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.slice(0, 32))}
                placeholder="••••••••"
                style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', background: '#121214', border: '1px solid #3f3f46', color: '#fff', fontSize: '1rem', letterSpacing: '0.2em', touchAction: 'manipulation' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', color: '#a1a1aa', display: 'block', marginBottom: '3px' }}>Confirm New PIN / Password</label>
              <input
                type="password"
                required
                maxLength={32}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.slice(0, 32))}
                placeholder="••••••••"
                style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', background: '#121214', border: '1px solid #3f3f46', color: '#fff', fontSize: '1rem', letterSpacing: '0.2em', touchAction: 'manipulation' }}
              />
            </div>
            <button
              type="submit"
              disabled={savingPin}
              style={{ minHeight: '44px', padding: '0.65rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#18181b', border: 'none', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem', touchAction: 'manipulation' }}
            >
              {savingPin ? 'Saving PIN / Password...' : 'Update PIN / Password'}
            </button>
          </form>
        )}
      </div>

      {/* Saved Address Book */}
      <div className="tfg-glass-card" style={{ padding: '1.25rem', marginBottom: '1rem', borderRadius: '16px' }}>
        <h2 style={{ margin: '0 0 0.85rem', fontSize: '0.85rem', color: '#a1a1aa', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          Saved Delivery Addresses ({addresses.length})
        </h2>
        {addresses.length === 0 ? (
          <p style={{ color: '#71717a', fontSize: '0.8rem', margin: 0 }}>No saved addresses. Save one during checkout!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {addresses.map((addr, idx) => (
              <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '0.65rem 0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: '#f59e0b', fontSize: '0.82rem', display: 'block' }}>{addr.label}</strong>
                  <span style={{ color: '#d6d3d1', fontSize: '0.78rem' }}>{addr.address}</span>
                </div>
                <button
                  type="button"
                  onClick={() => deleteAddress(addr.address)}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px', display: 'inline-flex', alignItems: 'center', touchAction: 'manipulation' }}
                  title="Remove Address"
                  aria-label="Remove Address"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Links based on role */}
      {(user.role === 'admin' || user.role === 'seller') && (
        <div className="tfg-glass-card" style={{ padding: '1.25rem', marginBottom: '1rem', borderRadius: '16px' }}>
          <h2 style={{ margin: '0 0 0.85rem', fontSize: '0.85rem', color: '#a1a1aa', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Staff Quick Access</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {user.role === 'admin' && (
              <Link to="/admin" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'rgba(124, 58, 237, 0.15)', border: '1px solid rgba(124, 58, 237, 0.4)', borderRadius: '10px', textDecoration: 'none', color: '#e9d5ff', fontWeight: 700, fontSize: '0.9rem', touchAction: 'manipulation' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Admin Dashboard
              </Link>
            )}
            {user.role === 'admin' && (
              <Link to="/admin/staff" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', textDecoration: 'none', color: '#fafaf9', fontWeight: 700, fontSize: '0.9rem', touchAction: 'manipulation' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Manage Staff & Roles
              </Link>
            )}
            <Link to="/seller/orders" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.35)', borderRadius: '10px', textDecoration: 'none', color: '#fef3c7', fontWeight: 700, fontSize: '0.9rem', touchAction: 'manipulation' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              Kitchen KOT — Live Orders
            </Link>
            <Link to="/seller/products" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', textDecoration: 'none', color: '#fafaf9', fontWeight: 700, fontSize: '0.9rem', touchAction: 'manipulation' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 2v6a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V2"/><path d="M12 11v11"/><path d="M6 2v6"/><path d="M18 2v6"/></svg>
              Menu & Stock Manager
            </Link>
          </div>
        </div>
      )}

      {user.role === 'rider' && (
        <div className="tfg-glass-card" style={{ padding: '1.25rem', marginBottom: '1rem', borderRadius: '16px' }}>
          <Link to="/rider" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'rgba(22, 163, 74, 0.18)', border: '1px solid rgba(34, 197, 94, 0.4)', borderRadius: '10px', textDecoration: 'none', color: '#bbf7d0', fontWeight: 700, fontSize: '0.9rem', touchAction: 'manipulation' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>
            Open Rider Delivery View
          </Link>
        </div>
      )}

      {/* Quick Access Links */}
      <div className="tfg-glass-card" style={{ padding: '1.25rem', marginBottom: '1rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        <Link to="/orders" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', textDecoration: 'none', color: '#fafaf9', fontWeight: 700, fontSize: '0.9rem', touchAction: 'manipulation' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
          {lang === 'bn' ? 'আমার অর্ডার হিস্টোরি' : 'My Order History'}
        </Link>
        <Link to="/support" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', textDecoration: 'none', color: '#f59e0b', fontWeight: 700, fontSize: '0.9rem', touchAction: 'manipulation' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
          {lang === 'bn' ? 'কাস্টমার সাপোর্ট ও হেল্পডেস্ক' : 'Customer Support & Helpdesk'}
        </Link>
      </div>

      {/* Sign Out */}
      <button
        type="button"
        onClick={logout}
        style={{ width: '100%', minHeight: '48px', padding: '0.85rem', borderRadius: '14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5', fontWeight: 800, cursor: 'pointer', fontSize: '0.95rem', touchAction: 'manipulation' }}
      >
        Sign Out
      </button>
    </div>
  )
}
