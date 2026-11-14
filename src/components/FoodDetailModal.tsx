import { useState } from 'react'
import { useStore } from '../context/StoreContext'
import { PORTION_LABELS } from '../lib/business'
import { optimizeImageUrl } from '../lib/cache'
import type { MenuItem, Portion } from '../types'

const SERVING_HINTS: Record<Portion, string> = {
  C: 'Serves 1',
  B: 'Serves 1–2',
  A: 'Serves 3–4',
}

export default function FoodDetailModal({
  item,
  onClose,
  onAdd,
}: {
  item: MenuItem
  onClose: () => void
  onAdd?: (item: MenuItem, portion: Portion) => void
}) {
  const { addToCart, lang } = useStore()

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

  const handleAdd = () => {
    if (onAdd) {
      onAdd(item, effectivePortion)
    } else {
      addToCart(item.id, effectivePortion)
    }
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        zIndex: 10000,
        display: 'grid',
        placeItems: 'center',
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="glass-card"
        style={{
          background: '#181614',
          border: '1.5px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '20px',
          maxWidth: '440px',
          width: '100%',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
          position: 'relative',
        }}
      >
        {item.imageUrl && (
          <div style={{ position: 'relative', height: '220px', width: '100%' }}>
            <img
              src={optimizeImageUrl(item.imageUrl, 700, 85)}
              alt={item.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, transparent 50%, rgba(24, 22, 20, 0.95) 100%)',
              }}
            />
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'rgba(0, 0, 0, 0.65)',
            border: 'none',
            color: '#fff',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
            fontSize: '1rem',
            zIndex: 10,
          }}
          aria-label="Close"
        >
          &times;
        </button>

        <div style={{ padding: '1.25rem' }}>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              color: 'var(--gold, #d97706)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              display: 'block',
              marginBottom: '4px',
            }}
          >
            {item.category}
          </span>
          <h2 style={{ fontSize: '1.35rem', color: '#fafaf9', margin: '0 0 0.5rem', fontWeight: 900 }}>
            {lang === 'bn' && item.bnName ? item.bnName : item.name}
          </h2>
          {item.description && (
            <p style={{ fontSize: '0.88rem', color: '#a1a1aa', margin: '0 0 1rem', lineHeight: 1.5 }}>
              {item.description}
            </p>
          )}

          {/* Portion Selection */}
          {availablePortions.length > 1 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d4d4d8', display: 'block', marginBottom: '0.4rem' }}>
                Select Portion:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${availablePortions.length}, 1fr)`, gap: '0.5rem' }}>
                {availablePortions.map((p) => {
                  const isActive = effectivePortion === p
                  const lbl = PORTION_LABELS[p] ? (lang === 'bn' ? PORTION_LABELS[p].bn : PORTION_LABELS[p].en) : p
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPortion(p)}
                      style={{
                        padding: '0.65rem 0.5rem',
                        borderRadius: '10px',
                        background: isActive ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                        border: `1.5px solid ${isActive ? 'var(--gold, #d97706)' : 'rgba(255, 255, 255, 0.1)'}`,
                        color: isActive ? '#fbbf24' : '#fafaf9',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      <strong style={{ display: 'block', fontSize: '0.82rem' }}>{lbl}</strong>
                      <span style={{ fontSize: '0.70rem', color: '#a1a1aa', display: 'block', marginTop: '2px' }}>
                        {SERVING_HINTS[p]}
                      </span>
                      <strong style={{ fontSize: '0.92rem', color: '#fbbf24', display: 'block', marginTop: '4px' }}>
                        Rs. {priceMap[p]}
                      </strong>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Price and Add CTA */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#a1a1aa', display: 'block' }}>Total Price</span>
              <strong style={{ fontSize: '1.45rem', color: '#fbbf24', fontWeight: 900 }}>
                Rs. {currentPrice}
              </strong>
            </div>
            <button
              type="button"
              onClick={handleAdd}
              style={{
                backgroundColor: '#d97706',
                backgroundImage: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#111',
                padding: '0.65rem 1.5rem',
                borderRadius: '10px',
                fontWeight: 900,
                fontSize: '0.95rem',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
              }}
            >
              Add to Order
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
