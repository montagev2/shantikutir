import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../context/StoreContext'
import { useDebounce } from '../hooks/useDebounce'
import { STORE_NAME, GOOGLE_MAPS_LOCATION_URL, GOOGLE_MAPS_REVIEW_URL } from '../lib/business'
import FoodDetailModal from '../components/FoodDetailModal'
import PartyBookingModal from '../components/PartyBookingModal'
import { optimizeImageUrl } from '../lib/cache'
import { fuzzyMatchMenuItem, POPULAR_SEARCH_SUGGESTIONS } from '../lib/search'
import type { MenuItem, Order, Portion } from '../types'

// Serving Size Hints
const SERVING_HINTS: Record<string, string> = {
  C: 'Serves 1',
  B: 'Serves 1–2',
  A: 'Serves 3–4',
}

// Smart isVeg fallback
function getIsVeg(item: MenuItem): boolean {
  if (typeof item.isVeg === 'boolean') return item.isVeg
  const NON_VEG_KEYWORDS = ['chicken', 'mutton', 'egg', 'fish', 'prawn', 'kebab', 'keema', 'meat', 'lamb', 'pomfret', 'katla', 'vetki', 'ilish']
  const lower = (item.name + ' ' + (item.category || '')).toLowerCase()
  return !NON_VEG_KEYWORDS.some((kw) => lower.includes(kw))
}

// Veg / Non-Veg Indicator Chip
function VegBadge({ isVeg }: { isVeg: boolean }) {
  return (
    <span
      style={{ display: 'inline-block', flexShrink: 0 }}
      title={isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
    >
      {isVeg ? (
        <span className="veg-badge" />
      ) : (
        <span className="non-veg-badge" />
      )}
    </span>
  )
}

// 4 Signature Shanti Kutir Heritage Dining Experiences
const EXPERIENCE_MODES = [
  {
    mode: 'cottage_dine_in' as const,
    label: 'বাগান কুটির',
    enLabel: 'Garden Cabana',
    tag: 'Private Cabanas & Lawn',
    desc: 'গাছগাছালি ঘেরা নিরিবিলি কাঠের কুটিরে তাজা কয়লা তন্দুর ও আড্ডা।',
    accent: '#dfb15b',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    ),
  },
  {
    mode: 'ac_dine_in' as const,
    label: 'বাতানুকূল দরবার',
    enLabel: 'Royal AC Hall',
    tag: 'Plush Family Dining',
    desc: 'সুপরিসর শীতাতপ নিয়ন্ত্রিত ডাইনিং হলে রাজকীয় খাবার পরিবেশন।',
    accent: '#38bdf8',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="8" rx="2"/><path d="M6 16v2M10 16v2M14 16v2M18 16v2"/></svg>
    ),
  },
  {
    mode: 'takeaway' as const,
    label: 'হাইওয়ে ড্রাইভ-থ্রু',
    enLabel: 'Highway Express',
    tag: '15-min Curbside Pickup',
    desc: 'দীঘা-কলকাতা হাইওয়েতে সফররত যাত্রীদের জন্য দ্রুত পার্সেল হ্যান্ডওভার।',
    accent: '#ea580c',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 10.7 2 10.8 2 11v5c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
    ),
  },
  {
    mode: 'delivery' as const,
    label: 'দোরগোড়ায় খাবার',
    enLabel: 'Doorstep Feast',
    tag: '5 km Radius · Fast Delivery',
    desc: 'তমলুক ও নন্দকুমার এলাকায় আপনার দরজায় পৌঁছে দেওয়া গরম গরম ভোজন।',
    accent: '#22c55e',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>
    ),
  },
]

// Food Card
function FoodCard({
  item,
  onAdd,
  onOpenDetail,
}: {
  item: MenuItem
  onAdd: (item: MenuItem, portion: Portion) => void
  onOpenDetail: (item: MenuItem) => void
}) {
  const { cart, updateCartQty, lang } = useStore()

  const priceMap: Record<string, number> = {
    A: item.pA ?? item.price_a ?? 0,
    B: item.pB ?? item.price_b ?? item.price_a ?? 0,
    C: item.pC ?? item.price_c ?? item.price_a ?? 0,
  }
  const availablePortions = (['C', 'B', 'A'] as Portion[]).filter((p) => priceMap[p] > 0)
  const defaultPortion: Portion = availablePortions.includes('B') ? 'B' : (availablePortions[0] || 'B')
  const [portion, setPortion] = useState<Portion>(defaultPortion)

  const effectivePortion: Portion = availablePortions.includes(portion) ? portion : defaultPortion
  const currentPrice = priceMap[effectivePortion] || 0
  const itemIsVeg = getIsVeg(item)

  const cartItem = cart.find((c) => c.productId === item.id && c.portion === effectivePortion)
  const cartQty = cartItem ? (cartItem.quantity || cartItem.qty || 0) : 0

  return (
    <article className="sk-brass-card food-card" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Dish Photo Container */}
      {item.imageUrl ? (
        <div
          className="food-img-container"
          onClick={() => onOpenDetail(item)}
          style={{
            position: 'relative',
            height: '185px',
            width: '100%',
            overflow: 'hidden',
            background: '#090807',
            cursor: 'pointer',
          }}
        >
          <img
            src={optimizeImageUrl(item.imageUrl, 550, 80)}
            alt={item.name}
            className="food-img-hover"
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
            loading="lazy"
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, transparent 50%, rgba(18, 16, 14, 0.95) 100%)',
              pointerEvents: 'none',
            }}
          />
          <span
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              background: 'rgba(18, 16, 14, 0.88)',
              backdropFilter: 'blur(8px)',
              color: '#dfb15b',
              fontSize: '0.68rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '6px',
              border: '1px solid rgba(223, 177, 91, 0.35)',
            }}
          >
            {item.category}
          </span>
          <span
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              background: 'rgba(18, 16, 14, 0.88)',
              backdropFilter: 'blur(8px)',
              padding: '4px 6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <VegBadge isVeg={itemIsVeg} />
          </span>
        </div>
      ) : (
        <div
          onClick={() => onOpenDetail(item)}
          style={{
            padding: '0.85rem 1rem 0.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            cursor: 'pointer',
          }}
        >
          <span
            style={{
              background: 'rgba(223, 177, 91, 0.08)',
              color: '#dfb15b',
              fontSize: '0.70rem',
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: '6px',
              border: '1px solid rgba(223, 177, 91, 0.25)',
            }}
          >
            {item.category}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <VegBadge isVeg={itemIsVeg} />
          </div>
        </div>
      )}

      {/* Card Body */}
      <div style={{ padding: '1.1rem', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between', gap: '0.75rem' }}>
        <div>
          <div
            onClick={() => onOpenDetail(item)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.35rem', cursor: 'pointer' }}
          >
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#fbfaf7', fontWeight: 800, lineHeight: 1.3 }}>
              {lang === 'bn' && item.bnName ? item.bnName : item.name}
            </h3>
          </div>

          {item.description && (
            <p className="text-clamp-2" style={{ fontSize: '0.78rem', color: '#a8a29e', margin: 0, lineHeight: 1.45 }}>
              {item.description}
            </p>
          )}
        </div>

        <div>
          {/* Portion Selector Tabs */}
          {availablePortions.length > 1 && (
            <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.75rem' }}>
              {availablePortions.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    try { navigator.vibrate?.(10) } catch {}
                    setPortion(p)
                  }}
                  className={`portion-btn${effectivePortion === p ? ' active' : ''}`}
                  title={SERVING_HINTS[p]}
                  style={{
                    borderColor: effectivePortion === p ? '#dfb15b' : 'rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <span style={{ display: 'block' }}>
                    {p === 'C' ? 'হাফ' : p === 'B' ? 'ফুল' : 'স্পেশাল'}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '1px', fontSize: '0.70rem', marginTop: '2px', fontWeight: 800 }}>
                    <span style={{ fontSize: '0.60rem', opacity: 0.85 }}>Rs.</span>{priceMap[p]}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Price & Add to Cart */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(223, 177, 91, 0.15)', paddingTop: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              <span style={{ fontSize: '0.82rem', color: '#f3d085', fontWeight: 800, opacity: 0.85 }}>Rs.</span>
              <span style={{ fontSize: '1.3rem', color: '#f3d085', fontWeight: 900, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                {currentPrice}
              </span>
            </div>

            {cartQty > 0 ? (
              <div className="qty-stepper-spring" style={{ border: '1.5px solid #dfb15b' }}>
                <button
                  type="button"
                  onClick={() => {
                    try { navigator.vibrate?.(12) } catch {}
                    updateCartQty(item.id, effectivePortion, cartQty - 1)
                  }}
                  aria-label="Decrease quantity"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#dfb15b',
                    fontSize: '1.25rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    width: '32px',
                    height: '32px',
                    minWidth: '32px',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  -
                </button>
                <span style={{ fontWeight: 900, color: '#fbfaf7', fontSize: '0.88rem', minWidth: '22px', textAlign: 'center' }}>
                  {cartQty}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    try { navigator.vibrate?.(12) } catch {}
                    updateCartQty(item.id, effectivePortion, cartQty + 1)
                  }}
                  aria-label="Increase quantity"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#dfb15b',
                    fontSize: '1.25rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    width: '32px',
                    height: '32px',
                    minWidth: '32px',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  +
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  try { navigator.vibrate?.(15) } catch {}
                  onAdd(item, effectivePortion)
                }}
                className="sk-btn-gold"
                style={{
                  padding: '0.55rem 1.25rem',
                  fontSize: '0.88rem',
                  minHeight: '38px',
                }}
              >
                + যুক্ত করুন
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

// Chef's Signature Showcase Configurations
interface SignatureConfig {
  matchKeywords: string[]
  badge: string
  subtitle: string
}

const SIGNATURE_CONFIGS: SignatureConfig[] = [
  {
    matchKeywords: ['kutir signature thali', 'signature thali', 'thali'],
    badge: 'জমিদারী থালি',
    subtitle: '৭ পদের ঐতিহ্যবাহী খাঁটি বাঙালি মধ্যাহ্নভোজন — মাছ, ডাল, ভাজা ও মিষ্টান্ন',
  },
  {
    matchKeywords: ['chicken dum biryani', 'dum biryani', 'special chicken'],
    badge: 'নবাবী দম পোখত',
    subtitle: 'দীর্ঘ সময় সিল করা মাটির হাঁড়িতে সুবাসিত বাসমতী ও জুসি চিকেন',
  },
  {
    matchKeywords: ['mutton kacchi', 'mutton biryani', 'mutton'],
    badge: 'হাঁড়ি খাসি দম',
    subtitle: 'জাফরানি ধোঁয়ায় সেদ্ধ নরম কচি পাঁঠার মাংসের শাহী কাচ্চি',
  },
  {
    matchKeywords: ['reshmi malai', 'chicken malai', 'malai kabab'],
    badge: 'কয়লার মালাই শিক',
    subtitle: 'এলাচ ও ক্রিম চিজের প্রলেপে চারকোল সিগড়িতে সেঁকা রাজকীয় কাবাব',
  },
  {
    matchKeywords: ['butter chicken', 'butter chicken masala'],
    badge: 'মাখন মাখনি চিকেন',
    subtitle: 'তন্দুর গ্রিলড চিকেন ও কাজু-মাখনের ঘন মখমলি গ্রেভি',
  },
]

function SignatureCard({
  item,
  badge,
  subtitle,
  onAdd,
  onOpenDetail,
}: {
  item: MenuItem
  badge: string
  subtitle: string
  onAdd: (item: MenuItem, portion: Portion) => void
  onOpenDetail: (item: MenuItem) => void
}) {
  const { cart, updateCartQty, lang } = useStore()
  const priceMap: Record<string, number> = {
    A: item.pA ?? item.price_a ?? 0,
    B: item.pB ?? item.price_b ?? item.price_a ?? 0,
    C: item.pC ?? item.price_c ?? item.price_a ?? 0,
  }
  const availablePortions = (['C', 'B', 'A'] as Portion[]).filter((p) => priceMap[p] > 0)
  const defaultPortion: Portion = availablePortions.includes('B') ? 'B' : (availablePortions[0] || 'B')
  const currentPrice = priceMap[defaultPortion] || 0
  const itemIsVeg = getIsVeg(item)

  const cartItem = cart.find((c) => c.productId === item.id && c.portion === defaultPortion)
  const cartQty = cartItem ? (cartItem.quantity || cartItem.qty || 0) : 0

  return (
    <article className="sk-brass-card signature-card" style={{ minWidth: '290px' }}>
      <span className="sk-badge-royal" style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 5 }}>
        {badge}
      </span>

      <div
        className="food-img-container"
        onClick={() => onOpenDetail(item)}
        style={{
          position: 'relative',
          height: '190px',
          width: '100%',
          overflow: 'hidden',
          background: '#090807',
          cursor: 'pointer',
        }}
      >
        <img
          src={optimizeImageUrl(item.imageUrl || '/dishes/kutir-signature-thali.jpg', 600, 80)}
          alt={item.name}
          className="food-img-hover"
          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
          loading="lazy"
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, transparent 40%, rgba(18, 16, 14, 0.95) 100%)',
            pointerEvents: 'none',
          }}
        />
        <span
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'rgba(18, 16, 14, 0.88)',
            backdropFilter: 'blur(8px)',
            padding: '4px 6px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            zIndex: 4,
          }}
        >
          <VegBadge isVeg={itemIsVeg} />
        </span>
      </div>

      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between', gap: '0.75rem' }}>
        <div>
          <h3
            onClick={() => onOpenDetail(item)}
            style={{
              margin: 0,
              fontSize: '1.05rem',
              color: '#fbfaf7',
              fontWeight: 800,
              lineHeight: 1.3,
              cursor: 'pointer',
            }}
          >
            {lang === 'bn' && item.bnName ? item.bnName : item.name}
          </h3>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.76rem', color: '#a8a29e', lineHeight: 1.45 }}>
            {subtitle}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(223, 177, 91, 0.15)', paddingTop: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
            <span style={{ fontSize: '0.82rem', color: '#f3d085', fontWeight: 800, opacity: 0.85 }}>Rs.</span>
            <span style={{ fontSize: '1.3rem', color: '#f3d085', fontWeight: 900, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              {currentPrice}
            </span>
          </div>

          {cartQty > 0 ? (
            <div className="qty-stepper-spring" style={{ border: '1.5px solid #dfb15b' }}>
              <button
                type="button"
                onClick={() => {
                  try { navigator.vibrate?.(12) } catch {}
                  updateCartQty(item.id, defaultPortion, cartQty - 1)
                }}
                aria-label="Decrease quantity"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#dfb15b',
                  fontSize: '1.25rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  width: '32px',
                  height: '32px',
                  minWidth: '32px',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                -
              </button>
              <span style={{ fontWeight: 900, color: '#fbfaf7', fontSize: '0.88rem', minWidth: '22px', textAlign: 'center' }}>
                {cartQty}
              </span>
              <button
                type="button"
                onClick={() => {
                  try { navigator.vibrate?.(12) } catch {}
                  updateCartQty(item.id, defaultPortion, cartQty + 1)
                }}
                aria-label="Increase quantity"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#dfb15b',
                  fontSize: '1.25rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  width: '32px',
                  height: '32px',
                  minWidth: '32px',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                try { navigator.vibrate?.(15) } catch {}
                onAdd(item, defaultPortion)
              }}
              className="sk-btn-gold"
              style={{
                padding: '0.55rem 1.25rem',
                fontSize: '0.82rem',
              }}
            >
              + যুক্ত করুন
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

// Menu Page
export default function Menu() {
  const { menu, orders, addToCart, reorder, lang, cartCount } = useStore()
  const navigate = useNavigate()
  const [selectedCat, setSelectedCat] = useState('All')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 250)
  const [vegOnly, setVegOnly] = useState(false)
  const [selectedItemForModal, setSelectedItemForModal] = useState<MenuItem | null>(null)
  const [activeExpMode, setActiveExpMode] = useState<'delivery' | 'ac_dine_in' | 'cottage_dine_in' | 'takeaway'>(() => {
    try {
      const saved = (localStorage.getItem('sk_preferred_mode') || sessionStorage.getItem('sk_preferred_mode')) as 'delivery' | 'ac_dine_in' | 'cottage_dine_in' | 'takeaway'
      if (saved && ['delivery', 'ac_dine_in', 'cottage_dine_in', 'takeaway'].includes(saved)) {
        return saved
      }
    } catch {}
    return 'cottage_dine_in'
  })
  const [showBookingModal, setShowBookingModal] = useState(false)

  useEffect(() => {
    if (cartCount > 0) {
      document.body.classList.add('has-cart-bar')
    } else {
      document.body.classList.remove('has-cart-bar')
    }
    return () => {
      document.body.classList.remove('has-cart-bar')
    }
  }, [cartCount])

  const handleExpModeChange = (mode: 'delivery' | 'ac_dine_in' | 'cottage_dine_in' | 'takeaway') => {
    setActiveExpMode(mode)
    try {
      localStorage.setItem('sk_preferred_mode', mode)
      sessionStorage.setItem('sk_preferred_mode', mode)
    } catch {}
  }

  const recentOrder = orders[0]

  const handleQuickReorder = (ord: Order) => {
    reorder(ord)
    navigate('/checkout')
  }

  const categories = useMemo(() => {
    const activeItems = menu.filter((m) => !m.archived)
    const set = new Set(activeItems.map((m) => m.category))
    return ['All', ...Array.from(set)]
  }, [menu])

  const filtered = useMemo(() => {
    return menu.filter((m) => {
      if (m.archived) return false
      const catOk = selectedCat === 'All' || m.category === selectedCat
      const searchOk = fuzzyMatchMenuItem(m, debouncedSearch)
      const vegOk = !vegOnly || getIsVeg(m)
      return catOk && searchOk && vegOk
    })
  }, [menu, selectedCat, debouncedSearch, vegOnly])

  const signatureDishes = useMemo(() => {
    const result: { item: MenuItem; badge: string; subtitle: string }[] = []
    const usedIds = new Set<string>()

    for (const cfg of SIGNATURE_CONFIGS) {
      const found = menu.find((m) => {
        if (m.archived || !m.imageUrl || usedIds.has(m.id)) return false
        const lower = m.name.toLowerCase()
        return cfg.matchKeywords.some((kw) => lower.includes(kw))
      })
      if (found) {
        usedIds.add(found.id)
        result.push({ item: found, badge: cfg.badge, subtitle: cfg.subtitle })
      }
    }

    if (result.length < 5) {
      for (const m of menu) {
        if (result.length >= 5) break
        if (!m.archived && m.imageUrl && !usedIds.has(m.id)) {
          usedIds.add(m.id)
          result.push({ item: m, badge: 'খাস পদ', subtitle: 'তাজা উপাদানে প্রস্তুত আমাদের শেফের নিজস্ব স্পেশাল' })
        }
      }
    }

    return result
  }, [menu])

  return (
    <div className="page shop-page" style={{ maxWidth: '1240px', margin: '0 auto', padding: '1.25rem 1rem' }}>

      {/* Royal Bengal Pavilion Grand Hero Section */}
      <section
        style={{
          background: 'linear-gradient(180deg, rgba(18, 15, 12, 0.72) 0%, rgba(12, 10, 8, 0.96) 80%, #0a0908 100%), url(/sk-ambiance.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 35%',
          borderRadius: '24px',
          padding: '2.5rem 1.5rem 2rem',
          textAlign: 'center',
          border: '1.5px solid rgba(223, 177, 91, 0.28)',
          marginBottom: '1.5rem',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Radiating Antique Brass Radial Warmth */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse 70% 55% at 50% 0%, rgba(223, 177, 91, 0.22), transparent 75%)',
            pointerEvents: 'none',
          }}
        />

        {/* Centered Grand Crest & Royal Title */}
        <div style={{ position: 'relative', zIndex: 2, marginBottom: '1.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '14px', marginBottom: '0.5rem' }}>
            <img
              src="/sk-logo.svg"
              alt="Shanti Kutir Logo"
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid #dfb15b',
                boxShadow: '0 4px 20px rgba(223, 177, 91, 0.45)',
              }}
            />
            <h1 className="sk-gold-text brand-heading" style={{ fontSize: 'clamp(1.8rem, 4.2vw, 2.75rem)', margin: 0, textShadow: '0 2px 20px rgba(0,0,0,0.9)' }}>
              {STORE_NAME}
            </h1>
          </div>
          <h2 style={{ fontSize: '1rem', color: '#fbfaf7', fontWeight: 600, margin: '0 auto 0.6rem', maxWidth: '580px', lineHeight: 1.5 }}>
            {lang === 'bn' ? 'শান্তি ও স্বাদের মেলবন্ধন — খাঁটি বাঙালি ভোজন ও কয়লা তন্দুর' : 'A Haven of Serenity & Taste — Authentic Bengali Cuisine & Charcoal Tandoor'}
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#c5b8a5', margin: '0 auto 0.85rem' }}>
            Tamluk-Nandakumar Road, NH-116 Highway Resort, Purba Medinipur
          </p>

          {/* Heritage Verification Badges */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <a
              href={GOOGLE_MAPS_REVIEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(223, 177, 91, 0.12)',
                border: '1px solid rgba(223, 177, 91, 0.4)',
                color: '#f3d085',
                padding: '5px 14px',
                borderRadius: '24px',
                fontSize: '0.76rem',
                fontWeight: 800,
                textDecoration: 'none',
                backdropFilter: 'blur(8px)',
              }}
              title="Google Verified 4.8 Rating"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#dfb15b" stroke="#dfb15b" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
              <span>4.8 Rating (500+ Google Reviews)</span>
            </a>
            <a
              href={GOOGLE_MAPS_LOCATION_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                color: '#e7e5e4',
                padding: '5px 14px',
                borderRadius: '24px',
                fontSize: '0.76rem',
                fontWeight: 700,
                textDecoration: 'none',
                backdropFilter: 'blur(8px)',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#dfb15b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
              <span>Highway Location Map</span>
            </a>
          </div>
        </div>

        {/* Quick Reorder Strip for Returning Guests */}
        {recentOrder && recentOrder.items && recentOrder.items.length > 0 && (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(28, 25, 22, 0.95), rgba(18, 16, 14, 0.98))',
              border: '1px solid rgba(223, 177, 91, 0.45)',
              borderRadius: '14px',
              padding: '0.6rem 1rem',
              margin: '0 auto 1.25rem',
              maxWidth: '520px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              position: 'relative',
              zIndex: 2,
            }}
          >
            <div style={{ textAlign: 'left', minWidth: 0, fontSize: '0.80rem', color: '#fbfaf7', lineHeight: 1.35 }}>
              <span style={{ color: '#f3d085', fontWeight: 800 }}>পূর্ববর্তী পছন্দ: </span>
              {recentOrder.items.map((i) => `${i.qty || i.quantity}x ${i.name}`).join(', ')} (Rs. {recentOrder.total})
            </div>
            <button
              type="button"
              onClick={() => handleQuickReorder(recentOrder)}
              className="sk-btn-gold"
              style={{
                padding: '0.4rem 0.85rem',
                fontSize: '0.75rem',
                flexShrink: 0,
              }}
            >
              + পুনরায় অর্ডার
            </button>
          </div>
        )}

        {/* Shanti Kutir Curated Dining Experience Showcase */}
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '1080px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
            {EXPERIENCE_MODES.map((m) => {
              const isActive = activeExpMode === m.mode
              return (
                <div
                  key={m.mode}
                  onClick={() => handleExpModeChange(m.mode)}
                  className={`sk-experience-pill ${isActive ? 'active' : ''}`}
                >
                  <span style={{ color: isActive ? '#f3d085' : m.accent, display: 'inline-flex' }}>
                    {m.icon}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ fontSize: '0.90rem', color: isActive ? '#f3d085' : '#fbfaf7', display: 'block', fontWeight: 800 }}>
                      {lang === 'bn' ? m.label : m.enLabel}
                    </strong>
                    <span style={{ fontSize: '0.70rem', color: isActive ? '#fcd34d' : '#a8a29e', display: 'block' }}>
                      {m.tag}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Dynamic Booking CTA */}
          {(activeExpMode === 'cottage_dine_in' || activeExpMode === 'ac_dine_in') && (
            <div style={{ marginTop: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowBookingModal(true)}
                className="sk-btn-gold"
                style={{
                  padding: '0.65rem 1.6rem',
                  fontSize: '0.88rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {activeExpMode === 'ac_dine_in' ? 'বাতানুকূল দরবার টেবিল বুক করুন (Book AC Table)' : 'বাগান কুটির বুক করুন (Reserve Garden Cabana)'}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Sticky Search & Cultural Category Strip */}
      <div className="sticky-search-category" style={{ position: 'sticky', top: '70px', zIndex: 80, background: 'rgba(10, 9, 8, 0.96)', backdropFilter: 'blur(20px)', padding: '0.85rem 0', marginBottom: '1.25rem' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={lang === 'bn' ? 'বিরিয়ানি, ইলিশ পাতুড়ি, চিকেন ডাকবাংলো, তন্দুর...' : 'Search Biryani, Fish Paturi, Kebabs, Desserts...'}
          style={{
            width: '100%',
            padding: '0.75rem 1.15rem',
            borderRadius: '14px',
            background: '#181614',
            border: '1.5px solid rgba(223, 177, 91, 0.25)',
            color: '#fbfaf7',
            fontSize: '0.92rem',
            outline: 'none',
            marginBottom: '0.65rem',
            transition: 'border-color 0.2s ease',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#dfb15b' }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(223, 177, 91, 0.25)' }}
        />

        <div className="category-scroll-strip" style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
          <button
            type="button"
            onClick={() => setVegOnly((v) => !v)}
            className={`veg-toggle${vegOnly ? ' active' : ''}`}
            style={{
              borderColor: vegOnly ? '#22c55e' : 'rgba(223, 177, 91, 0.2)',
            }}
          >
            <span className="veg-badge" style={{ width: '14px', height: '14px', border: `2px solid ${vegOnly ? 'var(--veg-color, #22c55e)' : 'var(--text-muted, #a8a29e)'}` }}>
              <span style={{ display: 'block', width: '6px', height: '6px', borderRadius: '50%', background: vegOnly ? 'var(--veg-color, #22c55e)' : 'var(--text-muted, #a8a29e)' }} />
            </span>
            {lang === 'bn' ? 'শুধুমাত্র নিরামিষ' : 'Pure Veg'}
          </button>

          {categories.map((c) => {
            const isActive = selectedCat === c
            return (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedCat(c)}
                className={`category-pill${isActive ? ' active' : ''}`}
                style={{
                  background: isActive ? 'linear-gradient(135deg, #dfb15b 0%, #b88628 100%)' : '#1c1916',
                  color: isActive ? '#12100e' : '#d5cfc5',
                  border: `1.5px solid ${isActive ? '#dfb15b' : 'rgba(223, 177, 91, 0.2)'}`,
                  fontWeight: 800,
                  fontSize: '0.80rem',
                  letterSpacing: '0.03em',
                  padding: '0.45rem 1rem',
                  borderRadius: '24px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {c === 'All' ? (lang === 'bn' ? 'সকল পদ (ALL)' : 'ALL DISHES') : c.toUpperCase()}
              </button>
            )
          })}
        </div>
      </div>

      {/* Chef's Signature Showcase Carousel ("ঐতিহ্যের রাজকীয় খাস পদ") */}
      {selectedCat === 'All' && !debouncedSearch.trim() && !vegOnly && signatureDishes.length > 0 && (
        <section style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '1rem', padding: '0 0.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#dfb15b', boxShadow: '0 0 10px #dfb15b' }} />
                <span style={{ fontSize: '0.72rem', letterSpacing: '0.12em', color: '#dfb15b', fontWeight: 900, textTransform: 'uppercase' }}>
                  Royal Culinary Heritage
                </span>
              </div>
              <h2 className="sk-gold-text section-title" style={{ fontSize: '1.35rem', margin: 0, fontWeight: 900, lineHeight: 1.2 }}>
                {lang === 'bn' ? 'ঐতিহ্যের বিশেষ পদ ও সেরা খাবার' : "Chef's Signatures & Royal Creations"}
              </h2>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#a8a29e', fontWeight: 600 }}>
              {lang === 'bn' ? 'ডানদিকে দেখুন →' : 'Swipe to explore →'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '1.15rem', overflowX: 'auto', paddingBottom: '10px', scrollbarWidth: 'none' }}>
            {signatureDishes.map(({ item, badge, subtitle }) => (
              <SignatureCard
                key={`sig-${item.id}`}
                item={item}
                badge={badge}
                subtitle={subtitle}
                onAdd={(it, port) => addToCart(it.id, port)}
                onOpenDetail={(it) => setSelectedItemForModal(it)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Main Food Card Grid */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '1.15rem', color: '#f3d085', fontWeight: 800, margin: '0 0 1rem' }}>
          {selectedCat === 'All' ? (lang === 'bn' ? 'সম্পূর্ণ ভোজন সম্ভার' : 'Complete Menu Offering') : selectedCat}
        </h3>

        {filtered.length === 0 ? (
          <div className="empty-state" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', background: '#181512', borderRadius: '20px', border: '1px solid rgba(223, 177, 91, 0.2)' }}>
            <span className="empty-state-icon" style={{ display: 'inline-flex', color: '#dfb15b', marginBottom: '0.75rem' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            <p style={{ color: '#a8a29e', fontSize: '0.95rem' }}>
              {vegOnly
                ? 'এই বিভাগে কোনো নিরামিষ পদ পাওয়া যায়নি।'
                : debouncedSearch.trim()
                ? `"${debouncedSearch}" দিয়ে কোনো পদ খুঁজে পাওয়া যায়নি। নিচের জনপ্রিয় পদগুলি দেখতে পারেন:`
                : 'কোনো পদ পাওয়া যায়নি। অন্য কিছু অনুসন্ধান করুন।'}
            </p>
            {debouncedSearch.trim() && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', justifyContent: 'center', maxWidth: '540px', margin: '1rem auto 1.25rem' }}>
                {POPULAR_SEARCH_SUGGESTIONS.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => { setSearch(sug); setSelectedCat('All'); setVegOnly(false) }}
                    style={{
                      background: 'rgba(223, 177, 91, 0.08)',
                      border: '1px solid rgba(223, 177, 91, 0.35)',
                      color: '#f3d085',
                      padding: '0.4rem 0.95rem',
                      borderRadius: '9999px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {sug}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => { setSearch(''); setSelectedCat('All'); setVegOnly(false) }}
              className="sk-btn-gold"
              style={{ marginTop: '0.5rem', padding: '0.55rem 1.4rem' }}
            >
              ফিল্টার মুছুন (Clear Filters)
            </button>
          </div>
        ) : (
          <div className="food-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(285px, 1fr))', gap: '1.25rem' }}>
            {filtered.map((item) => (
              <FoodCard
                key={item.id}
                item={item}
                onAdd={(it, port) => addToCart(it.id, port)}
                onOpenDetail={(it) => setSelectedItemForModal(it)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dish Detail Modal */}
      {selectedItemForModal && (
        <FoodDetailModal
          item={selectedItemForModal}
          onClose={() => setSelectedItemForModal(null)}
          onAdd={(it, port) => addToCart(it.id, port)}
        />
      )}

      {/* Table & Party Booking Modal */}
      {showBookingModal && (
        <PartyBookingModal onClose={() => setShowBookingModal(false)} />
      )}
    </div>
  )
}
