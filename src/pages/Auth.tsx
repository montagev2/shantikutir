import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isValidPhone, isValidPin, sanitisePhone } from '../lib/security'
import { STORE_NAME, STORE_NAME_BN, STORE_TAGLINE_BN } from '../lib/business'
import { Toast, useToast } from '../components/Toast'

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const { toast, showToast, hideToast } = useToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cleanPhone = sanitisePhone(phone)
    if (!isValidPhone(cleanPhone)) {
      showToast('Please enter a valid 10-digit mobile number', 'error')
      return
    }
    if (!isValidPin(pin)) {
      showToast('PIN must be exactly 4 digits', 'error')
      return
    }
    if (mode === 'register' && !name.trim()) {
      showToast('Please enter your full name', 'error')
      return
    }

    setBusy(true)
    try {
      if (mode === 'login') {
        await login(cleanPhone, pin)
        showToast('Welcome back to Shanti Kutir!', 'success')
      } else {
        await register(cleanPhone, pin, name)
        showToast('Account registered successfully!', 'success')
      }
      setTimeout(() => navigate('/'), 600)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Authentication failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
      }}
    >
      {toast && <Toast key={toast.key} message={toast.message} type={toast.type} onClose={hideToast} />}

      <div
        className="glass-panel-elevated animate-pop-in"
        style={{
          width: '100%',
          maxWidth: '420px',
          borderRadius: 'var(--radius-lg)',
          padding: '2.25rem 2rem',
          position: 'relative',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--gold) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.75rem',
              color: '#fff',
              fontSize: '1.4rem',
              fontWeight: 900,
              fontFamily: 'var(--font-serif)',
            }}
          >
            SK
          </div>
          <h1 style={{ fontSize: '1.65rem', color: '#fff', margin: '0 0 0.25rem' }}>{STORE_NAME}</h1>
          <p className="bengali-subtext" style={{ color: 'var(--gold)', fontSize: '0.9rem', margin: 0 }}>
            {STORE_NAME_BN} · {STORE_TAGLINE_BN}
          </p>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            background: 'var(--surface)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.25rem',
            marginBottom: '1.5rem',
            border: '1px solid var(--glass-border)',
          }}
        >
          <button
            onClick={() => setMode('login')}
            style={{
              flex: 1,
              padding: '0.55rem',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 700,
              background: mode === 'login' ? 'var(--surface-hover)' : 'transparent',
              color: mode === 'login' ? 'var(--gold)' : 'var(--text-muted)',
              border: mode === 'login' ? '1px solid rgba(223, 177, 91, 0.3)' : '1px solid transparent',
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode('register')}
            style={{
              flex: 1,
              padding: '0.55rem',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 700,
              background: mode === 'register' ? 'var(--surface-hover)' : 'transparent',
              color: mode === 'register' ? 'var(--gold)' : 'var(--text-muted)',
              border: mode === 'register' ? '1px solid rgba(223, 177, 91, 0.3)' : '1px solid transparent',
            }}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {mode === 'register' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                Your Full Name
              </label>
              <input
                type="text"
                placeholder="e.g. Debajyoti Mondal"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                style={{ width: '100%', padding: '0.7rem 0.95rem', fontSize: '0.92rem' }}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Mobile Number
            </label>
            <input
              type="tel"
              placeholder="10-digit mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={13}
              style={{ width: '100%', padding: '0.7rem 0.95rem', fontSize: '0.92rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              4-Digit PIN
            </label>
            <input
              type="password"
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              maxLength={4}
              style={{ width: '100%', padding: '0.7rem 0.95rem', fontSize: '1.1rem', letterSpacing: '0.3em', textAlign: 'center' }}
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={busy}
            style={{
              padding: '0.85rem',
              fontSize: '1rem',
              marginTop: '0.5rem',
              width: '100%',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            {busy ? 'Please wait...' : mode === 'login' ? 'Sign In to Account' : 'Create Customer Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', margin: '1.5rem 0 0' }}>
          <Link to="/" style={{ color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>
            ← Continue Browsing Menu
          </Link>
        </p>
      </div>
    </div>
  )
}
