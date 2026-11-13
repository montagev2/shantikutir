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
    } catch (err) {
      showToast('Failed to load users', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  async function handleDelete(userId: string) {
    if (!confirm('Delete this user permanently?')) return
    try {
      await adminDeleteUser(userId)
      showToast('User deleted', 'success')
      fetchUsers()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed', 'error')
    }
  }

  async function handleCreateStaff(e: React.FormEvent) {
    e.preventDefault()
    if (!newStaff.phone || !newStaff.name || !newStaff.pin) { showToast('All fields required', 'error'); return }
    setCreating(true)
    try {
      await adminCreateStaff({ p_phone: newStaff.phone, p_name: newStaff.name, p_pin: newStaff.pin, p_role: newStaff.role })
      showToast('Staff created', 'success')
      setNewStaff({ phone: '', name: '', pin: '', role: 'staff' })
      fetchUsers()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed', 'error')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div style={{ padding: '1rem', background: 'var(--color-bg)', minHeight: '100vh' }}>
      {toast && <Toast key={toast.key} message={toast.message} type={toast.type} onClose={hideToast} />}
      <h2 style={{ fontFamily: 'Playfair Display, serif', color: 'var(--color-terracotta)', margin: '0 0 1rem' }}>Users & Staff</h2>

      {/* Create staff form */}
      <form onSubmit={handleCreateStaff} style={{ background: '#fff', borderRadius: '0.75rem', padding: '1rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: '1.25rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontFamily: 'Playfair Display, serif', color: 'var(--color-teak)', fontSize: '1rem' }}>Add Staff</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {(['phone', 'name', 'pin'] as const).map(field => (
            <input
              key={field}
              type={field === 'pin' ? 'password' : 'text'}
              placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
              value={newStaff[field]}
              onChange={e => setNewStaff(s => ({ ...s, [field]: e.target.value }))}
              maxLength={field === 'pin' ? 4 : 60}
              style={{ flex: '1 1 8rem', border: '1.5px solid #e7e5e4', borderRadius: '0.4rem', padding: '0.5rem 0.75rem', fontSize: '0.9rem', fontFamily: 'Inter, sans-serif' }}
            />
          ))}
          <select
            value={newStaff.role}
            onChange={e => setNewStaff(s => ({ ...s, role: e.target.value }))}
            style={{ flex: '1 1 7rem', border: '1.5px solid #e7e5e4', borderRadius: '0.4rem', padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}
          >
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" disabled={creating} style={{ background: 'var(--color-terracotta)', color: '#fff', border: 'none', borderRadius: '0.4rem', padding: '0.5rem 1rem', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>
            {creating ? '...' : 'Add'}
          </button>
        </div>
      </form>

      {loading && <p style={{ color: '#78716c' }}>Loading...</p>}
      {users.map(u => (
        <div key={u.id} style={{ background: '#fff', borderRadius: '0.6rem', padding: '0.75rem 1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontWeight: 700, color: 'var(--color-teak)', fontSize: '0.9rem' }}>{u.name ?? '—'}</span>
            <span style={{ marginLeft: '0.75rem', fontSize: '0.8rem', color: '#78716c' }}>{u.phone}</span>
            <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', background: u.role === 'admin' ? '#c2410c' : u.role === 'staff' ? '#d97706' : '#e7e5e4', color: u.role === 'customer' ? '#57534e' : '#fff', borderRadius: '999px', padding: '0.1rem 0.5rem' }}>{u.role}</span>
          </div>
          {u.role !== 'admin' && (
            <button onClick={() => handleDelete(u.id)} style={{ background: '#fee2e2', color: '#c2410c', border: 'none', borderRadius: '0.4rem', padding: '0.3rem 0.6rem', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
              Delete
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
