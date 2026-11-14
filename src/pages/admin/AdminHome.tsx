import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { STORE_NAME } from '../../lib/business'

export default function AdminHome() {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  function handleLogout() {
    logout()
    navigate('/')
  }

  const tabs = [
    { to: '/admin', label: ' Live Orders' },
    { to: '/admin/products', label: ' Products Catalog' },
    { to: '/admin/users', label: ' User Accounts' },
    { to: '/admin/coupons', label: '️ Coupons & Promos' },
    { to: '/admin/staff', label: ' Staff Access' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: '#fff' }}>
      <header
        className="glass-panel"
        style={{
          padding: '0.85rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--glass-border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              background: 'linear-gradient(135deg, var(--gold) 0%, #b45309 100%)',
              color: '#0c0b0a',
              fontWeight: 900,
              padding: '0.25rem 0.65rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
            }}
          >
            ADMIN
          </div>
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 800, fontSize: '1.25rem' }}>
            {STORE_NAME} Master Control
          </span>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--gold)', fontWeight: 600 }}>
             {profile?.name || profile?.phone}
          </span>
          <Link to="/" className="btn-ghost" style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}>
            Front Store
          </Link>
          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--rose)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.35rem 0.75rem',
              fontSize: '0.78rem',
              fontWeight: 600,
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Admin Navigation Tabs */}
      <nav
        style={{
          display: 'flex',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--glass-border)',
          padding: '0 1.5rem',
          overflowX: 'auto',
        }}
      >
        {tabs.map(({ to, label }) => {
          const active = pathname === to
          return (
            <Link
              key={to}
              to={to}
              style={{
                padding: '0.85rem 1.25rem',
                fontWeight: 700,
                fontSize: '0.88rem',
                color: active ? 'var(--gold)' : 'var(--text-muted)',
                borderBottom: active ? '2px solid var(--gold)' : '2px solid transparent',
                marginBottom: '-1px',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </Link>
          )
        })}
      </nav>

      <main style={{ padding: '1.5rem' }}>
        <Outlet />
      </main>
    </div>
  )
}
