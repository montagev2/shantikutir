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

  function startEdit(product: Product) {
    setEditing(e => ({
      ...e,
      [product.id]: { price_a: String(product.price_a), in_stock: product.in_stock },
    }))
  }

  async function saveEdit(product: Product) {
    const e = editing[product.id]
    if (!e) return
    const price = parseFloat(e.price_a)
    if (isNaN(price) || price <= 0) { showToast('Invalid price', 'error'); return }
    try {
      await updateProductPriceAndStock({
        p_product_id: product.id,
        p_p_a: price,
        p_p_b: product.price_b,
        p_p_c: product.price_c,
        p_in_stock: e.in_stock,
        p_archived: product.archived,
      })
      showToast('Saved', 'success')
      setEditing(prev => { const n = { ...prev }; delete n[product.id]; return n })
      // Refresh products
      const { data } = await supabase.from('products').select('*').eq('archived', false).order('sort_order')
      if (data) dispatch({ type: 'SET_PRODUCTS', products: data as Product[] })
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed', 'error')
    }
  }

  async function handleResetStock() {
    if (!confirm('Reset all products to in-stock?')) return
    try {
      await resetAllProductsStock()
      showToast('All products back in stock', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed', 'error')
    }
  }

  return (
    <div style={{ padding: '1rem', background: 'var(--color-bg)', minHeight: '100vh' }}>
      {toast && <Toast key={toast.key} message={toast.message} type={toast.type} onClose={hideToast} />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontFamily: 'Playfair Display, serif', color: 'var(--color-terracotta)', margin: 0 }}>Products</h2>
        <button onClick={handleResetStock} style={{ background: '#65a30d', color: '#fff', border: 'none', borderRadius: '0.4rem', padding: '0.45rem 0.9rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
          Reset All Stock
        </button>
      </div>

      {products.map(product => {
        const e = editing[product.id]
        return (
          <div key={product.id} style={{ background: '#fff', borderRadius: '0.75rem', padding: '0.9rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: '0.6rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--color-teak)', fontFamily: 'Playfair Display, serif', fontSize: '0.95rem' }}>{product.name}</div>
              <div style={{ fontSize: '0.78rem', color: '#78716c' }}>{product.category}</div>
              {e ? (
                <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="number"
                    value={e.price_a}
                    onChange={ev => setEditing(prev => ({ ...prev, [product.id]: { ...e, price_a: ev.target.value } }))}
                    style={{ border: '1.5px solid #e7e5e4', borderRadius: '0.4rem', padding: '0.3rem 0.5rem', width: '5rem', fontSize: '0.9rem' }}
                  />
                  <label style={{ fontSize: '0.82rem', color: '#78716c', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <input type="checkbox" checked={e.in_stock} onChange={ev => setEditing(prev => ({ ...prev, [product.id]: { ...e, in_stock: ev.target.checked } }))} />
                    In stock
                  </label>
                </div>
              ) : (
                <div style={{ fontSize: '0.88rem', color: 'var(--color-terracotta)', fontWeight: 600, marginTop: '0.2rem' }}>
                  Rs. {product.price_a} · {product.in_stock ? 'In stock' : 'Out of stock'}
                </div>
              )}
            </div>
            <div>
              {e ? (
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button onClick={() => saveEdit(product)} style={{ background: 'var(--color-terracotta)', color: '#fff', border: 'none', borderRadius: '0.4rem', padding: '0.35rem 0.75rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Save</button>
                  <button onClick={() => setEditing(prev => { const n = { ...prev }; delete n[product.id]; return n })} style={{ background: '#e7e5e4', color: '#57534e', border: 'none', borderRadius: '0.4rem', padding: '0.35rem 0.6rem', fontSize: '0.8rem', cursor: 'pointer' }}>Cancel</button>
                </div>
              ) : (
                <button onClick={() => startEdit(product)} style={{ background: '#fff3e0', color: '#a8734e', border: 'none', borderRadius: '0.4rem', padding: '0.35rem 0.75rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Edit</button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
