import { useState } from 'react'
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
      showToast('Enter a valid 10-digit mobile number', 'error')
      return
    }
    if (!isValidPin(pin)) {
      showToast('PIN must be exactly 4 digits', 'error')
      return
    }
    if (mode === 'register' && !name.trim()) {
      showToast('Please enter your name', 'error')
      return
    }
    setBusy(true)
    try {
      if (mode === 'login') {
        await login(cleanPhone, pin)
      } else {
        await register(cleanPhone, pin, name)
      }
      navigate('/')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Authentication failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      {toast && <Toast key={toast.key} message={toast.message} type={toast.type} onClose={hideToast} />}
      <div style={{ background: '#fff', borderRadius: '1rem', boxShadow: '0 4px 24px rgba(194,65,12,0.08)', padding: '2.5rem 2rem', width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', color: 'var(--color-terracotta)', margin: 0 }}>{STORE_NAME}</h1>
          <p style={{ color: 'var(--color-teak)', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>{STORE_NAME_BN} · {STORE_TAGLINE_BN}</p>
        </div>

        <div style={{ display: 'flex', borderBottom: '2px solid var(--color-bg)', marginBottom: '1.5rem' }}>
          {(['login', 'register'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1,
                padding: '0.6rem',
                border: 'none',
                background: 'none',
                fontWeight: 600,
                fontSize: '0.95rem',
                color: mode === m ? 'var(--color-terracotta)' : '#78716c',
                borderBottom: mode === m ? '2px solid var(--color-terracotta)' : '2px solid transparent',
                cursor: 'pointer',
                marginBottom: '-2px',
                fontFamily: 'Inter, sans-serif',
                textTransform: 'capitalize',
              }}
            >
              {m === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {mode === 'register' && (
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={60}
              style={inputStyle}
            />
          )}
          <input
            type="tel"
            placeholder="Mobile number (10 digits)"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            maxLength={13}
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="4-digit PIN"
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            maxLength={4}
            style={inputStyle}
          />
          <button
            type="submit"
            disabled={busy}
            style={{
              background: busy ? '#d97706' : 'var(--color-terracotta)',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.85rem',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: busy ? 'not-allowed' : 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {busy ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.9rem', color: '#78716c' }}>
          <Link to="/" style={{ color: 'var(--color-terracotta)', fontWeight: 600, textDecoration: 'none' }}>
            Continue as guest
          </Link>
        </p>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  border: '1.5px solid #e7e5e4',
  borderRadius: '0.5rem',
  padding: '0.7rem 1rem',
  fontSize: '1rem',
  fontFamily: 'Inter, sans-serif',
  outline: 'none',
  color: 'var(--color-teak)',
  background: 'var(--color-bg)',
  width: '100%',
  boxSizing: 'border-box',
}
