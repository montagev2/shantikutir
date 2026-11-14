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
const SERVING_HINTS: Record<Portion, string> = {
  C: 'Serves 1',
  B: 'Serves 1–2',
  A: 'Serves 3–4',
}

// Smart isVeg fallback
function getIsVeg(item: MenuItem): boolean {
  if (typeof item.isVeg === 'boolean') return item.isVeg
  const NON_VEG_KEYWORDS = ['chicken', 'mutton', 'egg', 'fish', 'prawn', 'kebab', 'keema', 'meat', 'lamb', 'pomfret', 'katla', 'vetki']
  const lower = (item.name + ' ' + (item.category || '')).toLowerCase()
  return !NON_VEG_KEYWORDS.some((kw) => lower.includes(kw))
}

// Veg / Non-Veg Badge
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

// 4 Signature Dining Modes
const HERO_MODES = [
  {
    mode: 'delivery' as const,
    label: 'Home Delivery',
    tag: '5 km Radius · Free Rs.200+',
    headline: 'Hot & Fresh Delivery to Your Doorstep',
    desc: 'Prompt doorstep delivery within 5 km of Tamluk-Nandakumar.',
    photo: 'ambiance' as const,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>
    ),
    accent: '#22c55e',
    activeClass: 'active-delivery',
  },
  {
    mode: 'cottage_dine_in' as const,
    label: 'Garden Cottage',
    tag: 'Private Cabanas',
    headline: 'Rustic Wooden Cottages & Open Greenery',
    desc: 'Charcoal kebabs and refreshments in private garden cottages.',
    photo: 'ambiance' as const,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    ),
    accent: '#f59e0b',
    activeClass: 'active-cottage_dine_in',
  },
  {
    mode: 'ac_dine_in' as const,
    label: 'AC Dine - In',
    tag: 'Family Dining Hall',
    headline: 'Air-Conditioned Family Dining Hall',
    desc: 'Spacious dining hall with comfortable seating and table service.',
    photo: 'ambiance' as const,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="8" rx="2"/><path d="M6 16v2M10 16v2M14 16v2M18 16v2"/></svg>
    ),
    accent: '#38bdf8',
    activeClass: 'active-ac_dine_in',
  },
  {
    mode: 'takeaway' as const,
    label: 'Highway Takeaway',
    tag: 'Curbside Car Pickup',
    headline: 'Express Curbside Takeaway',
    desc: 'Parking lot handover for travelers on NH-116.',
    photo: 'highway' as const,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 10.7 2 10.8 2 11v5c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
    ),
    accent: '#eab308',
    activeClass: 'active-takeaway',
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

  const priceMap: Record<Portion, number> = {
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
    <article className="food-card">
      {/* Dish Photo */}
      {item.imageUrl ? (
        <div
          className="food-img-container"
          onClick={() => onOpenDetail(item)}
          style={{
            position: 'relative',
            height: '180px',
            width: '100%',
            overflow: 'hidden',
            background: '#09090b',
            cursor: 'pointer',
          }}
        >
          <img
            src={optimizeImageUrl(item.imageUrl, 500, 80)}
            alt={item.name}
            className="food-img-hover"
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
            loading="lazy"
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, transparent 55%, rgba(14,14,16,0.92) 100%)',
              pointerEvents: 'none',
            }}
          />
          <span
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              background: 'rgba(14,14,16,0.85)',
              backdropFilter: 'blur(8px)',
              color: 'var(--primary, #f59e0b)',
              fontSize: '0.70rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '6px',
              border: '1px solid rgba(245,158,11,0.25)',
            }}
          >
            {item.category}
          </span>
          <span
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              background: 'rgba(14,14,16,0.85)',
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
              background: 'rgba(245,158,11,0.08)',
              color: 'var(--primary, #f59e0b)',
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: '6px',
              border: '1px solid rgba(245,158,11,0.25)',
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
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between', gap: '0.75rem' }}>
        <div>
          <div
            onClick={() => onOpenDetail(item)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.3rem', cursor: 'pointer' }}
          >
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#f5f5f4', fontWeight: 800, lineHeight: 1.3 }}>
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
          {/* Portion Selector Pills */}
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
                >
                  <span style={{ display: 'block' }}>
                    {p === 'C' ? 'Half' : p === 'B' ? 'Full' : 'Family'}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '1px', fontSize: '0.70rem', marginTop: '2px', fontWeight: 800 }}>
                    <span style={{ fontSize: '0.60rem', opacity: 0.85 }}>Rs.</span>{priceMap[p]}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Price & Add to Cart */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              <span style={{ fontSize: '0.82rem', color: '#fbbf24', fontWeight: 800, opacity: 0.85 }}>Rs.</span>
              <span style={{ fontSize: '1.24rem', color: '#fbbf24', fontWeight: 900, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                {currentPrice}
              </span>
            </div>

            {cartQty > 0 ? (
              <div className="qty-stepper-spring">
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
                    color: 'var(--primary, #f59e0b)',
                    fontSize: '1.25rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    width: '32px',
                    height: '32px',
                    minWidth: '32px',
                    display: 'grid',
                    placeItems: 'center',
                    touchAction: 'manipulation',
                  }}
                >
                  -
                </button>
                <span style={{ fontWeight: 900, color: '#fafaf9', fontSize: '0.88rem', minWidth: '22px', textAlign: 'center' }}>
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
                    color: 'var(--primary, #f59e0b)',
                    fontSize: '1.25rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    width: '32px',
                    height: '32px',
                    minWidth: '32px',
                    display: 'grid',
                    placeItems: 'center',
                    touchAction: 'manipulation',
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
                className="tfg-btn tfg-btn-primary btn-spring"
                style={{
                  padding: '0.55rem 1.15rem',
                  borderRadius: '8px',
                  fontWeight: 900,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  border: 'none',
                  minHeight: '40px',
                  touchAction: 'manipulation',
                }}
              >
                + Add
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
    badge: "Kutir's Crown",
    subtitle: '7-item royal Bengali thali with steamed rice, dal, and fish paturi',
  },
  {
    matchKeywords: ['chicken dum biryani', 'dum biryani', 'special chicken'],
    badge: 'Chef Dum Special',
    subtitle: 'Aged basmati, saffron dum aroma and tender Kolkata chicken cuts',
  },
  {
    matchKeywords: ['mutton kacchi', 'mutton biryani', 'mutton'],
    badge: 'Slow Handi Dum',
    subtitle: 'Slow simmered baby mutton in royal sealed handi',
  },
  {
    matchKeywords: ['reshmi malai', 'chicken malai', 'malai kabab'],
    badge: 'Melt-in-Mouth',
    subtitle: 'Cardamom and cream cheese charcoal glaze straight from the tandoor',
  },
  {
    matchKeywords: ['butter chicken', 'butter chicken masala'],
    badge: 'Velvet Makhani',
    subtitle: 'Charred tandoor cuts in rich butter and cashew nut reduction',
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
  const priceMap: Record<Portion, number> = {
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
    <article className="signature-card">
      <span className="signature-badge">{badge}</span>

      <div
        className="food-img-container"
        onClick={() => onOpenDetail(item)}
        style={{
          position: 'relative',
          height: '190px',
          width: '100%',
          overflow: 'hidden',
          background: '#09090b',
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
            background: 'linear-gradient(180deg, transparent 40%, rgba(14,14,16,0.92) 100%)',
            pointerEvents: 'none',
          }}
        />
        <span
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'rgba(14,14,16,0.85)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
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

      <div style={{ padding: '0.95rem 1rem', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between', gap: '0.75rem' }}>
        <div>
          <h3
            onClick={() => onOpenDetail(item)}
            style={{
              margin: 0,
              fontSize: '1.02rem',
              color: '#fafaf9',
              fontWeight: 800,
              lineHeight: 1.3,
              cursor: 'pointer',
              letterSpacing: '-0.01em',
            }}
          >
            {lang === 'bn' && item.bnName ? item.bnName : item.name}
          </h3>
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.75rem', color: '#a1a1aa', lineHeight: 1.4 }}>
            {subtitle}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
            <span style={{ fontSize: '0.82rem', color: '#fbbf24', fontWeight: 800, opacity: 0.85 }}>Rs.</span>
            <span style={{ fontSize: '1.24rem', color: '#fbbf24', fontWeight: 900, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              {currentPrice}
            </span>
          </div>

          {cartQty > 0 ? (
            <div className="qty-stepper-spring">
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
                  color: 'var(--primary, #f59e0b)',
                  fontSize: '1.25rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  width: '32px',
                  height: '32px',
                  minWidth: '32px',
                  display: 'grid',
                  placeItems: 'center',
                  touchAction: 'manipulation',
                }}
              >
                -
              </button>
              <span style={{ fontWeight: 900, color: '#fafaf9', fontSize: '0.88rem', minWidth: '22px', textAlign: 'center' }}>
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
                  color: 'var(--primary, #f59e0b)',
                  fontSize: '1.25rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  width: '32px',
                  height: '32px',
                  minWidth: '32px',
                  display: 'grid',
                  placeItems: 'center',
                  touchAction: 'manipulation',
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
              className="btn-spring"
              style={{
                backgroundColor: '#d97706',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#111',
                padding: '0.55rem 1.15rem',
                borderRadius: '8px',
                fontWeight: 900,
                fontSize: '0.82rem',
                cursor: 'pointer',
                border: 'none',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
              }}
            >
              + Add
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
  const [activeHeroMode, setActiveHeroMode] = useState<'delivery' | 'ac_dine_in' | 'cottage_dine_in' | 'takeaway'>(() => {
    try {
      const saved = (localStorage.getItem('sk_preferred_mode') || sessionStorage.getItem('sk_preferred_mode')) as 'delivery' | 'ac_dine_in' | 'cottage_dine_in' | 'takeaway'
      if (saved && ['delivery', 'ac_dine_in', 'cottage_dine_in', 'takeaway'].includes(saved)) {
        return saved
      }
    } catch {}
    return 'cottage_dine_in'
  })
  const [heroPhoto, setHeroPhoto] = useState<'ambiance' | 'highway'>('ambiance')
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

  const currentModeConfig = useMemo(() => {
    return HERO_MODES.find((m) => m.mode === activeHeroMode) || HERO_MODES[1]
  }, [activeHeroMode])

  const handleHeroModeChange = (mode: 'delivery' | 'ac_dine_in' | 'cottage_dine_in' | 'takeaway') => {
    setActiveHeroMode(mode)
    try {
      localStorage.setItem('sk_preferred_mode', mode)
      sessionStorage.setItem('sk_preferred_mode', mode)
    } catch {}
    if (mode === 'takeaway') {
      setHeroPhoto('highway')
    } else {
      setHeroPhoto('ambiance')
    }
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
          result.push({ item: m, badge: 'Heritage Special', subtitle: 'Authentic recipe crafted fresh daily by our chefs' })
        }
      }
    }

    return result
  }, [menu])

  return (
    <div className="page shop-page" style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>

      {/* Clean Luxury Hero Section (Matching TFG's Visual Architecture) */}
      <section
        style={{
          backgroundColor: '#0e0e10',
          background: `linear-gradient(180deg, rgba(14,14,16,0.60) 0%, rgba(14,14,16,0.92) 85%, rgba(14,14,16,1) 100%), url(${heroPhoto === 'highway' ? '/sk-exterior.jpg' : '/sk-ambiance.jpg'})`,
          backgroundSize: 'cover',
          backgroundPosition: heroPhoto === 'highway' ? 'center' : 'center 40%',
          borderRadius: '20px',
          padding: '2rem 1.25rem 1.5rem',
          textAlign: 'center',
          border: '1px solid var(--border, rgba(255,255,255,0.08))',
          marginBottom: '1.25rem',
          boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'background 0.3s ease',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse 65% 50% at 50% 0%, rgba(245,158,11,0.22), transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Centered Brand Header */}
        <div className="hero-brand-block" style={{ position: 'relative', zIndex: 2, marginBottom: '1rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', marginBottom: '0.4rem' }}>
            <img
              src="/sk-logo.svg"
              alt="Shanti Kutir Logo"
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1.5px solid var(--primary, #f59e0b)',
                boxShadow: '0 4px 16px rgba(245, 158, 11, 0.4)',
              }}
            />
            <h1 className="brand-heading" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.5rem)', color: '#fafaf9', margin: 0, textShadow: '0 2px 14px rgba(0,0,0,0.8)' }}>
              {STORE_NAME}
            </h1>
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted, #a1a1aa)', margin: '0 auto 0.65rem', maxWidth: '480px', lineHeight: 1.4 }}>
            Highway Resort, Garden Cottages & Charcoal Tandoor · NH-116
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <a
              href={GOOGLE_MAPS_REVIEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                color: '#fbbf24',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 800,
                textDecoration: 'none',
                backdropFilter: 'blur(8px)',
                cursor: 'pointer',
              }}
              title="Read & Write 5-Star Reviews on Google Maps"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
              <span>4.8 Rating (Google Maps)</span>
            </a>
            <a
              href={GOOGLE_MAPS_LOCATION_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#d4d4d8',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 700,
                textDecoration: 'none',
                backdropFilter: 'blur(8px)',
                cursor: 'pointer',
              }}
              title="Open Location & Directions in Google Maps"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
              <span>Location Map</span>
            </a>
          </div>
        </div>

        {/* Quick Reorder Strip for Returning Diners */}
        {recentOrder && recentOrder.items && recentOrder.items.length > 0 && (
          <div
            style={{
              background: 'rgba(26, 25, 23, 0.88)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              backdropFilter: 'blur(12px)',
              borderRadius: '12px',
              padding: '0.5rem 0.85rem',
              margin: '0 auto 0.85rem',
              maxWidth: '480px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
              position: 'relative',
              zIndex: 2,
            }}
          >
            <div style={{ textAlign: 'left', minWidth: 0, fontSize: '0.78rem', color: '#fafaf9', lineHeight: 1.35, wordBreak: 'break-word' }}>
              <span style={{ color: '#fbbf24', fontWeight: 800 }}>Reorder: </span>
              {recentOrder.items.map((i) => `${i.qty || i.quantity}x ${i.name}`).join(', ')} (Rs.{recentOrder.total})
            </div>
            <button
              type="button"
              onClick={() => handleQuickReorder(recentOrder)}
              style={{
                backgroundColor: '#d97706',
                backgroundImage: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#111',
                border: 'none',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                fontWeight: 900,
                fontSize: '0.75rem',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              + Reorder
            </button>
          </div>
        )}

        {/* 4 Clean Service Mode Tabs */}
        <div
          className="service-card-grid"
          style={{ position: 'relative', zIndex: 2, marginBottom: '0.5rem' }}
        >
          {HERO_MODES.map((m) => {
            const isActive = activeHeroMode === m.mode
            return (
              <button
                key={m.mode}
                type="button"
                onClick={() => handleHeroModeChange(m.mode)}
                className={`service-card ${isActive ? `active ${m.activeClass}` : ''}`}
                style={{
                  padding: '0.7rem 0.65rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  backgroundColor: isActive ? 'rgba(34, 197, 94, 0.22)' : '#18181b',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0, color: isActive ? '#fff' : m.accent }}>{m.icon}</span>
                <div style={{ minWidth: 0, textAlign: 'left' }}>
                  <strong style={{ fontSize: '0.84rem', color: isActive ? '#fff' : 'var(--text-primary, #f5f5f4)', display: 'block', fontWeight: 800, lineHeight: 1.2 }}>
                    {m.label}
                  </strong>
                  <span style={{ fontSize: '0.70rem', color: isActive ? m.accent : 'var(--text-muted, #a8a29e)', display: 'block', marginTop: '1px' }}>
                    {m.tag}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Table & Cottage Booking Action */}
        {(activeHeroMode === 'cottage_dine_in' || activeHeroMode === 'ac_dine_in') && (
          <div style={{ marginTop: '0.75rem', position: 'relative', zIndex: 2 }}>
            <button
              type="button"
              onClick={() => setShowBookingModal(true)}
              style={{
                background: currentModeConfig.accent,
                color: '#111',
                border: 'none',
                padding: '0.55rem 1.15rem',
                borderRadius: '10px',
                fontWeight: 900,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: `0 4px 14px ${currentModeConfig.accent}44`,
              }}
            >
              Book {activeHeroMode === 'ac_dine_in' ? 'AC Table' : 'Garden Cottage'}
            </button>
          </div>
        )}
      </section>

      {/* Sticky Search + Category Bar */}
      <div className="sticky-search-category" style={{ position: 'sticky', top: '64px', zIndex: 80, background: 'rgba(12,11,10,0.95)', backdropFilter: 'blur(16px)', padding: '0.75rem 0', marginBottom: '1rem' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={lang === 'bn' ? 'বিরিয়ানি, কাবাব, থালি, ডাল খুঁজুন...' : 'Search Biryani, Kebabs, Thali, Starters...'}
          style={{
            width: '100%',
            padding: '0.7rem 1rem',
            borderRadius: '14px',
            background: 'var(--surface, #18181b)',
            border: '1.5px solid var(--border-strong, rgba(255,255,255,0.14))',
            color: 'var(--text-primary, #f5f5f4)',
            fontSize: '0.9rem',
            fontFamily: 'inherit',
            outline: 'none',
            marginBottom: '0.55rem',
            transition: 'border-color 0.15s ease',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--primary, #f59e0b)' }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong, rgba(255,255,255,0.14))' }}
        />

        <div className="category-scroll-strip" style={{ display: 'flex', gap: '0.45rem', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
          <button
            type="button"
            onClick={() => setVegOnly((v) => !v)}
            className={`veg-toggle${vegOnly ? ' active' : ''}`}
          >
            <span className="veg-badge" style={{ width: '14px', height: '14px', border: `2px solid ${vegOnly ? 'var(--veg-color, #22c55e)' : 'var(--text-muted, #a8a29e)'}` }}>
              <span style={{ display: 'block', width: '6px', height: '6px', borderRadius: '50%', background: vegOnly ? 'var(--veg-color, #22c55e)' : 'var(--text-muted, #a8a29e)' }} />
            </span>
            Veg Only
          </button>

          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedCat(c)}
              className={`category-pill${selectedCat === c ? ' active' : ''}`}
            >
              {c === 'All' ? 'ALL DISHES' : c.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Chef's Signature Carousel (Spotlight) */}
      {selectedCat === 'All' && !debouncedSearch.trim() && !vegOnly && signatureDishes.length > 0 && (
        <section className="signature-carousel-wrapper" aria-label="Chef's Signatures" style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '0.85rem', padding: '0 0.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--primary, #f59e0b)', boxShadow: '0 0 10px var(--primary, #f59e0b)' }} />
                <span style={{ fontSize: '0.70rem', letterSpacing: '0.12em', color: 'var(--primary, #f59e0b)', fontWeight: 900, textTransform: 'uppercase' }}>
                  Culinary Heritage
                </span>
              </div>
              <h2 className="section-title" style={{ fontSize: '1.28rem', color: '#fafaf9', margin: 0, fontWeight: 900, lineHeight: 1.2 }}>
                Chef's Signatures &amp; Bestsellers
              </h2>
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted, #a8a29e)', fontWeight: 600 }}>
              Swipe to explore &rarr;
            </span>
          </div>

          <div className="signature-carousel" style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}>
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

      {/* Food Grid */}
      {filtered.length === 0 ? (
        <div className="empty-state" style={{ textAlign: 'center', padding: '3rem 1.5rem', background: '#141210', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <span className="empty-state-icon" style={{ display: 'inline-flex', color: 'var(--primary, #f59e0b)', marginBottom: '0.5rem' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
          <p style={{ color: 'var(--text-muted, #a8a29e)', fontSize: '0.95rem' }}>
            {vegOnly
              ? 'No vegetarian items match your search.'
              : debouncedSearch.trim()
              ? `No dishes found matching "${debouncedSearch}". Try one of our house favorites below:`
              : 'No items found. Try a different search.'}
          </p>
          {debouncedSearch.trim() && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', justifyContent: 'center', maxWidth: '520px', margin: '0.85rem auto 1.1rem' }}>
              {POPULAR_SEARCH_SUGGESTIONS.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => { setSearch(sug); setSelectedCat('All'); setVegOnly(false) }}
                  style={{
                    background: 'rgba(245,158,11,0.08)',
                    border: '1px solid rgba(245,158,11,0.35)',
                    color: '#fbbf24',
                    padding: '0.4rem 0.85rem',
                    borderRadius: '9999px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
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
            style={{ marginTop: '0.5rem', padding: '0.5rem 1.2rem', background: 'var(--primary, #f59e0b)', color: '#111', border: 'none', borderRadius: '10px', fontWeight: 800, cursor: 'pointer' }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="food-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
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
