import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../context/StoreContext'
import { useAuth } from '../context/AuthContext'
import type { Product } from '../types'
import { Loader } from '../components/Loader'
import { STORE_NAME, STORE_NAME_BN, STORE_TAGLINE } from '../lib/business'

const CATEGORIES = [
  'All',
  'Kutir Signature Thali',
  'Biryani',
  'Fish Curry',
  'Chicken Curry',
  'Tandoor',
  'Rice & Roti',
  'Beverages',
  'Sweets',
]

export default function Menu() {
  const { products, loadingProducts, cart, dispatch } = useStore()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchCat = category === 'All' || p.category === category
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.name_bn ?? '').includes(search)
      return matchCat && matchSearch && !p.archived
    })
  }, [products, category, search])

  function getCartQty(productId: string, size: 'a' | 'b' | 'c') {
    return cart.find(c => c.product.id === productId && c.size === size)?.quantity ?? 0
  }

  function addOne(product: Product, size: 'a' | 'b' | 'c') {
    if (!product.in_stock) return
    dispatch({ type: 'ADD_TO_CART', item: { product, quantity: 1, size } })
  }

  function removeOne(product: Product, size: 'a' | 'b' | 'c') {
    const qty = getCartQty(product.id, size)
    if (qty <= 1) {
      dispatch({ type: 'REMOVE_FROM_CART', productId: product.id, size })
    } else {
      dispatch({ type: 'UPDATE_QTY', productId: product.id, size, qty: qty - 1 })
    }
  }

  const cartCount = cart.reduce((n, i) => n + i.quantity, 0)
  const cartTotal = cart.reduce((s, item) => {
    const price =
      item.size === 'a'
        ? item.product.price_a
        : item.size === 'b'
          ? (item.product.price_b ?? item.product.price_a)
          : (item.product.price_c ?? item.product.price_a)
    return s + price * item.quantity
  }, 0)

  if (loadingProducts) return <Loader text="Loading menu..." />

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', paddingBottom: cartCount > 0 ? '6rem' : '2rem' }}>
      {/* Header */}
      <header style={{
        background: 'var(--color-terracotta)',
        color: '#fff',
        padding: '1rem 1.25rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', fontWeight: 700 }}>
            {STORE_NAME}
          </h1>
          <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.85 }}>{STORE_NAME_BN} · {STORE_TAGLINE}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {profile ? (
            <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>Hi, {profile.name ?? 'Guest'}</span>
          ) : (
            <button onClick={() => navigate('/auth')} style={headerBtnStyle}>Sign In</button>
          )}
        </div>
      </header>

      {/* Search */}
      <div style={{ padding: '0.75rem 1.25rem' }}>
        <input
          type="search"
          placeholder="Search dishes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '0.65rem 1rem',
            border: '1.5px solid #e7e5e4',
            borderRadius: '0.5rem',
            fontSize: '0.95rem',
            fontFamily: 'Inter, sans-serif',
            boxSizing: 'border-box',
            background: '#fff',
            color: 'var(--color-teak)',
          }}
        />
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', padding: '0 1.25rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            style={{
              padding: '0.4rem 0.9rem',
              borderRadius: '999px',
              border: 'none',
              background: category === cat ? 'var(--color-terracotta)' : '#fff',
              color: category === cat ? '#fff' : '#78716c',
              fontWeight: 600,
              fontSize: '0.82rem',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
              boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Products */}
      <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filtered.length === 0 && (
          <p style={{ color: '#78716c', textAlign: 'center', marginTop: '2rem' }}>No items found</p>
        )}
        {filtered.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            getQty={getCartQty}
            addOne={addOne}
            removeOne={removeOne}
          />
        ))}
      </div>

      {/* Cart bar */}
      {cartCount > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'var(--color-terracotta)',
          color: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 1.5rem',
          cursor: 'pointer',
          zIndex: 200,
        }} onClick={() => navigate('/cart')}>
          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{cartCount} item{cartCount > 1 ? 's' : ''} in cart</span>
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>Rs. {cartTotal} &rsaquo;</span>
        </div>
      )}
    </div>
  )
}

function ProductCard({
  product,
  getQty,
  addOne,
  removeOne,
}: {
  product: Product
  getQty: (id: string, size: 'a' | 'b' | 'c') => number
  addOne: (p: Product, s: 'a' | 'b' | 'c') => void
  removeOne: (p: Product, s: 'a' | 'b' | 'c') => void
}) {
  const sizes: Array<{ key: 'a' | 'b' | 'c'; label: string | null; price: number | null }> = [
    { key: 'a', label: product.label_a, price: product.price_a },
    { key: 'b', label: product.label_b, price: product.price_b },
    { key: 'c', label: product.label_c, price: product.price_c },
  ].filter(s => s.label && s.price !== null) as typeof sizes

  return (
    <div style={{
      background: '#fff',
      borderRadius: '0.75rem',
      boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      opacity: product.in_stock ? 1 : 0.6,
    }}>
      <div style={{ display: 'flex', gap: '0.75rem', padding: '0.9rem' }}>
        {product.image_url && (
          <img
            src={product.image_url}
            alt={product.name}
            style={{ width: '72px', height: '72px', borderRadius: '0.5rem', objectFit: 'cover', flexShrink: 0 }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: '1rem', color: 'var(--color-teak)' }}>
            {product.name}
          </div>
          {product.name_bn && (
            <div style={{ fontSize: '0.78rem', color: '#a8734e', marginBottom: '0.15rem' }}>{product.name_bn}</div>
          )}
          {product.description && (
            <div style={{ fontSize: '0.8rem', color: '#78716c', lineHeight: 1.4 }}>{product.description}</div>
          )}
          {!product.in_stock && (
            <span style={{ fontSize: '0.75rem', color: '#c2410c', fontWeight: 700 }}>Out of stock</span>
          )}
        </div>
      </div>

      {/* Size + quantity controls */}
      <div style={{ padding: '0 0.9rem 0.9rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {sizes.map(({ key, label, price }) => {
          const qty = getQty(product.id, key)
          return (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.82rem', color: '#78716c' }}>{label}</span>
                <span style={{ marginLeft: '0.5rem', fontWeight: 700, color: 'var(--color-terracotta)', fontSize: '0.95rem' }}>
                  Rs. {price}
                </span>
              </div>
              {qty === 0 ? (
                <button
                  onClick={() => addOne(product, key)}
                  disabled={!product.in_stock}
                  style={{
                    padding: '0.3rem 1rem',
                    background: 'var(--color-terracotta)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '999px',
                    fontWeight: 700,
                    cursor: product.in_stock ? 'pointer' : 'not-allowed',
                    fontSize: '0.85rem',
                  }}
                >
                  Add
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button onClick={() => removeOne(product, key)} style={qtyBtnStyle}>-</button>
                  <span style={{ fontWeight: 700, minWidth: '1.2rem', textAlign: 'center' }}>{qty}</span>
                  <button onClick={() => addOne(product, key)} style={qtyBtnStyle}>+</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const headerBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.2)',
  color: '#fff',
  border: '1px solid rgba(255,255,255,0.4)',
  borderRadius: '0.4rem',
  padding: '0.3rem 0.8rem',
  fontSize: '0.85rem',
  cursor: 'pointer',
  fontFamily: 'Inter, sans-serif',
}

const qtyBtnStyle: React.CSSProperties = {
  background: 'var(--color-terracotta)',
  color: '#fff',
  border: 'none',
  borderRadius: '50%',
  width: '1.6rem',
  height: '1.6rem',
  fontSize: '1rem',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}
