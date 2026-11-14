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
    <div className="app-shell" style={{ minHeight: '100vh', background: 'var(--bg-main, #0a0908)', color: '#fbfaf7', position: 'relative' }}>
      <Toast />
      {!isOnline && (
        <div style={{ background: '#78350f', borderBottom: '1px solid #c89838', color: '#fef3c7', padding: '0.4rem 1rem', fontSize: '0.78rem', textAlign: 'center', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.58 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
          Offline Mode - Browsing Cached Menu. Changes will sync once back online.
        </div>
      )}
      {!isRider && <CustomerNotificationBanner />}
      {!isRider && <CustomerWelcomePromoModal />}
      <CookieConsent />
      <PwaInstallPrompt />

      {/* Royal Bengal Heritage Top Bar */}
      <div
        className="top-banner"
        style={{
          background: 'linear-gradient(90deg, #100e0c 0%, #1a1612 50%, #100e0c 100%)',
          borderBottom: '1px solid rgba(223, 177, 91, 0.22)',
          padding: '0.5rem 1.25rem',
          fontSize: '0.78rem',
          color: 'var(--text-muted, #a8a29e)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          minHeight: '42px',
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
            gap: '0.5rem',
            minWidth: 0,
            textDecoration: 'none',
            cursor: 'pointer',
          }}
        >
          {/* Traditional Lotus Motif */}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#dfb15b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 2a9 9 0 0 0-9 9c0 4.97 4.03 9 9 9s9-4.03 9-9a9 9 0 0 0-9-9z"/>
            <path d="M12 6c-2 2-3 4-3 6 0 2 1 3 3 4 2-1 3-2 3-4 0-2-1-4-3-6z"/>
          </svg>
          <span style={{ fontSize: '0.78rem', color: '#f3d085', fontWeight: 700, letterSpacing: '0.02em' }}>
            {isRider
              ? 'Rider Partner Terminal · শান্তিকুটির'
              : 'নমস্কার · স্বাগতম শান্তিকুটিরে (NH-116 Highway Resort, Tamluk)'}
          </span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#dfb15b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8, flexShrink: 0 }}>
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          {!isRider && (
            <button
              type="button"
              onClick={() => setPartyModal(true)}
              className="sk-btn-gold"
              style={{
                padding: '0.35rem 0.95rem',
                fontSize: '0.75rem',
                letterSpacing: '0.02em',
              }}
            >
              {lang === 'bn' ? 'টেবিল বুকিং' : 'Book Table'}
            </button>
          )}

          {/* Bilingual Switcher */}
          <div style={{ display: 'flex', gap: '2px', background: '#25211c', borderRadius: '6px', padding: '2px', border: '1px solid rgba(223, 177, 91, 0.2)' }}>
            <button
              type="button"
              onClick={() => setLang('en')}
              style={{
                background: lang === 'en' ? 'linear-gradient(135deg, #dfb15b, #b88628)' : 'transparent',
                color: lang === 'en' ? '#12100e' : '#a8a29e',
                border: 'none',
                padding: '3px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: '0.70rem',
              }}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang('bn')}
              style={{
                background: lang === 'bn' ? 'linear-gradient(135deg, #dfb15b, #b88628)' : 'transparent',
                color: lang === 'bn' ? '#12100e' : '#a8a29e',
                border: 'none',
                padding: '3px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: '0.70rem',
              }}
            >
              বাংলা
            </button>
          </div>
        </div>
      </div>

      {/* Main Heritage Header */}
      <header
        className="site-header"
        style={{
          background: 'rgba(16, 14, 12, 0.94)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(223, 177, 91, 0.16)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          padding: '0.85rem 1.25rem',
        }}
      >
        <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '1rem' }}>
          {/* Authentic Shanti Kutir Heritage Crest & Title */}
          <Link to={isRider ? '/rider' : '/'} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0, minWidth: 0 }}>
            <div style={{ position: 'relative', width: '46px', height: '46px', flexShrink: 0 }}>
              <img
                src="/sk-logo.svg"
                alt="Shanti Kutir Logo"
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: isRider ? '2px solid #10b981' : '2px solid #dfb15b',
                  boxShadow: '0 4px 18px rgba(223, 177, 91, 0.35)',
                }}
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <strong className="sk-gold-text brand-heading" style={{ fontSize: '1.25rem', display: 'block', letterSpacing: '0.04em', fontWeight: 900, whiteSpace: 'nowrap' }}>
                  {STORE_NAME}
                </strong>
                <span
                  style={{
                    fontSize: '0.62rem',
                    background: 'rgba(223, 177, 91, 0.12)',
                    color: '#dfb15b',
                    border: '1px solid rgba(223, 177, 91, 0.35)',
                    padding: '0.12rem 0.5rem',
                    borderRadius: '12px',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                  }}
                >
                  HIGHWAY RESORT
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#c5b8a5', fontWeight: 600, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {isRider ? 'Rider Delivery Terminal' : (lang === 'bn' ? 'শান্তি ও স্বাদের মেলবন্ধন · খাঁটি বাঙালি ভোজন' : STORE_TAGLINE)}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Tabs */}
          <nav className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '1.4rem' }}>
            {isRider ? (
              <>
                <NavLink to="/rider" style={({ isActive }) => ({ color: isActive ? '#34d399' : '#a8a29e', textDecoration: 'none', fontWeight: 700, fontSize: '0.88rem' })}>
                  Deliveries
                </NavLink>
                <NavLink to="/track" style={({ isActive }) => ({ color: isActive ? '#34d399' : '#a8a29e', textDecoration: 'none', fontWeight: 700, fontSize: '0.88rem' })}>
                  Order Tracker
                </NavLink>
                <NavLink to="/orders" style={({ isActive }) => ({ color: isActive ? '#34d399' : '#a8a29e', textDecoration: 'none', fontWeight: 700, fontSize: '0.88rem' })}>
                  History
                </NavLink>
                <NavLink to="/profile" style={({ isActive }) => ({ color: isActive ? '#34d399' : '#a8a29e', textDecoration: 'none', fontWeight: 700, fontSize: '0.88rem' })}>
                  {currentUser?.name?.split(' ')[0] || 'Profile'}
                </NavLink>
              </>
            ) : (
              <>
                <NavLink
                  to="/"
                  style={({ isActive }) => ({
                    color: isActive ? '#f3d085' : '#d5cfc5',
                    textDecoration: 'none',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    borderBottom: isActive ? '2px solid #dfb15b' : '2px solid transparent',
                    paddingBottom: '4px',
                    transition: 'all 0.2s ease',
                  })}
                >
                  {lang === 'bn' ? 'ভোজন তালিকা' : 'Dining Menu'}
                </NavLink>
                <NavLink
                  to="/track"
                  style={({ isActive }) => ({
                    color: isActive ? '#f3d085' : '#d5cfc5',
                    textDecoration: 'none',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    borderBottom: isActive ? '2px solid #dfb15b' : '2px solid transparent',
                    paddingBottom: '4px',
                    transition: 'all 0.2s ease',
                  })}
                >
                  {lang === 'bn' ? 'লাইভ ট্র্যাকার' : 'Live Track'}
                </NavLink>
                <NavLink
                  to="/orders"
                  style={({ isActive }) => ({
                    color: isActive ? '#f3d085' : '#d5cfc5',
                    textDecoration: 'none',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    borderBottom: isActive ? '2px solid #dfb15b' : '2px solid transparent',
                    paddingBottom: '4px',
                    transition: 'all 0.2s ease',
                  })}
                >
                  {lang === 'bn' ? 'অর্ডার খতিয়ান' : 'Past Orders'}
                </NavLink>
                <NavLink
                  to="/support"
                  style={({ isActive }) => ({
                    color: isActive ? '#f3d085' : '#d5cfc5',
                    textDecoration: 'none',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    borderBottom: isActive ? '2px solid #dfb15b' : '2px solid transparent',
                    paddingBottom: '4px',
                    transition: 'all 0.2s ease',
                  })}
                >
                  {lang === 'bn' ? 'অতিথি সেবা' : 'Concierge'}
                </NavLink>
                <NavLink
                  to="/cart"
                  style={({ isActive }) => ({
                    color: isActive ? '#f3d085' : '#d5cfc5',
                    textDecoration: 'none',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    position: 'relative',
                    borderBottom: isActive ? '2px solid #dfb15b' : '2px solid transparent',
                    paddingBottom: '4px',
                    transition: 'all 0.2s ease',
                  })}
                >
                  {lang === 'bn' ? 'কার্ট' : 'Cart'}
                  {cartCount > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-14px',
                        background: 'linear-gradient(135deg, #dc2626, #991b1b)',
                        color: '#fff',
                        fontSize: '0.68rem',
                        fontWeight: 900,
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        display: 'grid',
                        placeItems: 'center',
                        boxShadow: '0 2px 8px rgba(220, 38, 38, 0.45)',
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
                      color: isActive ? '#f3d085' : '#f5f5f4',
                      textDecoration: 'none',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: 'rgba(223, 177, 91, 0.08)',
                      padding: '0.35rem 0.85rem',
                      borderRadius: '20px',
                      border: '1px solid rgba(223, 177, 91, 0.25)',
                    })}
                  >
                    <span>{currentUser.name?.split(' ')[0] || 'Guest'}</span>
                  </NavLink>
                ) : (
                  <NavLink
                    to="/auth"
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(223, 177, 91, 0.3)',
                      color: '#f3d085',
                      padding: '0.4rem 1rem',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                    }}
                  >
                    {lang === 'bn' ? 'লগইন' : 'Sign In'}
                  </NavLink>
                )}

                {/* Staff / Manager Medallion Button */}
                {isStaff && (
                  <NavLink
                    to={currentUser?.role === 'admin' ? '/admin' : '/seller'}
                    className="sk-btn-gold"
                    style={{
                      padding: '0.4rem 0.85rem',
                      fontSize: '0.78rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                    title="Staff Management Portal"
                  >
                    <span>{currentUser?.role === 'admin' ? 'Manager Portal' : 'Kitchen Bar'}</span>
                    {activeKitchenOrders.length > 0 && (
                      <span style={{ background: '#b91c1c', color: '#ffffff', borderRadius: '4px', padding: '1px 6px', fontSize: '0.68rem', fontWeight: 900 }}>
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

      {/* Royal Bengal Heritage Footer */}
      <footer
        style={{
          background: '#070605',
          borderTop: '1px solid rgba(223, 177, 91, 0.18)',
          color: '#a8a29e',
          padding: '3.5rem 1.25rem 2rem',
          fontSize: '0.85rem',
        }}
      >
        <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2.5rem', marginBottom: '2.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.8rem' }}>
              <img src="/sk-logo.svg" alt="Shanti Kutir Logo" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
              <div>
                <strong className="sk-gold-text brand-heading" style={{ fontSize: '1.2rem', display: 'block' }}>{STORE_NAME}</strong>
                <span style={{ fontSize: '0.72rem', color: '#c5b8a5' }}>শান্তিকুটির · হেরিটেজ রিসর্ট</span>
              </div>
            </div>
            <p style={{ lineHeight: 1.6, margin: 0, color: '#a8a29e', fontSize: '0.84rem' }}>
              তমলুক-নন্দকুমার জাতীয় সড়ক (NH-116)-এর পাশে প্রাকৃতিক পরিবেশে খাঁটি বাঙালি জমিদারী রসনা ও কয়লার তন্দুর ডাইনিং।
            </p>
          </div>
          <div>
            <h4 style={{ color: '#f3d085', margin: '0 0 0.8rem', fontSize: '0.92rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              আমাদের বৈশিষ্ট্য
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.84rem' }}>
              <Link to="/" style={{ color: '#d5cfc5', textDecoration: 'none' }}>খাস ভোজন তালিকা (Royal Menu)</Link>
              <Link to="/track" style={{ color: '#d5cfc5', textDecoration: 'none' }}>লাইভ ডেলিভারি ট্র্যাকার (Radar)</Link>
              <Link to="/orders" style={{ color: '#d5cfc5', textDecoration: 'none' }}>পূর্ববর্তী অর্ডার খতিয়ান (History)</Link>
              <Link to="/support" style={{ color: '#d5cfc5', textDecoration: 'none' }}>অতিথি পরিষেবা ও সাহায্য (Concierge)</Link>
            </div>
          </div>
          <div>
            <h4 style={{ color: '#f3d085', margin: '0 0 0.8rem', fontSize: '0.92rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              রিসর্ট সময়সূচি ও অবস্থান
            </h4>
            <p style={{ margin: '0 0 0.4rem', color: '#d5cfc5' }}>প্রতিদিন খোলা: সকাল ১০:০০ – রাত ১১:৩০</p>
            <p style={{ margin: '0 0 0.4rem', color: '#d5cfc5' }}>তমলুক-নন্দকুমার রোড, পূর্ব মেদিনীপুর, পশ্চিমবঙ্গ</p>
            <a href={GOOGLE_MAPS_LOCATION_URL} target="_blank" rel="noopener noreferrer" style={{ color: '#dfb15b', textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
              গুগল ম্যাপে লোকেশন দেখুন &rarr;
            </a>
          </div>
        </div>
        <div style={{ maxWidth: '1240px', margin: '0 auto', paddingTop: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <span style={{ fontSize: '0.78rem', color: '#78716c' }}>&copy; {new Date().getFullYear()} Shanti Kutir (শান্তিকুটির) Heritage Resort. All rights reserved.</span>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem' }}>
            <Link to="/privacy" style={{ color: '#78716c', textDecoration: 'none' }}>Privacy Policy</Link>
            <Link to="/terms" style={{ color: '#78716c', textDecoration: 'none' }}>Terms of Service</Link>
            <Link to="/refund" style={{ color: '#78716c', textDecoration: 'none' }}>Refund Policy</Link>
          </div>
        </div>
      </footer>

      {/* Floating Royal Concierge WhatsApp Widget */}
      <a
        href={`https://wa.me/${SUPPORT_WHATSAPP}?text=Hello%20Shanti%20Kutir,%20I%20would%20like%20to%20inquire%20about%20dining%20and%20cottage%20reservations.`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#15803d',
          backgroundImage: 'linear-gradient(135deg, #22c55e, #15803d)',
          display: 'grid',
          placeItems: 'center',
          boxShadow: '0 8px 24px rgba(22, 163, 74, 0.45)',
          zIndex: 99,
          cursor: 'pointer',
          transition: 'transform 0.2s ease',
          border: '2px solid rgba(255, 255, 255, 0.3)',
        }}
        title="Chat with Shanti Kutir Concierge"
        aria-label="WhatsApp Concierge"
      >
        <svg width="30" height="30" viewBox="0 0 24 24" fill="#ffffff">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.54 1.771.82 2.791.82 3.181 0 5.768-2.587 5.768-5.766.001-3.181-2.585-5.766-5.768-5.766zm9.969 5.766c0 5.505-4.495 10-10 10-1.748 0-3.385-.453-4.819-1.242l-5.181 1.304 1.328-4.852c-.878-1.503-1.328-3.219-1.328-5.21 0-5.505 4.495-10 10-10 5.505 0 10 4.495 10 10z"/>
        </svg>
      </a>

      {/* Table & Party Booking Modal */}
      {partyModal && <PartyBookingModal onClose={() => setPartyModal(false)} />}
    </div>
  )
}
