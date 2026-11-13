import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  onClose: () => void
  duration?: number
}

export function Toast({ message, type = 'info', onClose, duration = 3000 }: ToastProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      onClose()
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  if (!visible) return null

  const bg =
    type === 'success' ? '#65a30d' : type === 'error' ? '#c2410c' : '#d97706'

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        background: bg,
        color: '#fff',
        padding: '0.75rem 1.5rem',
        borderRadius: '0.5rem',
        fontWeight: 600,
        fontSize: '0.95rem',
        zIndex: 9999,
        boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
        maxWidth: '90vw',
        textAlign: 'center',
      }}
    >
      {message}
    </div>
  )
}

// Hook for managing toasts
import { useState as useS, useCallback } from 'react'

interface ToastState {
  message: string
  type: 'success' | 'error' | 'info'
  key: number
}

export function useToast() {
  const [toast, setToast] = useS<ToastState | null>(null)

  const showToast = useCallback((message: string, type: ToastState['type'] = 'info') => {
    setToast({ message, type, key: Date.now() })
  }, [])

  const hideToast = useCallback(() => setToast(null), [])

  return { toast, showToast, hideToast }
}
