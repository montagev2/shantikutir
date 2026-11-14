import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { fetchAllSupportTicketsApi, sendTicketMessageApi, deleteSupportTicketApi } from '../../lib/api'
import { formatOrderId } from '../../lib/business'
import { playChime } from '../../lib/notifications'
import { supabase } from '../../lib/supabase'
import { showToast } from '../../components/Toast'
import { useDebounce } from '../../hooks/useDebounce'
import type { SupportTicket, TicketMessage, TicketStatus } from '../../types'

type FilterTab = 'open' | 'in_progress' | 'resolved' | 'all'

const QUICK_REPLIES = [
  'Noted! Chef is preparing your custom request now.',
  'Delivery rider is on the way and will reach in 5â€“8 minutes.',
  'Extra mint chutney and salads have been added to your pack.',
  'Bill / Refund adjustment has been processed at the counter.',
  'Your issue has been resolved. Enjoy your meal at Shanti Kutir!',
]

export default function AdminTickets() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<FilterTab>('open')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 200)
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)

  const chatEndRef = useRef<HTMLDivElement | null>(null)

  const loadTickets = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAllSupportTicketsApi()
      setTickets(data)
      setActiveTicket((prev) => {
        if (!prev) return null
        return data.find((t) => t.id === prev.id) || prev
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTickets()
  }, [loadTickets])

  // Real-time WebSockets sync across all support tickets
  useEffect(() => {
    const channel = supabase
      .channel('admin-support-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets' },
        (payload) => {
          const row = payload.new as any
          if (row && row.id) {
            setTickets((prev) => {
              const exists = prev.find((t) => t.id === row.id)
              if (exists) {
                return prev.map((t) => (t.id === row.id ? { ...t, ...row, messages: row.messages || t.messages } : t))
              }
              return [{ ...row, messages: row.messages || [] }, ...prev]
            })
            setActiveTicket((prev) => {
              if (prev && prev.id === row.id) {
                return { ...prev, ...row, messages: row.messages || prev.messages }
              }
              return prev
            })
            playChime('dine_in')
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeTicket?.messages])

  const handleSendMessage = async (nextStatus: TicketStatus = 'in_progress') => {
    if (!activeTicket || !replyText.trim()) {
      showToast('Please type a response', '!')
      return
    }

    const staffMsg: TicketMessage = {
      id: `m_${Date.now()}`,
      sender: 'staff',
      senderName: 'Staff / KOT Desk',
      text: replyText.trim(),
      createdAt: new Date().toISOString(),
    }

    // Optimistic UI update
    const currentMsgs = activeTicket.messages || []
    setActiveTicket({
      ...activeTicket,
      status: nextStatus,
      messages: [...currentMsgs, staffMsg],
    })
    setReplyText('')

    setSending(true)
    try {
      const ok = await sendTicketMessageApi(activeTicket.id, staffMsg, nextStatus)
      if (ok) {
        showToast(nextStatus === 'resolved' ? 'Ticket resolved and response sent' : 'Response sent', 'i')
        await loadTickets()
      } else {
        showToast('Failed to send response', '!')
      }
    } finally {
      setSending(false)
    }
  }

  const handleDelete = async (ticketId: string) => {
    if (!confirm('Permanently delete this support ticket?')) return
    const ok = await deleteSupportTicketApi(ticketId)
    if (ok) {
      showToast('Ticket deleted', 'i')
      if (activeTicket?.id === ticketId) setActiveTicket(null)
      await loadTickets()
    }
  }

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    return (tickets || []).filter((t) => {
      if (!t) return false
      const matchSearch =
        !q ||
        (t.id && t.id.toLowerCase().includes(q)) ||
        (t.phone && t.phone.includes(q)) ||
        (t.userName && t.userName.toLowerCase().includes(q)) ||
        (t.orderId && t.orderId.toLowerCase().includes(q)) ||
        (t.subject && t.subject.toLowerCase().includes(q))

      const matchFilter = filter === 'all' || t.status === filter
      return Boolean(matchSearch && matchFilter)
    })
  }, [tickets, debouncedSearch, filter])

  const stats = useMemo(() => {
    const list = tickets || []
    return {
      total: list.length,
      open: list.filter((t) => t?.status === 'open').length,
      inProgress: list.filter((t) => t?.status === 'in_progress').length,
      resolved: list.filter((t) => t?.status === 'resolved').length,
    }
  }, [tickets])

  return (
    <div style={{ maxWidth: '940px', margin: '0 auto', paddingBottom: '3.5rem', color: '#fafaf9', paddingLeft: '1rem', paddingRight: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dfb15b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
            </svg>
            <h1 style={{ fontSize: '1.4rem', color: '#dfb15b', margin: 0, fontWeight: 900, letterSpacing: '-0.02em' }}>
              Guest Concierge & Support Desk
            </h1>
          </div>
          <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>
            Live Realtime Messaging with Guests & Diners
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

      {/* KPI Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem', marginBottom: '1.25rem' }}>
        <div className="tfg-glass-card" style={{ padding: '0.85rem', textAlign: 'center', borderColor: 'rgba(223, 177, 91, 0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.35rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(223, 177, 91, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dfb15b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#dfb15b', letterSpacing: '-0.02em' }}>{stats.open}</div>
          <div style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Open Tickets</div>
        </div>

        <div className="tfg-glass-card" style={{ padding: '0.85rem', textAlign: 'center', borderColor: 'rgba(56, 189, 248, 0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.35rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
            </div>
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#38bdf8', letterSpacing: '-0.02em' }}>{stats.inProgress}</div>
          <div style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Live Chatting</div>
        </div>

        <div className="tfg-glass-card" style={{ padding: '0.85rem', textAlign: 'center', borderColor: 'rgba(34, 197, 94, 0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.35rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#22c55e', letterSpacing: '-0.02em' }}>{stats.resolved}</div>
          <div style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Resolved</div>
        </div>

        <div className="tfg-glass-card" style={{ padding: '0.85rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.35rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fafaf9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#fafaf9', letterSpacing: '-0.02em' }}>{stats.total}</div>
          <div style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Total All Time</div>
        </div>
      </div>

      {/* Main Realtime Chat Area or Ticket List */}
      {activeTicket ? (
        /* Real-Time Live Chat Room (Admin View) */
        <div
          className="tfg-glass-elevated"
          style={{
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            height: '600px',
          }}
        >
          {/* Header */}
          <div
            style={{
              background: 'rgba(18, 18, 20, 0.85)',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              padding: '0.85rem 1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setActiveTicket(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#dfb15b',
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  touchAction: 'manipulation',
                }}
                aria-label="Back to ticket list"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
              </button>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '1rem', color: '#fafaf9' }}>#{activeTicket.id}</strong>
                  <span style={{ color: '#fafaf9', fontWeight: 700 }}>{activeTicket.userName}</span>
                  <span style={{ color: '#a1a1aa', fontSize: '0.75rem' }}>{activeTicket.phone}</span>
                  {activeTicket.orderId && (
                    <span style={{ color: '#dfb15b', fontSize: '0.75rem', fontWeight: 700 }}>
                      Â· Order #{formatOrderId(activeTicket.orderId)}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>
                  Subject: <b>{activeTicket.subject || 'Support Request'}</b> Â· Category: {(activeTicket.category || 'general').toUpperCase()}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span
                style={{
                  background: activeTicket.status === 'resolved' ? 'rgba(34,197,94,0.15)' : 'rgba(223, 177, 91,0.15)',
                  color: activeTicket.status === 'resolved' ? '#22c55e' : '#dfb15b',
                  border: `1px solid ${activeTicket.status === 'resolved' ? '#22c55e' : '#dfb15b'}44`,
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                {activeTicket.status === 'resolved' ? 'Resolved' : 'In Progress'}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(activeTicket.id)}
                style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#fca5a5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, touchAction: 'manipulation' }}
                title="Delete Ticket"
                aria-label="Delete Ticket"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          </div>

          {/* Chat Feed */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              background: 'rgba(13, 13, 15, 0.75)',
            }}
          >
            {(activeTicket.messages || []).map((m) => {
              const isCustomer = m.sender === 'customer'
              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isCustomer ? 'flex-start' : 'flex-end',
                    maxWidth: '82%',
                    alignSelf: isCustomer ? 'flex-start' : 'flex-end',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.7rem',
                      color: isCustomer ? '#dfb15b' : '#38bdf8',
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
                      background: isCustomer
                        ? 'rgba(34, 32, 27, 0.9)'
                        : 'linear-gradient(135deg, #0284c7, #0369a1)',
                      color: '#fafaf9',
                      border: isCustomer ? '1px solid rgba(223, 177, 91,0.3)' : 'none',
                      borderRadius: isCustomer ? '16px 16px 16px 2px' : '16px 16px 2px 16px',
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

          {/* Quick Reply Chips */}
          <div
            style={{
              padding: '0.5rem 0.75rem',
              background: 'rgba(18, 18, 20, 0.9)',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              gap: '0.4rem',
              overflowX: 'auto',
            }}
          >
            {QUICK_REPLIES.map((qr, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setReplyText(qr)}
                style={{
                  background: 'rgba(39, 39, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#d6d3d1',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '0.74rem',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  fontWeight: 600,
                  minHeight: '32px',
                  touchAction: 'manipulation',
                }}
              >
                {qr.slice(0, 26)}...
              </button>
            ))}
          </div>

          {/* Input & Action Bar */}
          <div
            style={{
              background: 'rgba(24, 24, 27, 0.9)',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              padding: '0.75rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
            }}
          >
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void handleSendMessage('in_progress')
                }
              }}
              placeholder="Type official response to customer..."
              style={{
                width: '100%',
                minHeight: '44px',
                padding: '0.65rem 0.85rem',
                borderRadius: '10px',
                background: 'rgba(18, 18, 20, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#fff',
                fontSize: '16px',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                disabled={sending || !replyText.trim()}
                onClick={() => handleSendMessage('in_progress')}
                style={{
                  minHeight: '44px',
                  padding: '0.45rem 1rem',
                  background: 'linear-gradient(135deg, #38bdf8, #0284c7)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: replyText.trim() ? 'pointer' : 'not-allowed',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  touchAction: 'manipulation',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                Send Response
              </button>

              <button
                type="button"
                disabled={sending || !replyText.trim()}
                onClick={() => handleSendMessage('resolved')}
                style={{
                  minHeight: '44px',
                  padding: '0.45rem 1rem',
                  background: 'linear-gradient(135deg, #22c55e, #15803d)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: replyText.trim() ? 'pointer' : 'not-allowed',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  touchAction: 'manipulation',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Send & Resolve
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Ticket Inbox List */
        <div>
          {/* Search Bar */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets by ID, Phone, Customer Name, Subject..."
            style={{
              width: '100%',
              minHeight: '44px',
              padding: '0.65rem 0.85rem',
              borderRadius: '10px',
              background: 'rgba(28, 25, 23, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#fff',
              fontSize: '16px',
              marginBottom: '0.85rem',
              outline: 'none',
            }}
          />

          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '4px', marginBottom: '1.25rem' }}>
            {[
              { id: 'open', label: `Open (${stats.open})`, color: '#dfb15b' },
              { id: 'in_progress', label: `In Progress (${stats.inProgress})`, color: '#38bdf8' },
              { id: 'resolved', label: `Resolved (${stats.resolved})`, color: '#22c55e' },
              { id: 'all', label: `All (${stats.total})`, color: '#fafaf9' },
            ].map((tab) => {
              const isActive = filter === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id as any)}
                  style={{
                    padding: '0.4rem 0.85rem',
                    minHeight: '38px',
                    borderRadius: '20px',
                    border: isActive ? `1.5px solid ${tab.color}` : '1px solid rgba(255, 255, 255, 0.1)',
                    background: isActive ? tab.color : 'rgba(28, 25, 23, 0.7)',
                    color: isActive ? '#18181b' : '#d6d3d1',
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    touchAction: 'manipulation',
                  }}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {loading ? (
            <div className="tfg-glass-card" style={{ textAlign: 'center', padding: '3rem', color: '#dfb15b' }}>
              Loading support tickets...
            </div>
          ) : filtered.length === 0 ? (
            <div className="tfg-glass-card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(34, 197, 94, 0.15)', margin: '0 auto 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <p style={{ color: '#a1a1aa', margin: 0, fontSize: '0.9rem' }}>No tickets in this tab.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filtered.map((t) => {
                const statusBadge: Record<string, { bg: string; color: string; label: string }> = {
                  open: { bg: 'rgba(223, 177, 91,0.15)', color: '#dfb15b', label: 'Open' },
                  in_progress: { bg: 'rgba(56,189,248,0.15)', color: '#38bdf8', label: 'Live Chat' },
                  resolved: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', label: 'Resolved' },
                }
                const b = statusBadge[t.status] || statusBadge.open
                const msgs = t.messages || []
                const lastMsg = msgs[msgs.length - 1]

                return (
                  <div
                    key={t.id}
                    onClick={() => setActiveTicket(t)}
                    className="tfg-glass-card"
                    style={{
                      padding: '1.15rem',
                      cursor: 'pointer',
                      borderColor: t.status === 'open' ? 'rgba(223, 177, 91,0.45)' : 'rgba(255,255,255,0.08)',
                      boxShadow: t.status === 'open' ? '0 0 16px rgba(223, 177, 91,0.1)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.45rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: '1rem', color: '#fafaf9' }}>#{t.id}</strong>
                          <span style={{ color: '#fafaf9', fontWeight: 700 }}>{t.userName}</span>
                          <span style={{ color: '#a1a1aa', fontSize: '0.75rem' }}>{t.phone}</span>
                          {t.orderId && (
                            <span style={{ color: '#dfb15b', fontSize: '0.75rem', fontWeight: 700 }}>
                              Â· Order #{formatOrderId(t.orderId)}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.9rem', color: '#dfb15b', fontWeight: 800, display: 'block', marginTop: '3px' }}>
                          {t.subject}
                        </span>
                      </div>
                      <span style={{ background: b.bg, color: b.color, border: `1px solid ${b.color}44`, padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800 }}>
                        {b.label}
                      </span>
                    </div>

                    {lastMsg && (
                      <div style={{ background: 'rgba(18, 18, 20, 0.7)', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: '#d6d3d1', marginTop: '0.4rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <span style={{ color: lastMsg.sender === 'customer' ? '#dfb15b' : '#38bdf8', fontWeight: 700, marginRight: '4px' }}>
                          {lastMsg.senderName}:
                        </span>
                        {lastMsg.text}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.65rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: '0.72rem', color: '#71717a' }}>
                        {msgs.length} message(s) Â· {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ''}
                      </span>
                      <span style={{ color: '#dfb15b', fontWeight: 800, fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span>Open Live Chat</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
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
  )
}

