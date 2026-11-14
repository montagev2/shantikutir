import { useState, useEffect } from 'react'

/**
 * useDebounce hook: delays updating the value until `delayMs` of quiet time has elapsed.
 * Reduces lag and heavy re-filtering on mobile browsers.
 */
export function useDebounce<T>(value: T, delayMs = 200): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delayMs)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delayMs])

  return debouncedValue
}
