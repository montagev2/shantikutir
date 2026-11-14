import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useStore } from '../context/StoreContext'
import { formatOrderId } from '../lib/business'
import { createSupportTicketApi, fetchUserSupportTicketsApi, sendTicketMessageApi } from '../lib/api'
import { playChime } from '../lib/notifications'
import { supabase } from '../lib/supabase'
import { showToast } from '../components/Toast'
import type { SupportTicket, TicketCategory, TicketMessage } from '../types'
import { SUPPORT_PHONE, SUPPORT_WHATSAPP, STORE_ADDRESS, STORE_HOURS, GOOGLE_MAPS_LOCATION_URL } from '../lib/business'

// FEATURE TOGGLE: Support tickets temporarily disabled per request; 100% kept for future use.
// Set to true anytime to restore database support tickets and 2-way in-app chat.
const ENABLE_SUPPORT_TICKETS = false

const CATEGORIES: { id: TicketCategory; label: string; icon: string; desc: string }[] = [
  { id: 'payment', label: 'Billing & Payment Assistance', icon: '', desc: 'UPI verification, receipts, or billing inquiries' },
  { id: 'delivery', label: 'Delivery & Highway Drop', icon: '', desc: 'Live ETA updates, location coordinates, or driver contact' },
  { id: 'food_quality', label: 'Chef & Culinary Requests', icon: '', desc: 'Custom spice preferences, preparations, or dietary requests' },
  { id: 'table_booking', label: 'Cottage & Table Reservations', icon: '', desc: 'Private wooden cottages, gazebo seating, or family celebrations' },
  { id: 'general', label: 'Guest Services & Inquiries', icon: '', desc: 'Menu inquiries, catering services, or general assistance' },
]

const INSTANT_FAQS = [
  {
    q: 'How long does delivery take to our location?',
    a: 'Freshly prepared orders within Nandakumar (0â€“2.5 km) are typically delivered within 20â€“30 minutes. Extended local deliveries up to 5 km take 30â€“45 minutes. For locations beyond 5 km, we welcome you to order High Takeaway or Cottage Dine-In.',
  },
  {
    q: 'When is my food order confirmed?',
    a: 'All orders are confirmed instantly upon placement! The kitchen starts preparing your fresh dishes immediately, and you can live track the progress on /track.',
  },
  {
    q: 'How can we reserve a private garden cottage or gazebo?',
    a: 'You can select "Cottage Dine-In" during checkout, or start a concierge inquiry here with your preferred time, date, and guest count for instant confirmation.',
  },
]

export default function Support() {
  const { user } = useAuth()
  const { orders } = useStore()
  const [searchParams] = useSearchParams()
  const paramOrderId = searchParams.get('orderId') || ''

  const [tab, setTab] = useState<'hub' | 'create' | 'chat'>('hub')
  const [userName, setUserName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [orderId, setOrderId] = useState(paramOrderId)
  const [category, setCategory] = useState<TicketCategory>('payment')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [myTickets, setMyTickets] = useState<SupportTicket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [chatInput, setChatInput] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const [loadingTickets, setLoadingTickets] = useState(false)
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  const chatEndRef = useRef<HTMLDivElement | null>(null)
  const userPhone = phone || user?.phone || ''

  const loadTickets = useCallback(async () => {
    if (!userPhone.trim()) return
    setLoadingTickets(true)
    try {
      const tickets = await fetchUserSupportTicketsApi(userPhone)
      setMyTickets(tickets || [])
      setSelectedTicket((prev) => {
        if (!prev) return null
        return tickets.find((t) => t.id === prev.id) || prev
      })
    } finally {
      setLoadingTickets(false)
    }
  }, [userPhone])

  useEffect(() => {
    if (ENABLE_SUPPORT_TICKETS && userPhone.trim()) {
      void loadTickets()
    }
  }, [userPhone, loadTickets])

  useEffect(() => {
    if (paramOrderId) {
      setOrderId(paramOrderId)
      setTab('create')
      setSubject(`Inquiry regarding Order #${formatOrderId(paramOrderId)}`)
    }
  }, [paramOrderId])

  // Real-time live conversation synchronization
  useEffect(() => {
    if (!selectedTicket?.id) return

    const channel = supabase
      .channel(`realtime-ticket-${selectedTicket.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'support_tickets', filter: `id=eq.${selectedTicket.id}` },
        (payload) => {
          const row = payload.new as any
          if (row && row.messages) {
            setSelectedTicket((prev: SupportTicket | null) => (prev && prev.id === row.id ? { ...prev, messages: row.messages, status: row.status } : null))
            playChime('dine_in')
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedTicket?.id])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedTicket?.messages])

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userName.trim() || !phone.trim() || !subject.trim() || !message.trim()) {
      showToast('Please complete all required fields.', '!')
      return
    }

    setSubmitting(true)
    try {
      const ticket = await createSupportTicketApi({
        userId: user?.id,
        userName,
        phone,
        orderId: orderId || undefined,
        category,
        subject,
        message,
      })

      if (ticket) {
        showToast('Guest Concierge Connected!', 'i')
        setSubject('')
        setMessage('')
        setOrderId('')
        setSelectedTicket(ticket)
        setTab('chat')
        await loadTickets()
      } else {
        showToast('Unable to connect. Please try again.', '!')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTicket || !chatInput.trim()) return

    const newMsg: TicketMessage = {
      id: `m_${Date.now()}`,
      sender: 'customer',
      senderName: userName || user?.name || 'Guest',
      text: chatInput.trim(),
      createdAt: new Date().toISOString(),
    }

    const currentMsgs = selectedTicket.messages || []
    setSelectedTicket({
      ...selectedTicket,
      messages: [...currentMsgs, newMsg],
    })
    setChatInput('')

    setSendingMsg(true)
    try {
      await sendTicketMessageApi(selectedTicket.id, newMsg)
      await loadTickets()
    } finally {
      setSendingMsg(false)
    }
  }

  const activeTicketsCount = myTickets.filter((t) => t.status !== 'resolved').length

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', paddingBottom: '3.5rem', color: '#fafaf9' }}>
      {/* Premium Hero Header */}
      <div
        className="tfg-glass-elevated"
        style={{
          border: '1.5px solid rgba(223, 177, 91,0.3)',
          borderRadius: '24px',
          padding: '1.75rem',
          marginBottom: '1.5rem',
          boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.35)', borderRadius: '20px', padding: '3px 10px', fontSize: '0.72rem', color: '#4ade80', fontWeight: 800, marginBottom: '0.5rem' }}>
            <span style={{ width: '6px', height: '6px', background: '#22c55e', borderRadius: '50%' }} />
            <span>DIRECT HELPLINE Â· OPEN DAILY (11 AM â€“ MIDNIGHT)</span>
          </div>
          <h1 style={{ fontSize: '1.5rem', margin: '0 0 0.35rem', color: '#fafaf9', fontWeight: 900 }}>
            {user ? `Welcome, ${(user.name || 'Guest').split(' ')[0]}. How may we help?` : 'Customer Support & Helpline'}
          </h1>
          <p style={{ color: '#d6d3d1', fontSize: '0.84rem', margin: 0, lineHeight: 1.45 }}>
            Need help with your order, table booking, or culinary requests? Contact our team directly.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <a
            href={`tel:${SUPPORT_PHONE}`}
            style={{
              background: '#22c55e',
              color: '#052e16',
              padding: '0.65rem 1.15rem',
              borderRadius: '12px',
              fontWeight: 900,
              fontSize: '0.85rem',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(34,197,94,0.35)',
              touchAction: 'manipulation',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            Call Now
          </a>
          <a
            href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(
              paramOrderId
                ? `Hello Shanti Kutir, I need assistance with Order #${formatOrderId(paramOrderId)}.`
                : 'Hello Shanti Kutir, I need assistance with my dining/order.'
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: '#25d366',
              color: '#ffffff',
              padding: '0.65rem 1.15rem',
              borderRadius: '12px',
              fontWeight: 900,
              fontSize: '0.85rem',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(37,211,102,0.35)',
              touchAction: 'manipulation',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.23 8.23 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.63c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.03-1.25-.75-.67-1.26-1.5-1.41-1.75-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.34-.76-1.84-.2-.49-.4-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.78 2.71 4.3 3.8.6.26 1.07.41 1.44.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.17-.48-.29"/></svg>
            WhatsApp
          </a>
        </div>
      </div>

      {!ENABLE_SUPPORT_TICKETS ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Quick Action Contact Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '0.85rem',
            }}
          >
            <a
              href={`tel:${SUPPORT_PHONE}`}
              className="tfg-glass-card"
              style={{
                border: '1px solid rgba(34,197,94,0.3)',
                borderRadius: '18px',
                padding: '1.25rem',
                textDecoration: 'none',
                color: '#fafaf9',
                display: 'block',
              }}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(34,197,94,0.15)', display: 'grid', placeItems: 'center', marginBottom: '0.75rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              </div>
              <strong style={{ fontSize: '1rem', color: '#22c55e', display: 'block', marginBottom: '4px' }}>
                Instant Phone Call
              </strong>
              <span style={{ fontSize: '0.85rem', color: '#fafaf9', fontWeight: 800, display: 'block', marginBottom: '4px' }}>
                {SUPPORT_PHONE}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>
                Direct line to counter manager for immediate urgent assistance
              </span>
            </a>

            <a
              href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent('Hello Shanti Kutir, I would like to inquire about...')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="tfg-glass-card"
              style={{
                border: '1px solid rgba(37,211,102,0.3)',
                borderRadius: '18px',
                padding: '1.25rem',
                textDecoration: 'none',
                color: '#fafaf9',
                display: 'block',
              }}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(37,211,102,0.15)', display: 'grid', placeItems: 'center', marginBottom: '0.75rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#25d366" aria-hidden="true"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.23 8.23 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.63c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.03-1.25-.75-.67-1.26-1.5-1.41-1.75-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.34-.76-1.84-.2-.49-.4-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.78 2.71 4.3 3.8.6.26 1.07.41 1.44.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.17-.48-.29"/></svg>
              </div>
              <strong style={{ fontSize: '1rem', color: '#25d366', display: 'block', marginBottom: '4px' }}>
                WhatsApp Concierge
              </strong>
              <span style={{ fontSize: '0.85rem', color: '#fafaf9', fontWeight: 800, display: 'block', marginBottom: '4px' }}>
                Chat on WhatsApp
              </span>
              <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>
                Send location, receipts, custom spice requests & table queries
              </span>
            </a>

            <div
              className="tfg-glass-card"
              style={{
                border: '1px solid rgba(223, 177, 91,0.25)',
                borderRadius: '18px',
                padding: '1.25rem',
              }}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(223, 177, 91,0.15)', display: 'grid', placeItems: 'center', marginBottom: '0.75rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dfb15b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <strong style={{ fontSize: '1rem', color: '#dfb15b', display: 'block', marginBottom: '4px' }}>
                Service Timings
              </strong>
              <span style={{ fontSize: '0.85rem', color: '#fafaf9', fontWeight: 800, display: 'block', marginBottom: '4px' }}>
                {STORE_HOURS}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>
                Open every day for Dine-in, Takeaway & Highway Delivery
              </span>
            </div>

            <div
              className="tfg-glass-card"
              style={{
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '18px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', marginBottom: '0.85rem', height: '110px' }}>
                  <img
                    src="/dishes/tandoori-chicken.jpg"
                    alt="Shanti Kutir Highway Location & Parking"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    loading="lazy"
                  />
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '6px',
                      left: '6px',
                      background: 'rgba(0,0,0,0.85)',
                      backdropFilter: 'blur(6px)',
                      color: '#4ade80',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      border: '1px solid rgba(74,222,128,0.3)',
                    }}
                  >
                    Free Roadside Parking
                  </span>
                </div>
                <strong style={{ fontSize: '1rem', color: '#38bdf8', display: 'block', marginBottom: '4px' }}>
                  Highway Location & Stop
                </strong>
                <span style={{ fontSize: '0.78rem', color: '#d6d3d1', display: 'block', marginBottom: '6px', lineHeight: 1.4 }}>
                  {STORE_ADDRESS}
                </span>
              </div>
              <a
                href={GOOGLE_MAPS_LOCATION_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#dfb15b', fontSize: '0.78rem', fontWeight: 800, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '0.5rem' }}
              >
                Open in Google Maps &rarr;
              </a>
            </div>
          </div>

          {/* Inquire About Recent Orders */}
          {orders.length > 0 && (
            <div>
              <h2 style={{ fontSize: '1.05rem', color: '#fafaf9', fontWeight: 800, margin: '0 0 0.85rem' }}>
                Need Help with a Recent Order?
              </h2>
              <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '4px' }}>
                {orders.slice(0, 4).map((o) => (
                  <div
                    key={o.id}
                    className="tfg-glass-card"
                    style={{
                      border: '1px solid rgba(223, 177, 91,0.25)',
                      borderRadius: '16px',
                      padding: '1rem',
                      minWidth: '240px',
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '0.85rem', color: '#dfb15b' }}>#{formatOrderId(o.id)}</strong>
                      <span style={{ fontSize: '0.78rem', color: '#22c55e', fontWeight: 800 }}>â‚¹{o.total}</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#a1a1aa', display: 'block', marginBottom: '0.75rem' }}>
                      {new Date(o.createdAt || o.created_at || Date.now()).toLocaleDateString()} - {(o.orderType || o.dining_mode || 'dine_in').toUpperCase()} - Status: {o.status.toUpperCase()}
                    </span>
                    <a
                      href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(`Hello Shanti Kutir, I need assistance regarding my Order #${formatOrderId(o.id)} (Total: â‚¹${o.total}).`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        width: '100%',
                        background: '#25d366',
                        color: '#ffffff',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        boxSizing: 'border-box',
                      }}
                    >
                      WhatsApp about this order
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Frequently Asked Questions */}
          <div>
            <h2 style={{ fontSize: '1.05rem', color: '#fafaf9', fontWeight: 800, margin: '0 0 0.85rem' }}>
              Frequently Asked Questions
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {INSTANT_FAQS.map((faq, idx) => (
                <div
                  key={idx}
                  onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                  className="tfg-glass-card"
                  style={{
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '14px',
                    padding: '1rem',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.85rem', color: '#fafaf9' }}>{faq.q}</strong>
                    <span style={{ color: '#dfb15b', fontSize: '0.85rem' }}>{expandedFaq === idx ? 'â–²' : 'â–¼'}</span>
                  </div>
                  {expandedFaq === idx && (
                    <p style={{ color: '#a1a1aa', fontSize: '0.8rem', margin: '0.65rem 0 0', lineHeight: 1.5, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.5rem' }}>
                      {faq.a}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* â”€â”€â”€ NAVIGATION TABS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              background: '#1c1917',
              padding: '4px',
              borderRadius: '14px',
              border: '1px solid rgba(255,255,255,0.08)',
              marginBottom: '1.5rem',
            }}
          >
        <button
          type="button"
          onClick={() => { setTab('hub'); setSelectedTicket(null) }}
          style={{
            flex: 1,
            padding: '0.6rem',
            borderRadius: '10px',
            border: 'none',
            background: tab === 'hub' ? '#dfb15b' : 'transparent',
            color: tab === 'hub' ? '#18181b' : '#a1a1aa',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
          }}
        >
          Concierge Hub
        </button>

        <button
          type="button"
          onClick={() => { setTab('create'); setSelectedTicket(null) }}
          style={{
            flex: 1,
            padding: '0.6rem',
            borderRadius: '10px',
            border: 'none',
            background: tab === 'create' ? '#dfb15b' : 'transparent',
            color: tab === 'create' ? '#18181b' : '#a1a1aa',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
          }}
        >
          New Inquiry
        </button>

        <button
          type="button"
          onClick={() => { setTab('chat') }}
          style={{
            flex: 1,
            padding: '0.6rem',
            borderRadius: '10px',
            border: 'none',
            background: tab === 'chat' ? '#dfb15b' : 'transparent',
            color: tab === 'chat' ? '#18181b' : '#a1a1aa',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            position: 'relative',
          }}
        >
          My Inquiries {activeTicketsCount > 0 ? `(${activeTicketsCount})` : ''}
        </button>
      </div>

      {/* â”€â”€â”€ TAB 1: CONCIERGE HUB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {tab === 'hub' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Active Conversation Alert */}
          {activeTicketsCount > 0 && (
            <div
              style={{
                background: 'rgba(56,189,248,0.1)',
                border: '1.5px solid #38bdf8',
                borderRadius: '18px',
                padding: '1rem 1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div>
                <strong style={{ color: '#fafaf9', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', background: '#38bdf8', borderRadius: '50%' }} />
                  You have {activeTicketsCount} active conversation(s) with our concierge team.
                </strong>
                <span style={{ color: '#a1a1aa', fontSize: '0.78rem' }}>
                  Our guest service team is actively attending to your requests.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const openOne = myTickets.find((t) => t.status !== 'resolved') || myTickets[0]
                  setSelectedTicket(openOne)
                  setTab('chat')
                }}
                style={{
                  background: '#38bdf8',
                  color: '#111',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '10px',
                  fontWeight: 900,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                Open Conversation &rarr;
              </button>
            </div>
          )}

          {/* Quick Category Action Cards */}
          <div>
            <h2 style={{ fontSize: '1.05rem', color: '#fafaf9', fontWeight: 800, margin: '0 0 0.85rem' }}>
              How May We Assist You?
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
              {CATEGORIES.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    setCategory(c.id)
                    setTab('create')
                  }}
                  style={{
                    background: '#1c1917',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '16px',
                    padding: '1.15rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>{c.icon}</div>
                  <strong style={{ fontSize: '0.92rem', color: '#fafaf9', display: 'block', marginBottom: '4px' }}>
                    {c.label}
                  </strong>
                  <span style={{ fontSize: '0.75rem', color: '#a1a1aa', lineHeight: 1.35, display: 'block' }}>
                    {c.desc}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Orders Quick Helper */}
          {orders.length > 0 && (
            <div>
              <h2 style={{ fontSize: '1.05rem', color: '#fafaf9', fontWeight: 800, margin: '0 0 0.85rem' }}>
                Inquire About a Recent Order
              </h2>
              <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '4px' }}>
                {orders.slice(0, 4).map((o) => (
                  <div
                    key={o.id}
                    onClick={() => {
                      setOrderId(o.id)
                      setSubject(`Inquiry regarding Order #${formatOrderId(o.id)}`)
                      setTab('create')
                    }}
                    style={{
                      background: '#1c1917',
                      border: '1px solid rgba(223, 177, 91,0.25)',
                      borderRadius: '16px',
                      padding: '1rem',
                      minWidth: '220px',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '0.85rem', color: '#dfb15b' }}>#{formatOrderId(o.id)}</strong>
                      <span style={{ fontSize: '0.78rem', color: '#22c55e', fontWeight: 800 }}>â‚¹{o.total}</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#a1a1aa', display: 'block', marginBottom: '0.5rem' }}>
                      {new Date(o.createdAt || o.created_at || Date.now()).toLocaleDateString()} - {(o.orderType || o.dining_mode || 'dine_in').toUpperCase()}
                    </span>
                    <button
                      type="button"
                      style={{ width: '100%', background: '#27272a', border: '1px solid #3f3f46', color: '#fafaf9', padding: '4px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Inquire about this order
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Frequently Asked Questions */}
          <div>
            <h2 style={{ fontSize: '1.05rem', color: '#fafaf9', fontWeight: 800, margin: '0 0 0.85rem' }}>
              Frequently Asked Questions
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {INSTANT_FAQS.map((faq, idx) => (
                <div
                  key={idx}
                  onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                  style={{
                    background: '#1c1917',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '14px',
                    padding: '1rem',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.85rem', color: '#fafaf9' }}>{faq.q}</strong>
                    <span style={{ color: '#dfb15b', fontSize: '1rem' }}>{expandedFaq === idx ? 'â–²' : 'â–¼'}</span>
                  </div>
                  {expandedFaq === idx && (
                    <p style={{ color: '#a1a1aa', fontSize: '0.8rem', margin: '0.65rem 0 0', lineHeight: 1.5, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.5rem' }}>
                      {faq.a}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€â”€ TAB 2: CREATE NEW INQUIRY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {tab === 'create' && (
        <form
          onSubmit={handleCreateTicket}
          style={{
            background: '#1c1917',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {/* Category Chips */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#d6d3d1', marginBottom: '0.5rem' }}>
              Select Topic:
            </label>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '20px',
                    border: category === c.id ? '1.5px solid #dfb15b' : '1px solid #3f3f46',
                    background: category === c.id ? 'rgba(223, 177, 91,0.15)' : '#27272a',
                    color: category === c.id ? '#dfb15b' : '#d6d3d1',
                    fontWeight: category === c.id ? 800 : 500,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>{c.icon}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Name & Phone Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#a1a1aa', marginBottom: '4px' }}>
                Your Name:
              </label>
              <input
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="e.g. Rahul Das"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  background: '#121214',
                  border: '1px solid #3f3f46',
                  color: '#fff',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#a1a1aa', marginBottom: '4px' }}>
                Phone Number:
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile number"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  background: '#121214',
                  border: '1px solid #3f3f46',
                  color: '#fff',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Optional Order ID Link */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#a1a1aa', marginBottom: '4px' }}>
              Related Order (Optional):
            </label>
            {orders.length > 0 ? (
              <select
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  background: '#121214',
                  border: '1px solid #3f3f46',
                  color: '#fff',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              >
                <option value="">-- General dining inquiry / No specific order --</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    Order #{formatOrderId(o.id)} (Rs.{o.total}) - {new Date(o.createdAt || o.created_at || Date.now()).toLocaleDateString()}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="e.g. TFG-8921"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  background: '#121214',
                  border: '1px solid #3f3f46',
                  color: '#fff',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              />
            )}
          </div>

          {/* Subject */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#a1a1aa', marginBottom: '4px' }}>
              Subject:
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of your request..."
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '10px',
                background: '#121214',
                border: '1px solid #3f3f46',
                color: '#fff',
                fontSize: '0.88rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Message */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#a1a1aa', marginBottom: '4px' }}>
              How can we assist you?
            </label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Please describe what you need (our concierge team will reply directly)..."
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '10px',
                background: '#121214',
                border: '1px solid #3f3f46',
                color: '#fff',
                fontSize: '0.88rem',
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '0.85rem',
              backgroundColor: '#c89838',
              backgroundImage: 'linear-gradient(135deg, #dfb15b, #c89838)',
              color: '#111',
              border: 'none',
              borderRadius: '12px',
              fontWeight: 900,
              fontSize: '0.95rem',
              cursor: submitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(223, 177, 91,0.3)',
              marginTop: '0.5rem',
            }}
          >
            {submitting ? 'Connecting...' : 'Submit & Connect with Concierge'}
          </button>
        </form>
      )}

      {/* â”€â”€â”€ TAB 3: MY INQUIRIES & LIVE CONVERSATION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {tab === 'chat' && (
        <div>
          {selectedTicket ? (
            <div
              style={{
                background: '#1c1917',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '20px',
                overflow: 'hidden',
                boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                height: '560px',
              }}
            >
              <div
                style={{
                  background: '#121214',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedTicket(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dfb15b',
                      fontSize: '1.2rem',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    â†
                  </button>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <strong style={{ fontSize: '0.95rem', color: '#fafaf9' }}>#{selectedTicket.id}</strong>
                      <span style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: 800 }}>â— Concierge Active</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>
                      {selectedTicket.subject} {selectedTicket.orderId ? `Â· #${formatOrderId(selectedTicket.orderId)}` : ''}
                    </span>
                  </div>
                </div>

                <span
                  style={{
                    background: selectedTicket.status === 'resolved' ? 'rgba(34,197,94,0.15)' : 'rgba(223, 177, 91,0.15)',
                    color: selectedTicket.status === 'resolved' ? '#22c55e' : '#dfb15b',
                    border: `1px solid ${selectedTicket.status === 'resolved' ? '#22c55e' : '#dfb15b'}44`,
                    padding: '3px 8px',
                    borderRadius: '12px',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                  }}
                >
                  {selectedTicket.status === 'resolved' ? 'Resolved' : 'In Progress'}
                </span>
              </div>

              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  background: '#0d0d0f',
                }}
              >
                {(selectedTicket.messages || []).map((m: TicketMessage) => {
                  const isMe = m.sender === 'customer'
                  return (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isMe ? 'flex-end' : 'flex-start',
                        maxWidth: '82%',
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.7rem',
                          color: isMe ? '#dfb15b' : '#38bdf8',
                          marginBottom: '2px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>{m.senderName}</span>
                      </div>

                      <div
                        style={{
                          background: isMe
                            ? 'linear-gradient(135deg, #c89838, #b45309)'
                            : '#1f1f23',
                          color: '#fafaf9',
                          border: isMe ? 'none' : '1px solid rgba(255,255,255,0.08)',
                          borderRadius: isMe ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                          padding: '0.65rem 0.9rem',
                          fontSize: '0.88rem',
                          lineHeight: 1.45,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                          wordBreak: 'break-word',
                        }}
                      >
                        {m.text}
                      </div>

                      <span style={{ fontSize: '0.65rem', color: '#71717a', marginTop: '2px' }}>
                        {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                      </span>
                    </div>
                  )
                })}
                <div ref={chatEndRef} />
              </div>

              <form
                onSubmit={handleSendChatMessage}
                style={{
                  background: '#18181b',
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  padding: '0.65rem 0.85rem',
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'center',
                }}
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type your message to concierge..."
                  style={{
                    flex: 1,
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    background: '#121214',
                    border: '1px solid #3f3f46',
                    color: '#fff',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={sendingMsg || !chatInput.trim()}
                  style={{
                    backgroundColor: '#c89838',
                    backgroundImage: 'linear-gradient(135deg, #dfb15b, #c89838)',
                    color: '#111',
                    border: 'none',
                    padding: '0.65rem 1.1rem',
                    borderRadius: '10px',
                    fontWeight: 900,
                    fontSize: '0.85rem',
                    cursor: chatInput.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  {sendingMsg ? 'Sending...' : 'Send \u2192'}
                </button>
              </form>
            </div>
          ) : (
            <div>
              {!userPhone.trim() ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#1c1917', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p style={{ color: '#a1a1aa' }}>Please sign in or enter your mobile number to view your inquiries.</p>
                  <Link to="/auth" style={{ color: '#dfb15b', fontWeight: 800, textDecoration: 'none' }}>
                    Sign In &rarr;
                  </Link>
                </div>
              ) : loadingTickets ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#dfb15b' }}>
                  Loading your inquiries...
                </div>
              ) : myTickets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#1c1917', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <strong style={{ color: '#fafaf9', display: 'block', marginBottom: '4px' }}>
                    No Active Inquiries
                  </strong>
                  <p style={{ color: '#a1a1aa', fontSize: '0.85rem', margin: '0 0 1rem' }}>
                    You have no active inquiries under {userPhone}.
                  </p>
                  <button
                    type="button"
                    onClick={() => setTab('create')}
                    style={{
                      background: '#dfb15b',
                      color: '#111',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    + Contact Guest Concierge
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {myTickets.map((t: SupportTicket) => {
                    const statusBadge: Record<string, { bg: string; color: string; label: string }> = {
                      open: { bg: 'rgba(223, 177, 91,0.15)', color: '#dfb15b', label: 'Open' },
                      in_progress: { bg: 'rgba(56,189,248,0.15)', color: '#38bdf8', label: 'Active Chat' },
                      resolved: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', label: 'Resolved' },
                    }
                    const b = statusBadge[t.status] || statusBadge.open
                    const msgs = t.messages || []
                    const lastMsg = msgs[msgs.length - 1]

                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTicket(t)}
                        style={{
                          background: '#1c1917',
                          border: '1.5px solid rgba(255,255,255,0.08)',
                          borderRadius: '16px',
                          padding: '1.15rem',
                          cursor: 'pointer',
                          transition: 'all 0.18s ease',
                          boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.45rem' }}>
                          <div>
                            <strong style={{ fontSize: '0.98rem', color: '#fafaf9', display: 'block' }}>
                              #{t.id} â€” {t.subject || 'Guest Inquiry'}
                            </strong>
                            <span style={{ fontSize: '0.74rem', color: '#a1a1aa' }}>
                              Topic: <b>{(t.category || 'general').toUpperCase()}</b> {t.orderId ? `Â· Order #${formatOrderId(t.orderId)}` : ''} Â· {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ''}
                            </span>
                          </div>
                          <span style={{ background: b.bg, color: b.color, border: `1px solid ${b.color}44`, padding: '3px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 800 }}>
                            {b.label}
                          </span>
                        </div>

                        {lastMsg && (
                          <div style={{ background: '#121214', borderRadius: '8px', padding: '0.45rem 0.75rem', fontSize: '0.78rem', color: '#d6d3d1', marginTop: '0.4rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <span style={{ color: lastMsg.sender === 'customer' ? '#dfb15b' : '#38bdf8', fontWeight: 700, marginRight: '4px' }}>
                              {lastMsg.senderName}:
                            </span>
                            {lastMsg.text}
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.65rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                          <span style={{ fontSize: '0.75rem', color: '#71717a' }}>
                            {msgs.length} message(s)
                          </span>
                          <span style={{ color: '#dfb15b', fontWeight: 800, fontSize: '0.8rem' }}>
                            Open Conversation &rarr;
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
        </>
      )}
    </div>
  )
}

