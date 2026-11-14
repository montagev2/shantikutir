import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { STORE_NAME, SUPPORT_PHONE, SUPPORT_WHATSAPP, MAX_DELIVERY_RADIUS_KM, MIN_ORDER_AMOUNT } from '../lib/business'

type TabType = 'privacy' | 'terms' | 'refund' | 'delivery'

export default function Legal() {
  const [searchParams] = useSearchParams()
  const initialTab = (searchParams.get('tab') as TabType) || 'privacy'
  const [activeTab, setActiveTab] = useState<TabType>(initialTab)

  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabType
    if (tabParam && ['privacy', 'terms', 'refund', 'delivery'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    {
      id: 'privacy',
      label: 'Privacy Policy',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      )
    },
    {
      id: 'terms',
      label: 'Terms of Service',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
      )
    },
    {
      id: 'refund',
      label: 'Refund Policy',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
          <line x1="1" y1="10" x2="23" y2="10"/>
        </svg>
      )
    },
    {
      id: 'delivery',
      label: 'Delivery Policy',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="18.5" cy="17.5" r="3.5"/>
          <circle cx="5.5" cy="17.5" r="3.5"/>
          <circle cx="15" cy="5" r="1"/>
          <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
        </svg>
      )
    },
  ]

  const panelStyle: React.CSSProperties = {
    background: 'rgba(24, 24, 27, 0.75)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '18px',
    padding: '1.25rem 1.35rem',
    color: '#d4d4d8',
    lineHeight: 1.65,
    fontSize: '0.84rem',
    backdropFilter: 'blur(16px)',
    boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
  }

  const headingStyle: React.CSSProperties = {
    color: '#fafaf9',
    fontSize: '1.15rem',
    fontWeight: 800,
    marginTop: 0,
    marginBottom: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    letterSpacing: '-0.01em',
  }

  const subHeadingStyle: React.CSSProperties = {
    color: '#f59e0b',
    fontSize: '0.88rem',
    fontWeight: 800,
    marginTop: '1rem',
    marginBottom: '0.35rem',
    letterSpacing: '0.01em',
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', paddingBottom: '4.5rem' }}>
      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.1rem' }}>
        <img
          src="/sk-logo.png"
          alt="Shanti Kutir Logo"
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            objectFit: 'cover',
            border: '1.5px solid var(--primary)',
            boxShadow: '0 4px 16px rgba(245, 158, 11, 0.25)',
          }}
        />
        <div>
          <h1 style={{ fontSize: '1.25rem', color: '#fafaf9', margin: 0, fontWeight: 900, letterSpacing: '-0.02em' }}>
            {STORE_NAME} Trust & Legal Center
          </h1>
          <span style={{ fontSize: '0.74rem', color: '#a1a1aa' }}>
            Official Compliance & Customer Protection Â· Tamluk-Nandakumar Hub
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '4px',
          marginBottom: '1rem',
          background: 'rgba(18, 18, 20, 0.9)',
          padding: '3px',
          borderRadius: '14px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '0.65rem 0.35rem',
              minHeight: '48px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === t.id ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'transparent',
              color: activeTab === t.id ? '#18181b' : '#a1a1aa',
              fontWeight: 800,
              fontSize: '0.72rem',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              transition: 'all 0.18s ease',
              touchAction: 'manipulation',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: Privacy Policy */}
      {activeTab === 'privacy' && (
        <div style={panelStyle}>
          <h2 style={headingStyle}>Privacy Policy</h2>
          <p>
            At <strong>{STORE_NAME}</strong>, we take the confidentiality and privacy of our diners very seriously.
            This policy outlines how your data is collected, protected, and used when placing food orders online or via our in-resort digital services.
          </p>

          <h3 style={subHeadingStyle}>1. Data We Collect</h3>
          <p>We only collect information necessary to fulfill your food order:</p>
          <ul style={{ paddingLeft: '1.25rem', margin: '0 0 1rem' }}>
            <li><strong>Customer Name & Mobile Number:</strong> Used to confirm your order and provide live kitchen status updates.</li>
            <li><strong>Delivery Address & GPS Coordinates:</strong> Collected strictly with your device permission to confirm delivery eligibility within our strict {MAX_DELIVERY_RADIUS_KM} km radius from Tamluk-Nandakumar hub.</li>
            <li><strong>Seating Preference or Vehicle Details:</strong> For Cottage/AC dining and Highway in-car takeaway pickup.</li>
          </ul>

          <h3 style={subHeadingStyle}>2. Zero Selling of Data</h3>
          <p>
            We do <strong>not</strong> sell, rent, or trade your personal information to third-party advertisers, data brokers, or marketing companies. Your data remains strictly within {STORE_NAME}&apos;s internal order fulfillment system.
          </p>

          <h3 style={subHeadingStyle}>3. Payment Privacy & Bank-Grade Security</h3>
          <p>
            We utilize native UPI intent deep-linking (Google Pay, PhonePe, Paytm, BHIM) and soundbox verification. {STORE_NAME} <strong>never</strong> collects, stores, or processes your bank passwords, UPI PINs, or debit/credit card CVVs.
          </p>

          <h3 style={subHeadingStyle}>4. Contact Us</h3>
          <p>
            For privacy inquiries or to delete your customer record, call our desk directly at <a href={`tel:${SUPPORT_PHONE}`} style={{ color: 'var(--primary)', fontWeight: 700 }}>{SUPPORT_PHONE}</a> or WhatsApp us at <a href={`https://wa.me/${SUPPORT_WHATSAPP}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 700 }}>+{SUPPORT_WHATSAPP}</a>.
          </p>
        </div>
      )}

      {/* Tab 2: Terms of Service */}
      {activeTab === 'terms' && (
        <div style={panelStyle}>
          <h2 style={headingStyle}>Terms of Service</h2>
          <p>
            By accessing {STORE_NAME}&apos;s online ordering website or QR digital menus, you agree to the following terms:
          </p>

          <h3 style={subHeadingStyle}>1. Kitchen Operations & Shift Hours</h3>
          <p>
            Our kitchen operates daily from <strong>11:00 AM to 12:00 AM (Midnight)</strong>. Orders submitted after closing are queued for morning prep upon kitchen re-opening.
          </p>

          <h3 style={subHeadingStyle}>2. Order Minimum & Pricing</h3>
          <ul style={{ paddingLeft: '1.25rem', margin: '0 0 1rem' }}>
            <li>Doorstep delivery requires a minimum food cart value of <strong>â‚¹{MIN_ORDER_AMOUNT}</strong>.</li>
            <li>All prices listed on the menu are inclusive of applicable kitchen preparation and packaging charges.</li>
            <li>All doorstep deliveries within our {MAX_DELIVERY_RADIUS_KM} km radius receive <strong>â‚¹0 Free Delivery</strong>.</li>
          </ul>

          <h3 style={subHeadingStyle}>3. Preparation & Delivery Window</h3>
          <p>
            Every dish is cooked fresh upon order confirmation. Average dispatch time is <strong>20â€“35 minutes</strong> depending on live kitchen load and weekend highway rush.
          </p>

          <h3 style={subHeadingStyle}>4. In-Car Highway Takeaway & Cottage Booking</h3>
          <p>
            For Highway Car Pickup on NH-116, please provide vehicle details upon checkout so our staff can bring your piping hot order directly to your parking bay.
          </p>
        </div>
      )}

      {/* Tab 3: Refund & Cancellation */}
      {activeTab === 'refund' && (
        <div style={panelStyle}>
          <h2 style={headingStyle}>Refund & Cancellation Policy</h2>
          <p>
            Because food items are prepared fresh to order, our cancellation and refund guidelines are structured as follows:
          </p>

          <h3 style={subHeadingStyle}>1. Order Cancellation Window</h3>
          <ul style={{ paddingLeft: '1.25rem', margin: '0 0 1rem' }}>
            <li>
              <strong>Before Cooking Starts:</strong> You may cancel your order at any time while the status is <em>Pending</em> or <em>Confirmed</em> with zero penalty.
            </li>
            <li>
              <strong>After Cooking Starts:</strong> Once our chef begins cooking (status: <em>Cooking</em>), food items cannot be cancelled or altered.
            </li>
          </ul>

          <h3 style={subHeadingStyle}>2. When Full Refunds are Issued</h3>
          <p>A 100% refund of any advance or full payment will be granted immediately in the following circumstances:</p>
          <ul style={{ paddingLeft: '1.25rem', margin: '0 0 1rem' }}>
            <li>The order is cancelled by the restaurant due to an unforeseen dish outage or extreme weather.</li>
            <li>Food delivered is incorrect, spilled, or damaged during transit.</li>
            <li>Delivery address is verified as beyond our 5 km service boundary and order is cancelled prior to dispatch.</li>
          </ul>

          <h3 style={subHeadingStyle}>3. Refund Processing Speed</h3>
          <p>
            All approved refunds are initiated back to the customer&apos;s original UPI account within <strong>2 to 4 hours</strong>. For assistance, reach out directly via our Helpdesk or WhatsApp.
          </p>
        </div>
      )}

      {/* Tab 4: Delivery Policy */}
      {activeTab === 'delivery' && (
        <div style={panelStyle}>
          <h2 style={headingStyle}>5 km Delivery Policy</h2>
          <p>
            To guarantee that food arrives piping hot and fresh from our tandoor and wok, {STORE_NAME} operates a strict quality-controlled delivery boundary:
          </p>

          <h3 style={subHeadingStyle}>1. Strict {MAX_DELIVERY_RADIUS_KM} km Radius</h3>
          <p>
            Doorstep delivery is exclusively serviced within <strong>5.0 km</strong> of our central hub at Tamluk-Nandakumar (Nandakumar NH-116 Junction).
          </p>

          <h3 style={subHeadingStyle}>2. Free Delivery on Orders â‚¹{MIN_ORDER_AMOUNT}+</h3>
          <p>
            We do not charge surge pricing or distance penalties within the 5 km boundary. Delivery fee is <strong>â‚¹0 FREE</strong> for all orders meeting the â‚¹{MIN_ORDER_AMOUNT} minimum threshold.
          </p>

          <h3 style={subHeadingStyle}>3. Areas Beyond 5 km</h3>
          <p>
            Addresses located beyond 5.0 km (e.g. Mahishadal, Tamluk town, Chandipur, Haldia) are strictly out of delivery bounds. Customers traveling through or residing outside the radius are warmly invited to choose <strong>High Takeaway</strong> for highway car pickup or <strong>AC Dining & Cottage Dine-In</strong>.
          </p>
        </div>
      )}

      {/* Return Button */}
      <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--primary)',
            fontWeight: 800,
            textDecoration: 'none',
            fontSize: '0.88rem',
            padding: '0.65rem 1.25rem',
            borderRadius: '10px',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            minHeight: '44px',
            touchAction: 'manipulation',
          }}
        >
          <span>â†</span> Return to Restaurant Menu
        </Link>
      </div>
    </div>
  )
}

