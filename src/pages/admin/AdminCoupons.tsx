import { useState, useEffect } from 'react'
import { getActiveCoupons, adminCreateCoupon, adminToggleCoupon, adminDeleteCoupon } from '../../lib/api'
import { Toast, useToast } from '../../components/Toast'
import type { Coupon } from '../../types'

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const { toast, showToast, hideToast } = useToast()
  const [form, setForm] = useState({
    code: '',
    discount_type: 'flat',
    discount_value: '',
    min_order: '150',
    max_uses: '',
    expires_at: '',
  })
  const [creating, setCreating] = useState(false)

  async function fetchCoupons() {
    try {
      const data = await getActiveCoupons(null)
      setCoupons((data ?? []) as Coupon[])
    } catch {
      showToast('Failed to load coupons', 'error')
    }
  }

  useEffect(() => {
    fetchCoupons()
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.code || !form.discount_value) {
      showToast('Coupon code and discount value required', 'error')
      return
    }
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
      showToast(`Coupon ${form.code} created!`, 'success')
      setForm({
        code: '',
        discount_type: 'flat',
        discount_value: '',
        min_order: '150',
        max_uses: '',
        expires_at: '',
      })
      fetchCoupons()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Coupon creation failed', 'error')
    } finally {
      setCreating(false)
    }
  }

  async function handleToggle(id: string) {
    try {
      await adminToggleCoupon(id)
      fetchCoupons()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Toggle failed', 'error')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Permanently delete this coupon?')) return
    try {
      await adminDeleteCoupon(id)
      showToast('Coupon deleted', 'success')
      fetchCoupons()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed', 'error')
    }
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {toast && <Toast key={toast.key} message={toast.message} type={toast.type} onClose={hideToast} />}

      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.6rem', color: '#fff', margin: 0 }}>Promotions & Coupons</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
          Create highway discount codes, percent off deals, and welcome offers
        </p>
      </div>

      <form
        onSubmit={handleCreate}
        className="glass-panel"
        style={{
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
          marginBottom: '1.75rem',
        }}
      >
        <h3 style={{ margin: '0 0 1rem', fontSize: '1.05rem', color: 'var(--gold)' }}>
          ️ Create Promotional Code
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Coupon Code
            </label>
            <input
              type="text"
              placeholder="e.g. WELCOME50"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              style={{ width: '100%', padding: '0.6rem 0.8rem', fontWeight: 800 }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Discount Type
            </label>
            <select
              value={form.discount_type}
              onChange={(e) => setForm((f) => ({ ...f, discount_type: e.target.value }))}
              style={{ width: '100%', padding: '0.6rem 0.8rem' }}
            >
              <option value="flat">Flat Cash (₹)</option>
              <option value="percent">Percentage (%)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Value ({form.discount_type === 'flat' ? '₹' : '%'})
            </label>
            <input
              type="number"
              placeholder="e.g. 50 or 15"
              value={form.discount_value}
              onChange={(e) => setForm((f) => ({ ...f, discount_value: e.target.value }))}
              style={{ width: '100%', padding: '0.6rem 0.8rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Min Order (₹)
            </label>
            <input
              type="number"
              placeholder="e.g. 200"
              value={form.min_order}
              onChange={(e) => setForm((f) => ({ ...f, min_order: e.target.value }))}
              style={{ width: '100%', padding: '0.6rem 0.8rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Expiry Date (Optional)
            </label>
            <input
              type="date"
              value={form.expires_at}
              onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
              style={{ width: '100%', padding: '0.6rem 0.8rem' }}
            />
          </div>
        </div>

        <button className="btn-gold" type="submit" disabled={creating} style={{ padding: '0.65rem 1.4rem' }}>
          {creating ? 'Creating...' : 'Publish Coupon'}
        </button>
      </form>

      {/* Coupons List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {coupons.map((c) => (
          <div
            key={c.id}
            className="glass-panel"
            style={{
              padding: '0.85rem 1.25rem',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 800, color: 'var(--gold)', fontSize: '1.1rem' }}>
                {c.code}
              </span>
              <span style={{ marginLeft: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                {c.discount_type === 'flat' ? `₹${c.discount_value} OFF` : `${c.discount_value}% OFF`}
                <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                  (Min Order: ₹{c.min_order})
                </span>
              </span>
              <span
                style={{
                  marginLeft: '0.75rem',
                  fontSize: '0.72rem',
                  padding: '0.15rem 0.55rem',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 700,
                  background: c.active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: c.active ? 'var(--emerald)' : 'var(--rose)',
                  border: `1px solid ${c.active ? 'var(--emerald)' : 'var(--rose)'}`,
                }}
              >
                {c.active ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn-ghost"
                onClick={() => c.id && handleToggle(c.id)}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
              >
                Toggle
              </button>
              <button
                onClick={() => c.id && handleDelete(c.id)}
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: 'var(--rose)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
