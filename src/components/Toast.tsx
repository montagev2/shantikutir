import { useEffect, useState, useCallback } from 'react'

export interface ToastMessage {
  id: string
  text: string
  icon?: string
  type?: 'success' | 'error' | 'info'
}

let toastListener: ((toast: ToastMessage) => void) | null = null

export function showToast(text: string, iconOrType: string = '', maybeType: 'success' | 'error' | 'info' = 'success') {
  let type: 'success' | 'error' | 'info' = 'success'
  let icon = ''

  if (iconOrType === 'success' || iconOrType === 'error' || iconOrType === 'info') {
    type = iconOrType
  } else {
    icon = iconOrType
    type = maybeType
  }

  if (toastListener) {
    toastListener({ id: Math.random().toString(), text, icon, type })
  }
}

function StandaloneToast({
  message,
  type = 'info',
  onClose,
  duration = 3000,
}: {
  message: string
  type?: 'success' | 'error' | 'info'
  onClose?: () => void
  duration?: number
}) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      onClose?.()
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  if (!visible) return null

  const isSuccess = type === 'success'
  const isError = type === 'error'

  return (
    <div
      className="glass-panel-elevated animate-pop-in"
      style={{
        position: 'fixed',
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100000,
        padding: '0.85rem 1.6rem',
        borderRadius: 'var(--radius-full, 9999px)',
        border: `1.5px solid ${isSuccess ? 'var(--emerald, #10b981)' : isError ? 'var(--rose, #ef4444)' : 'var(--gold, #c89838)'}`,
        background: isSuccess
          ? 'rgba(6, 78, 59, 0.95)'
          : isError
            ? 'rgba(127, 29, 29, 0.95)'
            : 'rgba(30, 26, 23, 0.96)',
        color: '#fff',
        fontWeight: 700,
        fontSize: '0.92rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        boxShadow: '0 12px 36px rgba(0,0,0,0.7)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      <span>{isSuccess ? '✓' : isError ? '!' : 'ℹ'}</span>
      <span>{message}</span>
    </div>
  )
}

export function Toast(props?: {
  message?: string
  type?: 'success' | 'error' | 'info'
  onClose?: () => void
  duration?: number
}) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    toastListener = (t) => {
      setToasts((prev) => [...prev.slice(-3), t])
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id))
      }, 3500)
    }
    return () => {
      toastListener = null
    }
  }, [])

  if (props?.message) {
    return (
      <StandaloneToast
        message={props.message}
        type={props.type}
        onClose={props.onClose}
        duration={props.duration}
      />
    )
  }

  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: '1.25rem',
        right: '1.25rem',
        zIndex: 100000,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
        maxWidth: '90vw',
      }}
    >
      {toasts.map((t) => {
        const isSuccess = t.type === 'success'
        const isError = t.type === 'error'
        return (
          <div
            key={t.id}
            className="animate-pop-in"
            style={{
              padding: '0.75rem 1.25rem',
              borderRadius: 'var(--radius-md, 12px)',
              border: `1.5px solid ${isSuccess ? 'var(--emerald, #10b981)' : isError ? 'var(--rose, #ef4444)' : 'var(--gold, #c89838)'}`,
              background: isSuccess
                ? 'rgba(6, 78, 59, 0.95)'
                : isError
                  ? 'rgba(127, 29, 29, 0.95)'
                  : 'rgba(30, 26, 23, 0.96)',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              boxShadow: '0 12px 36px rgba(0,0,0,0.7)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
          >
            <span>{isSuccess ? '✓' : isError ? '!' : 'ℹ'}</span>
            <span>{t.text}</span>
          </div>
        )
      })}
    </div>
  )
}

interface ToastState {
  message: string
  type: 'success' | 'error' | 'info'
  key: number
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null)

  const triggerToast = useCallback((message: string, type: ToastState['type'] = 'info') => {
    showToast(message, type)
    setToast({ message, type, key: Date.now() })
  }, [])

  const hideToast = useCallback(() => setToast(null), [])

  return { toast, showToast: triggerToast, hideToast }
}

export default Toast
