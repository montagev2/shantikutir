import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function SellerHome() {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <header style={{ background: 'var(--color-teak)', color: '#fff', padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: '1.1rem' }}>
          Staff Panel
        </span>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.82rem', opacity: 0.8 }}>{profile?.name}</span>
          <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: '0.4rem', padding: '0.3rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer' }}>Logout</button>
        </div>
      </header>
      <nav style={{ display: 'flex', borderBottom: '2px solid #e7e5e4', background: '#fff' }}>
        {[
          { to: '/seller', label: 'Orders' },
          { to: '/seller/products', label: 'Products' },
        ].map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            style={{
              padding: '0.7rem 1.25rem',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              color: pathname === to ? 'var(--color-terracotta)' : '#78716c',
              borderBottom: pathname === to ? '2px solid var(--color-terracotta)' : '2px solid transparent',
              marginBottom: '-2px',
            }}
          >
            {label}
          </Link>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
