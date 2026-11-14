import { useState } from 'react'
import { SUPPORT_WHATSAPP } from '../lib/business'
import { showToast } from './Toast'
import { checkRateLimit, sanitizeText } from '../lib/security'

export default function PartyBookingModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [guests, setGuests] = useState('10')
  const [date, setDate] = useState('')
  const [eventType, setEventType] = useState('Birthday Party')

  const handleBooking = () => {
    const cleanName = sanitizeText(name)
    const cleanPhone = sanitizeText(phone).replace(/\D/g, '')
    const cleanDate = sanitizeText(date)
    const cleanGuests = sanitizeText(guests)

    if (!cleanName || !cleanPhone || !cleanDate) {
      showToast('Please fill in Name, Phone and Date', '!', 'error')
      return
    }

    // Anti-spam cooldown: max 2 inquiries per minute
    const rateLimit = checkRateLimit('party_booking_inquiry', 2, 60 * 1000, 30 * 1000)
    if (!rateLimit.allowed) {
      showToast(`Please wait ${rateLimit.retryAfterSeconds}s before sending another inquiry.`, 'i', 'error')
      return
    }

    const text = encodeURIComponent(
      `New Party / Table Booking Inquiry for Shanti Kutir:\n\nName: ${cleanName}\nPhone: ${cleanPhone}\nEvent: ${eventType}\nGuests: ${cleanGuests} Persons\nDate & Time: ${cleanDate}\n\nPlease confirm availability!`
    )
    window.open(`https://wa.me/${SUPPORT_WHATSAPP}?text=${text}`, '_blank')
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', zIndex: 9999, display: 'grid', placeItems: 'center', padding: '1rem' }} onClick={onClose}>
      <div className="tfg-glass-elevated modal-pop" style={{ border: '1px solid rgba(223, 177, 91,0.4)', borderRadius: '20px', padding: '1.5rem', width: 'min(440px, 94vw)', maxHeight: '90vh', overflowY: 'auto', color: '#fafaf9', boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <h3 style={{ margin: 0, color: '#dfb15b', fontSize: '1.2rem', fontWeight: 900 }}>Table & Party Booking</h3>
          <button type="button" onClick={onClose} aria-label="Close dialog" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#a8a29e', width: '38px', height: '38px', borderRadius: '50%', cursor: 'pointer', display: 'grid', placeItems: 'center', touchAction: 'manipulation' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Real Ambiance Preview Banner */}
        <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', height: '120px', marginBottom: '0.85rem' }}>
          <img
            src="/dishes/kutir-signature-thali.jpg"
            alt="Shanti Kutir Bamboo Cottage & Lawn Dining"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)' }} />
          <span style={{ position: 'absolute', bottom: '8px', left: '10px', fontSize: '0.74rem', color: '#f3d085', fontWeight: 800 }}>
            Real Bamboo Cottages & Illuminated Garden
          </span>
        </div>

        <p style={{ fontSize: '0.85rem', color: '#a8a29e', margin: '0 0 1rem', lineHeight: 1.5 }}>
          Book garden cottages for Birthday Parties, Family Get-Togethers, or Private Dining in advance.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: '#d6d3d1', display: 'block', marginBottom: '0.25rem' }}>Your Name:</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Rahul Sen" style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', background: '#27272a', border: '1px solid #3f3f46', color: '#fff', fontSize: '16px', minHeight: '44px', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: '#d6d3d1', display: 'block', marginBottom: '0.25rem' }}>Phone Number:</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 9876543210" style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', background: '#27272a', border: '1px solid #3f3f46', color: '#fff', fontSize: '16px', minHeight: '44px', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#d6d3d1', display: 'block', marginBottom: '0.25rem' }}>Event Type:</label>
              <select value={eventType} onChange={e => setEventType(e.target.value)} style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', background: '#27272a', border: '1px solid #3f3f46', color: '#fff', fontSize: '16px', minHeight: '44px', boxSizing: 'border-box' }}>
                <option value="Birthday Party">Birthday Party</option>
                <option value="Family Dining">Family Dining</option>
                <option value="Anniversary">Anniversary</option>
                <option value="Corporate / Group">Corporate Group</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#d6d3d1', display: 'block', marginBottom: '0.25rem' }}>No. of Guests:</label>
              <input type="number" value={guests} onChange={e => setGuests(e.target.value)} style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', background: '#27272a', border: '1px solid #3f3f46', color: '#fff', fontSize: '16px', minHeight: '44px', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: '#d6d3d1', display: 'block', marginBottom: '0.25rem' }}>Date & Preferred Time:</label>
            <input type="text" value={date} onChange={e => setDate(e.target.value)} placeholder="e.g. Tomorrow 8:00 PM" style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', background: '#27272a', border: '1px solid #3f3f46', color: '#fff', fontSize: '16px', minHeight: '44px', boxSizing: 'border-box' }} />
          </div>

          <button
            type="button"
            onClick={handleBooking}
            style={{
              width: '100%',
              minHeight: '48px',
              marginTop: '0.5rem',
              padding: '0.75rem',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #dfb15b 0%, #c89838 100%)',
              border: 'none',
              color: '#18181b',
              fontWeight: 900,
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              touchAction: 'manipulation',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.23 8.23 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.63c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.03-1.25-.75-.67-1.26-1.5-1.41-1.75-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.34-.76-1.84-.2-.49-.4-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.78 2.71 4.3 3.8.6.26 1.07.41 1.44.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.17-.48-.29" />
            </svg>
            Send Booking Inquiry on WhatsApp
          </button>
        </div>
      </div>
    </div>
  )
}

