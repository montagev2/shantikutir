import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useStore } from '../context/StoreContext'
import { showToast } from './Toast'
import { safeGetJSON, safeSetJSON } from '../lib/storage'

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000

interface BannerItem {
  id: string
  badge: string
  title: string
  subtitle: string
  couponCode?: string
  emoji: string
  time?: string
}

export default function CustomerNotificationBanner() {
  const { user } = useAuth()
  const { lang } = useStore()
  const [bannerItem, setBannerItem] = useState<BannerItem | null>(null)
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    return safeGetJSON<string[]>('sk_dismissed_notifs', [])
  })

  // Fetch recent announcements
  useEffect(() => {
    let isMounted = true

    const loadAnnouncements = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('id, user_id, title, message, type, link, sender, created_at')
          .order('created_at', { ascending: false })
          .limit(8)

        if (error || !data || !isMounted) return

        // Find the latest active announcement not yet dismissed
        const candidate = data.find((n: any) => {
          const isTarget = !n.user_id || n.user_id === 'all' || (user && n.user_id === user.id)
          const isRecent = Date.now() - new Date(n.created_at).getTime() < TWENTY_FOUR_HOURS
          const isNotDismissed = !dismissedIds.includes(n.id)
          return isTarget && isRecent && isNotDismissed
        })

        if (candidate) {
          const couponMatch =
            (candidate.message || '').match(/(?:code|কোড|coupon|কুপন)[:\s]+([A-Za-z0-9_-]{3,15})/i) ||
            (candidate.title || '').match(/(?:code|কোড|coupon|কুপন)[:\s]+([A-Za-z0-9_-]{3,15})/i)

          setBannerItem({
            id: candidate.id,
            badge: candidate.sender || (lang === 'bn' ? 'রেস্তোরাঁ নোটিশ' : 'Restaurant Notice'),
            title: candidate.title,
            subtitle: candidate.message,
            couponCode: couponMatch ? couponMatch[1].toUpperCase() : undefined,
            emoji: '',
            time: new Date(candidate.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          })
          return
        }
      } catch (err) {
        console.error('Failed to load store announcement:', err)
      }
    }

    loadAnnouncements()

    // Real-time subscription for live kitchen / admin announcements
    const channel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const n = payload.new as any
          const isTarget = !n.user_id || n.user_id === 'all' || (user && n.user_id === user.id)
          if (!isTarget) return

          const couponMatch =
            (n.message || '').match(/(?:code|কোড|coupon|কুপন)[:\s]+([A-Za-z0-9_-]{3,15})/i) ||
            (n.title || '').match(/(?:code|কোড|coupon|কুপন)[:\s]+([A-Za-z0-9_-]{3,15})/i)

          setBannerItem({
            id: n.id,
            badge: n.sender || 'Live Announcement',
            title: n.title,
            subtitle: n.message,
            couponCode: couponMatch ? couponMatch[1].toUpperCase() : undefined,
            emoji: '',
            time: new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          })
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [dismissedIds, user, lang])

  const handleDismiss = (id: string) => {
    const updated = [...dismissedIds, id]
    setDismissedIds(updated)
    safeSetJSON('sk_dismissed_notifs', updated)
    setBannerItem(null)
  }

  const handleClaimCoupon = (code: string, id: string) => {
    if (!code) return
    try {
      sessionStorage.setItem('sk_pending_coupon', code.toUpperCase())
      navigator.clipboard?.writeText(code.toUpperCase()).catch(() => {})
      const msg = lang === 'bn'
        ? 'কুপন "' + code.toUpperCase() + '" কপি ও চেকআউটে যুক্ত হয়েছে!'
        : 'Coupon "' + code.toUpperCase() + '" claimed & ready at checkout!'
      showToast(msg)
    } catch {}
    handleDismiss(id)
  }

  if (!bannerItem) return null

  return (
    <div
      role="alert"
      style={{
        position: 'fixed',
        top: '12px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        width: 'calc(100% - 24px)',
        maxWidth: '660px',
        background: 'linear-gradient(135deg, #1c1917 0%, #291807 100%)',
        border: '1.5px solid rgba(245, 158, 11, 0.45)',
        borderRadius: '16px',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.65), 0 0 24px rgba(245, 158, 11, 0.25)',
        padding: '0.85rem 1.15rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.85rem',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        animation: 'islandSlideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.74rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#fbbf24',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }} />
            {bannerItem.badge}
          </span>
          {bannerItem.time && (
            <>
              <span style={{ opacity: 0.5 }}>•</span>
              <span style={{ fontWeight: 500, color: '#a8a29e' }}>{bannerItem.time}</span>
            </>
          )}
        </div>
        <div style={{ fontWeight: 800, fontSize: '0.92rem', marginTop: '0.2rem', color: '#fafaf9', lineHeight: 1.3 }}>
          {bannerItem.title}
        </div>
        {bannerItem.subtitle && (
          <div style={{ fontSize: '0.78rem', color: '#d6d3d1', marginTop: '0.15rem', lineHeight: 1.35, wordBreak: 'break-word' }}>
            {bannerItem.subtitle}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
        {bannerItem.couponCode && (
          <button
            type="button"
            onClick={() => handleClaimCoupon(bannerItem.couponCode!, bannerItem.id)}
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              border: 'none',
              color: '#18181b',
              padding: '0.42rem 0.75rem',
              borderRadius: '20px',
              fontSize: '0.78rem',
              fontWeight: 900,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 10px rgba(245, 158, 11, 0.4)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>
            {bannerItem.couponCode}
          </button>
        )}

        <button
          type="button"
          onClick={() => handleDismiss(bannerItem.id)}
          title={lang === 'bn' ? 'নোটিশটি বাতিল করুন' : 'Dismiss notice'}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#a8a29e',
            padding: '0.4rem 0.65rem',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)'
            e.currentTarget.style.color = '#ffffff'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
            e.currentTarget.style.color = '#a8a29e'
          }}
        >
          {lang === 'bn' ? 'বাতিল' : 'Dismiss'}
        </button>
      </div>
    </div>
  )
}
