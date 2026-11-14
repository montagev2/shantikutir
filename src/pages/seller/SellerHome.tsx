import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { STORE_NAME } from '../../lib/business'

export default function SellerHome() {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  function handleLogout() {
    logout()
    navigate('/')
  }

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
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--gold) 100%)',
              color: '#fff',
              fontWeight: 800,
              padding: '0.25rem 0.6rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
            }}
          >
            KITCHEN
          </div>
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 800, fontSize: '1.2rem' }}>
            {STORE_NAME} Staff Portal
          </span>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--gold)', fontWeight: 600 }}>
             {profile?.name || profile?.phone} ({profile?.role})
          </span>
          <Link to="/" className="btn-ghost" style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}>
            Customer View
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

      {/* Tabs */}
      <nav
        style={{
          display: 'flex',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--glass-border)',
          padding: '0 1.5rem',
        }}
      >
        {[
          { to: '/seller', label: ' Active Orders Queue' },
          { to: '/seller/products', label: ' Product Catalog & Stock' },
        ].map(({ to, label }) => {
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
