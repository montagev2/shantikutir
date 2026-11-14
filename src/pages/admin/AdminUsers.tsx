import { useState, useEffect } from 'react'
import { getAllUsersStaff, adminDeleteUser, adminCreateStaff } from '../../lib/api'
import { Toast, useToast } from '../../components/Toast'
import type { Profile } from '../../types'

export default function AdminUsers() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const { toast, showToast, hideToast } = useToast()
  const [newStaff, setNewStaff] = useState({ phone: '', name: '', pin: '', role: 'staff' })
  const [creating, setCreating] = useState(false)

  async function fetchUsers() {
    try {
      const data = await getAllUsersStaff()
      setUsers((data ?? []) as Profile[])
    } catch {
      showToast('Failed to load user accounts', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  async function handleDelete(userId: string) {
    if (!confirm('Are you sure you want to permanently delete this user account?')) return
    try {
      await adminDeleteUser(userId)
      showToast('User account removed', 'success')
      fetchUsers()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Deletion failed', 'error')
    }
  }

  async function handleCreateStaff(e: React.FormEvent) {
    e.preventDefault()
    if (!newStaff.phone || !newStaff.name || !newStaff.pin) {
      showToast('All fields are required', 'error')
      return
    }
    setCreating(true)
    try {
      await adminCreateStaff({
        p_phone: newStaff.phone,
        p_name: newStaff.name,
        p_pin: newStaff.pin,
        p_role: newStaff.role,
      })
      showToast(`Staff member ${newStaff.name} created successfully`, 'success')
      setNewStaff({ phone: '', name: '', pin: '', role: 'staff' })
      fetchUsers()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Staff creation failed', 'error')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {toast && <Toast key={toast.key} message={toast.message} type={toast.type} onClose={hideToast} />}

      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.6rem', color: '#fff', margin: 0 }}>Staff & Customer Accounts</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
          Grant kitchen staff or admin access, manage customer PIN logins
        </p>
      </div>

      {/* Create staff form */}
      <form
        onSubmit={handleCreateStaff}
        className="glass-panel"
        style={{
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
          marginBottom: '1.75rem',
        }}
      >
        <h3 style={{ margin: '0 0 1rem', fontSize: '1.05rem', color: 'var(--gold)' }}>
          ➕ Add New Staff or Kitchen Member
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Full Name
            </label>
            <input
              type="text"
              placeholder="e.g. Ramesh Ghosh"
              value={newStaff.name}
              onChange={(e) => setNewStaff((s) => ({ ...s, name: e.target.value }))}
              style={{ width: '100%', padding: '0.6rem 0.8rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Mobile Number
            </label>
            <input
              type="tel"
              placeholder="10-digit phone"
              value={newStaff.phone}
              onChange={(e) => setNewStaff((s) => ({ ...s, phone: e.target.value }))}
              maxLength={13}
              style={{ width: '100%', padding: '0.6rem 0.8rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              4-Digit PIN
            </label>
            <input
              type="password"
              placeholder="••••"
              value={newStaff.pin}
              onChange={(e) => setNewStaff((s) => ({ ...s, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
              maxLength={4}
              style={{ width: '100%', padding: '0.6rem 0.8rem', textAlign: 'center', letterSpacing: '0.2em' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Role
            </label>
            <select
              value={newStaff.role}
              onChange={(e) => setNewStaff((s) => ({ ...s, role: e.target.value }))}
              style={{ width: '100%', padding: '0.6rem 0.8rem' }}
            >
              <option value="staff">Kitchen Staff</option>
              <option value="admin">Store Admin</option>
            </select>
          </div>
        </div>

        <button className="btn-gold" type="submit" disabled={creating} style={{ padding: '0.65rem 1.4rem' }}>
          {creating ? 'Creating...' : 'Create Account'}
        </button>
      </form>

      {/* Users table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {loading && <p style={{ color: 'var(--text-muted)' }}>Loading accounts...</p>}
        {users.map((u) => (
          <div
            key={u.id}
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
              <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>{u.name || 'Anonymous Customer'}</span>
              <span style={{ marginLeft: '0.85rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{u.phone}</span>
              <span
                style={{
                  marginLeft: '0.75rem',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '0.15rem 0.55rem',
                  borderRadius: 'var(--radius-full)',
                  background:
                    u.role === 'admin'
                      ? 'rgba(223, 177, 91, 0.2)'
                      : u.role === 'staff'
                      ? 'rgba(194, 65, 12, 0.2)'
                      : 'rgba(255, 255, 255, 0.08)',
                  color: u.role === 'admin' ? 'var(--gold)' : u.role === 'staff' ? 'var(--primary)' : 'var(--text-muted)',
                  border: `1px solid ${
                    u.role === 'admin' ? 'var(--gold)' : u.role === 'staff' ? 'var(--primary)' : 'transparent'
                  }`,
                }}
              >
                {u.role}
              </span>
            </div>

            {u.role !== 'admin' && (
              <button
                onClick={() => handleDelete(u.id)}
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
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
