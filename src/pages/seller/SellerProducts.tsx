import { useState } from 'react'
import { useStore } from '../../context/StoreContext'
import { updateProductPriceAndStock, resetAllProductsStock } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { Toast, useToast } from '../../components/Toast'
import type { Product } from '../../types'

export default function SellerProducts() {
  const { products, dispatch } = useStore()
  const { toast, showToast, hideToast } = useToast()
  const [editing, setEditing] = useState<Record<string, { price_a: string; in_stock: boolean }>>({})
  const [categoryFilter, setCategoryFilter] = useState('All')

  function startEdit(product: Product) {
    setEditing((e) => ({
      ...e,
      [product.id]: { price_a: String(product.price_a), in_stock: product.in_stock },
    }))
  }

  async function saveEdit(product: Product) {
    const e = editing[product.id]
    if (!e) return
    const price = parseFloat(e.price_a)
    if (isNaN(price) || price <= 0) {
      showToast('Please enter a valid price', 'error')
      return
    }
    try {
      await updateProductPriceAndStock({
        p_product_id: product.id,
        p_p_a: price,
        p_p_b: product.price_b,
        p_p_c: product.price_c,
        p_in_stock: e.in_stock,
        p_archived: product.archived,
      })
      showToast('Product updated successfully', 'success')
      setEditing((prev) => {
        const n = { ...prev }
        delete n[product.id]
        return n
      })
      // Refresh
      const { data } = await supabase.from('products').select('*').eq('archived', false).order('sort_order')
      if (data) dispatch({ type: 'SET_PRODUCTS', products: data as Product[] })
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Update failed', 'error')
    }
  }

  async function handleResetStock() {
    if (!confirm('Reset all catalog products to In Stock?')) return
    try {
      await resetAllProductsStock()
      showToast('All products marked In Stock', 'success')
      const { data } = await supabase.from('products').select('*').eq('archived', false).order('sort_order')
      if (data) dispatch({ type: 'SET_PRODUCTS', products: data as Product[] })
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Reset failed', 'error')
    }
  }

  const categories = ['All', ...new Set(products.map((p) => p.category))]
  const filtered = categoryFilter === 'All' ? products : products.filter((p) => p.category === categoryFilter)

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {toast && <Toast key={toast.key} message={toast.message} type={toast.type} onClose={hideToast} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', color: '#fff', margin: 0 }}>Product Catalog Management</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
            Instant price updates & 86-ing out of stock items
          </p>
        </div>
        <button
          className="btn-gold"
          onClick={handleResetStock}
          style={{ padding: '0.55rem 1.15rem', fontSize: '0.84rem' }}
        >
          ✓ Reset All Items to In Stock
        </button>
      </div>

      {/* Category filter pills */}
      <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', marginBottom: '1.25rem', paddingBottom: '0.25rem' }}>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategoryFilter(c)}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.8rem',
              fontWeight: 600,
              background: categoryFilter === c ? 'var(--gold)' : 'var(--surface)',
              color: categoryFilter === c ? '#0c0b0a' : 'var(--text-muted)',
              border: '1px solid var(--glass-border)',
              whiteSpace: 'nowrap',
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Products List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filtered.map((product) => {
          const e = editing[product.id]
          return (
            <div
              key={product.id}
              className="glass-panel"
              style={{
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                opacity: product.in_stock ? 1 : 0.65,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
                <img
                  src={product.image_url || '/dishes/bashanti-polao.jpg'}
                  alt={product.name}
                  style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-sm)', objectFit: 'cover', flexShrink: 0 }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}>{product.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {product.category} · {product.label_a}
                  </div>
                  {e ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.4rem' }}>
                      <input
                        type="number"
                        value={e.price_a}
                        onChange={(ev) => setEditing((prev) => ({ ...prev, [product.id]: { ...e, price_a: ev.target.value } }))}
                        style={{ width: '90px', padding: '0.35rem 0.6rem', fontSize: '0.88rem' }}
                      />
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: '#fff', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={e.in_stock}
                          onChange={(ev) => setEditing((prev) => ({ ...prev, [product.id]: { ...e, in_stock: ev.target.checked } }))}
                        />
                        In Stock
                      </label>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.9rem', color: 'var(--gold)', fontWeight: 800, marginTop: '0.2rem' }}>
                      ₹{product.price_a}{' '}
                      <span
                        style={{
                          fontSize: '0.75rem',
                          marginLeft: '0.5rem',
                          color: product.in_stock ? 'var(--emerald)' : 'var(--rose)',
                          background: product.in_stock ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          padding: '0.1rem 0.45rem',
                          borderRadius: '4px',
                        }}
                      >
                        {product.in_stock ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                {e ? (
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      className="btn-primary"
                      onClick={() => saveEdit(product)}
                      style={{ padding: '0.45rem 0.95rem', fontSize: '0.82rem' }}
                    >
                      Save
                    </button>
                    <button
                      className="btn-ghost"
                      onClick={() =>
                        setEditing((prev) => {
                          const n = { ...prev }
                          delete n[product.id]
                          return n
                        })
                      }
                      style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn-ghost"
                    onClick={() => startEdit(product)}
                    style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}
                  >
                    ✏️ Edit
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
