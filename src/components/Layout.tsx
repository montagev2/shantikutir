import { useState, useEffect } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useStore } from '../context/StoreContext'
import {
  STORE_NAME,
  STORE_TAGLINE,
  SUPPORT_WHATSAPP,
  GOOGLE_MAPS_LOCATION_URL,
} from '../lib/business'
import Toast from './Toast'
import PartyBookingModal from './PartyBookingModal'
import PwaInstallPrompt from './PwaInstallPrompt'
import CookieConsent from './CookieConsent'
import CustomerNotificationBanner from './CustomerNotificationBanner'
import CustomerWelcomePromoModal from './CustomerWelcomePromoModal'

export default function Layout() {
  const { user, profile } = useAuth()
  const currentUser = user || profile
  const { cartCount, orders, lang, setLang } = useStore()
  const [partyModal, setPartyModal] = useState(false)
  const [isOnline, setIsOnline] = useState<boolean>(() => (typeof navigator !== 'undefined' ? navigator.onLine : true))

  useEffect(() => {
    let offlineTimer: ReturnType<typeof setTimeout> | null = null

    const handleOnline = () => {
      if (offlineTimer) clearTimeout(offlineTimer)
      setIsOnline(true)
    }

    const handleOffline = () => {
      if (offlineTimer) clearTimeout(offlineTimer)
      offlineTimer = setTimeout(() => {
        setIsOnline(false)
      }, 3000)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      if (offlineTimer) clearTimeout(offlineTimer)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const isRider = currentUser?.role === 'rider'
  const isStaff = currentUser && ['admin', 'seller', 'staff'].includes(currentUser.role)
  const activeKitchenOrders = orders.filter((o) => ['pending', 'confirmed', 'cooking'].includes(o.status))

  return (
    <div className="app-shell" style={{ minHeight: '100vh', background: 'var(--bg-main, #0c0b0a)', color: '#fafaf9', position: 'relative' }}>
      <Toast />
      {!isOnline && (
        <div style={{ background: '#78350f', borderBottom: '1px solid #d97706', color: '#fef3c7', padding: '0.4rem 1rem', fontSize: '0.78rem', textAlign: 'center', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.58 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
          Offline Mode - Browsing Cached Menu. Changes will sync once back online.
        </div>
      )}
      {!isRider && <CustomerNotificationBanner />}
      {!isRider && <CustomerWelcomePromoModal />}
      <CookieConsent />
      <PwaInstallPrompt />

      {/* Top Highway Notification Strip (Clean Luxury, Identical to TFG) */}
      <div
        className="top-banner"
        style={{
          background: 'linear-gradient(90deg, #141210 0%, #1c1815 50%, #141210 100%)',
          borderBottom: '1px solid rgba(245, 158, 11, 0.15)',
          padding: '0.55rem 1.25rem',
          fontSize: '0.78rem',
          color: 'var(--text-muted, #a1a1aa)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '0',
          minHeight: '44px',
        }}
      >
        <a
          href={GOOGLE_MAPS_LOCATION_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="Open Shanti Kutir in Google Maps"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            minWidth: 0,
            textDecoration: 'none',
            cursor: 'pointer',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: 'var(--gold, #d97706)', flexShrink: 0 }}>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span className="top-banner-address" style={{ fontSize: '0.78rem', color: '#e4e4e7', fontWeight: 600 }}>
            {isRider
              ? 'Rider Partner Terminal'
              : 'Tamluk-Nandakumar Road · NH-116 Highway Resort'}
          </span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--gold, #d97706)', opacity: 0.7, flexShrink: 0 }}>
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
          {!isRider && (
            <button
              type="button"
              onClick={() => setPartyModal(true)}
              style={{
                padding: '0.35rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 800,
                backgroundColor: 'var(--gold, #d97706)',
                backgroundImage: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#111',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
              }}
            >
              Book Table
            </button>
          )}
          <div style={{ display: 'flex', gap: '0.25rem', background: '#27272a', borderRadius: '6px', padding: '2px' }}>
            <button
              type="button"
              onClick={() => setLang('en')}
              style={{
                background: lang === 'en' ? 'var(--gold, #d97706)' : 'transparent',
                color: lang === 'en' ? '#18181b' : '#a1a1aa',
                border: 'none',
                padding: '3px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: '0.72rem',
              }}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang('bn')}
              style={{
                background: lang === 'bn' ? 'var(--gold, #d97706)' : 'transparent',
                color: lang === 'bn' ? '#18181b' : '#a1a1aa',
                border: 'none',
                padding: '3px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: '0.72rem',
              }}
            >
              বাংলা
            </button>
          </div>
        </div>
      </div>

      {/* Main Glassmorphic Header */}
      <header
        className="site-header"
        style={{
          background: 'rgba(18, 16, 14, 0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          padding: '0.75rem 1.25rem',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '1rem' }}>
          {/* Official Restaurant Logo & Title */}
          <Link to={isRider ? '/rider' : '/'} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.65rem', flexShrink: 0, minWidth: 0 }}>
            <img
              src="/sk-logo.svg"
              alt="Shanti Kutir Logo"
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: isRider ? '2px solid #10b981' : '2px solid var(--primary, #f59e0b)',
                boxShadow: isRider ? '0 4px 16px rgba(16, 185, 129, 0.35)' : '0 4px 14px rgba(245, 158, 11, 0.35)',
                flexShrink: 0,
              }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <strong className="brand-heading" style={{ fontSize: '1.15rem', color: '#fff', display: 'block', letterSpacing: '0.04em', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {STORE_NAME}
                </strong>
                <span
                  style={{
                    fontSize: '0.65rem',
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: 'var(--gold, #d97706)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    padding: '0.1rem 0.45rem',
                    borderRadius: '12px',
                    fontWeight: 700,
                  }}
                >
                  HIGHWAY
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: isRider ? '#34d399' : 'var(--gold, #d97706)', fontWeight: 600, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {isRider ? 'Rider Delivery Terminal' : STORE_TAGLINE}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation (Matching TFG's exact Tabs) */}
          <nav className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            {isRider ? (
              <>
                <NavLink to="/rider" style={({ isActive }) => ({ color: isActive ? '#34d399' : '#a1a1aa', textDecoration: 'none', fontWeight: 700, fontSize: '0.88rem' })}>
                  Deliveries
                </NavLink>
                <NavLink to="/track" style={({ isActive }) => ({ color: isActive ? '#34d399' : '#a1a1aa', textDecoration: 'none', fontWeight: 700, fontSize: '0.88rem' })}>
                  Order Tracker
                </NavLink>
                <NavLink to="/orders" style={({ isActive }) => ({ color: isActive ? '#34d399' : '#a1a1aa', textDecoration: 'none', fontWeight: 700, fontSize: '0.88rem' })}>
                  History
                </NavLink>
                <NavLink to="/profile" style={({ isActive }) => ({ color: isActive ? '#34d399' : '#a1a1aa', textDecoration: 'none', fontWeight: 700, fontSize: '0.88rem' })}>
                  {currentUser?.name?.split(' ')[0] || 'Profile'}
                </NavLink>
              </>
            ) : (
              <>
                <NavLink to="/" style={({ isActive }) => ({ color: isActive ? 'var(--gold, #d97706)' : '#d4d4d8', textDecoration: 'none', fontWeight: 700, fontSize: '0.88rem' })}>
                  {lang === 'bn' ? 'মেনু' : 'Menu'}
                </NavLink>
                <NavLink to="/track" style={({ isActive }) => ({ color: isActive ? 'var(--gold, #d97706)' : '#d4d4d8', textDecoration: 'none', fontWeight: 700, fontSize: '0.88rem' })}>
                  {lang === 'bn' ? 'লাইভ ট্র্যাক' : 'Live Track'}
                </NavLink>
                <NavLink to="/orders" style={({ isActive }) => ({ color: isActive ? 'var(--gold, #d97706)' : '#d4d4d8', textDecoration: 'none', fontWeight: 700, fontSize: '0.88rem' })}>
                  {lang === 'bn' ? 'অর্ডার হিস্টোরি' : 'History'}
                </NavLink>
                <NavLink to="/support" style={({ isActive }) => ({ color: isActive ? 'var(--gold, #d97706)' : '#d4d4d8', textDecoration: 'none', fontWeight: 700, fontSize: '0.88rem' })}>
                  {lang === 'bn' ? 'সাপোর্ট' : 'Support'}
                </NavLink>
                <NavLink to="/cart" style={({ isActive }) => ({ color: isActive ? 'var(--gold, #d97706)' : '#d4d4d8', textDecoration: 'none', fontWeight: 700, fontSize: '0.88rem', position: 'relative' })}>
                  {lang === 'bn' ? 'কার্ট' : 'Cart'}
                  {cartCount > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-14px',
                        background: 'var(--primary, #c2410c)',
                        color: '#fff',
                        fontSize: '0.68rem',
                        fontWeight: 900,
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        display: 'grid',
                        placeItems: 'center',
                        boxShadow: '0 2px 6px rgba(194, 65, 12, 0.4)',
                      }}
                    >
                      {cartCount}
                    </span>
                  )}
                </NavLink>

                {currentUser ? (
                  <NavLink
                    to="/profile"
                    style={({ isActive }) => ({
                      color: isActive ? 'var(--gold, #d97706)' : '#e4e4e7',
                      textDecoration: 'none',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: 'rgba(255, 255, 255, 0.06)',
                      padding: '0.35rem 0.8rem',
                      borderRadius: '20px',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                    })}
                  >
                    <span>{currentUser.name?.split(' ')[0] || 'User'}</span>
                  </NavLink>
                ) : (
                  <NavLink
                    to="/auth"
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#fafaf9',
                      padding: '0.4rem 0.95rem',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                    }}
                  >
                    {lang === 'bn' ? 'লগইন' : 'Sign In'}
                  </NavLink>
                )}

                {/* Staff / Admin Portal Access (Golden Button) */}
                {isStaff && (
                  <NavLink
                    to={currentUser?.role === 'admin' ? '/admin' : '/seller'}
                    style={{
                      marginLeft: '0.5rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '0.4rem 0.85rem',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      backgroundColor: activeKitchenOrders.length > 0 ? '#dc2626' : '#d97706',
                      backgroundImage: activeKitchenOrders.length > 0 ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                      color: activeKitchenOrders.length > 0 ? '#ffffff' : '#111111',
                      textDecoration: 'none',
                    }}
                    title="Staff Management Portal"
                  >
                    <span>{currentUser?.role === 'admin' ? 'Admin' : 'Kitchen'}</span>
                    {activeKitchenOrders.length > 0 && (
                      <span style={{ background: '#ffffff', color: '#18181b', borderRadius: '4px', padding: '1px 6px', fontSize: '0.7rem', fontWeight: 900 }}>
                        {activeKitchenOrders.length}
                      </span>
                    )}
                  </NavLink>
                )}
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Main Page Body */}
      <main style={{ minHeight: 'calc(100vh - 160px)', paddingBottom: '3rem' }}>
        <Outlet />
      </main>

      {/* Luxury Footer with Authentic Shanti Kutir Heritage */}
      <footer
        style={{
          background: '#090807',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          color: '#a1a1aa',
          padding: '3rem 1.25rem 2rem',
          fontSize: '0.85rem',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.8rem' }}>
              <img src="/sk-logo.svg" alt="Shanti Kutir Logo" style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
              <strong className="brand-heading" style={{ color: '#fff', fontSize: '1.1rem' }}>{STORE_NAME}</strong>
            </div>
            <p style={{ lineHeight: 1.5, margin: 0, color: '#a1a1aa' }}>
              Authentic Bengali heritage dining, garden cottages, and charcoal tandoor on Tamluk-Nandakumar Highway NH-116.
            </p>
          </div>
          <div>
            <h4 style={{ color: '#fff', margin: '0 0 0.8rem', fontSize: '0.92rem', fontWeight: 800 }}>Explore</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <Link to="/" style={{ color: '#a1a1aa', textDecoration: 'none' }}>Dining Menu</Link>
              <Link to="/track" style={{ color: '#a1a1aa', textDecoration: 'none' }}>Live Delivery Tracker</Link>
              <Link to="/orders" style={{ color: '#a1a1aa', textDecoration: 'none' }}>Order History</Link>
              <Link to="/support" style={{ color: '#a1a1aa', textDecoration: 'none' }}>Help &amp; Concierge</Link>
            </div>
          </div>
          <div>
            <h4 style={{ color: '#fff', margin: '0 0 0.8rem', fontSize: '0.92rem', fontWeight: 800 }}>Highway Resort</h4>
            <p style={{ margin: '0 0 0.4rem', color: '#a1a1aa' }}>Open Daily: 10:00 AM – 11:30 PM</p>
            <p style={{ margin: '0 0 0.4rem', color: '#a1a1aa' }}>Tamluk-Nandakumar Road, Purba Medinipur, WB</p>
            <a href={GOOGLE_MAPS_LOCATION_URL} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold, #d97706)', textDecoration: 'none', fontWeight: 700 }}>
              Get Driving Directions &rarr;
            </a>
          </div>
        </div>
        <div style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <span style={{ fontSize: '0.78rem' }}>&copy; {new Date().getFullYear()} Shanti Kutir Heritage Resort. All rights reserved.</span>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem' }}>
            <Link to="/privacy" style={{ color: '#71717a', textDecoration: 'none' }}>Privacy Policy</Link>
            <Link to="/terms" style={{ color: '#71717a', textDecoration: 'none' }}>Terms of Service</Link>
            <Link to="/refund" style={{ color: '#71717a', textDecoration: 'none' }}>Refund Policy</Link>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Concierge Button */}
      <a
        href={`https://wa.me/${SUPPORT_WHATSAPP}?text=Hello%20Shanti%20Kutir,%20I%20would%20like%20to%20inquire%20about%20dining%20and%20cottage%20reservations.`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '54px',
          height: '54px',
          borderRadius: '50%',
          backgroundColor: '#25d366',
          display: 'grid',
          placeItems: 'center',
          boxShadow: '0 8px 24px rgba(37, 211, 102, 0.45)',
          zIndex: 99,
          cursor: 'pointer',
          transition: 'transform 0.2s ease',
        }}
        title="Chat with Shanti Kutir Concierge"
        aria-label="WhatsApp Concierge"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="#ffffff">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.54 1.771.82 2.791.82 3.181 0 5.768-2.587 5.768-5.766.001-3.181-2.585-5.766-5.768-5.766zm9.969 5.766c0 5.505-4.495 10-10 10-1.748 0-3.385-.453-4.819-1.242l-5.181 1.304 1.328-4.852c-.878-1.503-1.328-3.219-1.328-5.21 0-5.505 4.495-10 10-10 5.505 0 10 4.495 10 10z"/>
        </svg>
      </a>

      {/* Table & Party Booking Modal */}
      {partyModal && <PartyBookingModal onClose={() => setPartyModal(false)} />}
    </div>
  )
}
