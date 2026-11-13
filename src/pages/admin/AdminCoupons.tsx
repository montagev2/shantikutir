import { useState, useEffect } from 'react'
import { getActiveCoupons, adminCreateCoupon, adminToggleCoupon, adminDeleteCoupon } from '../../lib/api'
import { Toast, useToast } from '../../components/Toast'
import type { Coupon } from '../../types'

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const { toast, showToast, hideToast } = useToast()
  const [form, setForm] = useState({ code: '', discount_type: 'flat', discount_value: '', min_order: '0', max_uses: '', expires_at: '' })
  const [creating, setCreating] = useState(false)

  async function fetchCoupons() {
    try {
      const data = await getActiveCoupons(null)
      setCoupons((data ?? []) as Coupon[])
    } catch {
      showToast('Failed to load coupons', 'error')
    }
  }

  useEffect(() => { fetchCoupons() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.code || !form.discount_value) { showToast('Code and value required', 'error'); return }
    setCreating(true)
    try {
      await adminCreateCoupon({
        p_code: form.code.toUpperCase(),
        p_discount_type: form.discount_type,
        p_discount_value: parseFloat(form.discount_value),
        p_min_order: parseFloat(form.min_order) || 0,
        p_max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        p_expires_at: form.expires_at || null,
      })
      showToast('Coupon created', 'success')
      setForm({ code: '', discount_type: 'flat', discount_value: '', min_order: '0', max_uses: '', expires_at: '' })
      fetchCoupons()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed', 'error')
    } finally {
      setCreating(false)
    }
  }

  async function handleToggle(id: string) {
    try {
      await adminToggleCoupon(id)
      fetchCoupons()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed', 'error')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this coupon?')) return
    try {
      await adminDeleteCoupon(id)
      fetchCoupons()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed', 'error')
    }
  }

  return (
    <div style={{ padding: '1rem', background: 'var(--color-bg)', minHeight: '100vh' }}>
      {toast && <Toast key={toast.key} message={toast.message} type={toast.type} onClose={hideToast} />}
      <h2 style={{ fontFamily: 'Playfair Display, serif', color: 'var(--color-terracotta)', margin: '0 0 1rem' }}>Coupons</h2>

      <form onSubmit={handleCreate} style={{ background: '#fff', borderRadius: '0.75rem', padding: '1rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: '1.25rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontFamily: 'Playfair Display, serif', color: 'var(--color-teak)', fontSize: '1rem' }}>New Coupon</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <input placeholder="Code" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} style={inputStyle} />
          <select value={form.discount_type} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))} style={inputStyle}>
            <option value="flat">Flat (Rs.)</option>
            <option value="percent">Percent (%)</option>
          </select>
          <input type="number" placeholder="Value" value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))} style={inputStyle} />
          <input type="number" placeholder="Min order" value={form.min_order} onChange={e => setForm(f => ({ ...f, min_order: e.target.value }))} style={inputStyle} />
          <input type="number" placeholder="Max uses (blank=unlimited)" value={form.max_uses} onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))} style={inputStyle} />
          <input type="date" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} style={inputStyle} />
          <button type="submit" disabled={creating} style={{ background: 'var(--color-terracotta)', color: '#fff', border: 'none', borderRadius: '0.4rem', padding: '0.5rem 1rem', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>
            {creating ? '...' : 'Create'}
          </button>
        </div>
      </form>

      {coupons.map(c => (
        <div key={c.id} style={{ background: '#fff', borderRadius: '0.6rem', padding: '0.75rem 1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontWeight: 700, color: 'var(--color-teak)', fontFamily: 'Playfair Display, serif' }}>{c.code}</span>
            <span style={{ marginLeft: '0.75rem', fontSize: '0.82rem', color: '#78716c' }}>
              {c.discount_type === 'flat' ? `Rs. ${c.discount_value} off` : `${c.discount_value}% off`} · min Rs. {c.min_order}
            </span>
            <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', background: c.active ? '#d1fae5' : '#fee2e2', color: c.active ? '#065f46' : '#c2410c', borderRadius: '999px', padding: '0.1rem 0.5rem' }}>
              {c.active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button onClick={() => handleToggle(c.id)} style={{ background: '#fff3e0', color: '#a8734e', border: 'none', borderRadius: '0.4rem', padding: '0.3rem 0.6rem', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
              Toggle
            </button>
            <button onClick={() => handleDelete(c.id)} style={{ background: '#fee2e2', color: '#c2410c', border: 'none', borderRadius: '0.4rem', padding: '0.3rem 0.6rem', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  flex: '1 1 8rem',
  border: '1.5px solid #e7e5e4',
  borderRadius: '0.4rem',
  padding: '0.5rem 0.75rem',
  fontSize: '0.9rem',
  fontFamily: 'Inter, sans-serif',
}
