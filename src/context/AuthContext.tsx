import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { Profile, AuthState } from '../types'
import { verifyLogin, registerOrUpgrade, keepalivePing } from '../lib/api'
import { sanitisePhone, isValidPhone, isValidPin, sanitiseName } from '../lib/security'

interface AuthContextValue extends AuthState {
  user: Profile | null
  login: (phone: string, pin: string) => Promise<void>
  register: (phone: string, pin: string, name: string) => Promise<void>
  logout: () => void
  clearError: () => void
  updateOwnName: (name: string) => Promise<{ ok: boolean }>
  updateOwnPin: (newPin: string) => Promise<{ ok: boolean }>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const STORAGE_KEY = 'sk_profile'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    profile: null,
    loading: true,
    error: null,
  })
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Restore session from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const profile = JSON.parse(raw) as Profile
        setState({ profile, loading: false, error: null })
        startHeartbeat()
      } else {
        setState(s => ({ ...s, loading: false }))
      }
    } catch {
      setState(s => ({ ...s, loading: false }))
    }
    return () => stopHeartbeat()
  }, [])

  function startHeartbeat() {
    stopHeartbeat()
    heartbeatRef.current = setInterval(() => {
      keepalivePing().catch(() => {/* silent */})
    }, 60_000)
  }

  function stopHeartbeat() {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }
  }

  async function login(phone: string, pin: string) {
    const cleanPhone = sanitisePhone(phone)
    if (!isValidPhone(cleanPhone)) throw new Error('Enter a valid 10-digit mobile number')
    if (!isValidPin(pin)) throw new Error('PIN must be exactly 4 digits')
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const profile = await verifyLogin(cleanPhone, pin)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
      setState({ profile, loading: false, error: null })
      startHeartbeat()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed'
      setState(s => ({ ...s, loading: false, error: msg }))
      throw err
    }
  }

  async function register(phone: string, pin: string, name: string) {
    const cleanPhone = sanitisePhone(phone)
    const cleanName = sanitiseName(name)
    if (!isValidPhone(cleanPhone)) throw new Error('Enter a valid 10-digit mobile number')
    if (!isValidPin(pin)) throw new Error('PIN must be exactly 4 digits')
    if (!cleanName) throw new Error('Name is required')
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const profile = await registerOrUpgrade(cleanPhone, pin, cleanName)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
      setState({ profile, loading: false, error: null })
      startHeartbeat()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed'
      setState(s => ({ ...s, loading: false, error: msg }))
      throw err
    }
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY)
    stopHeartbeat()
    setState({ profile: null, loading: false, error: null })
  }

  function clearError() {
    setState(s => ({ ...s, error: null }))
  }

  async function updateOwnName(name: string): Promise<{ ok: boolean }> {
    if (!state.profile) return { ok: false }
    try {
      const { updateOwnProfile } = await import('../lib/api')
      await updateOwnProfile(state.profile.id, name)
      const updated = { ...state.profile, name }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      setState(s => ({ ...s, profile: updated }))
      return { ok: true }
    } catch {
      return { ok: false }
    }
  }

  async function updateOwnPin(newPinVal: string): Promise<{ ok: boolean }> {
    if (!state.profile) return { ok: false }
    try {
      const { updateOwnPin: apiUpdatePin } = await import('../lib/api')
      await apiUpdatePin(state.profile.id, '', newPinVal)
      return { ok: true }
    } catch {
      return { ok: false }
    }
  }

  return (
    <AuthContext.Provider value={{ ...state, user: state.profile, login, register, logout, clearError, updateOwnName, updateOwnPin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
