// Security helpers for input sanitisation and validation

export function sanitisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('91') && digits.length === 12) return digits.slice(2)
  return digits.slice(-10)
}

export function isValidPhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(sanitisePhone(phone))
}

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin)
}

export function sanitiseName(raw: string): string {
  return raw.trim().replace(/[<>'"]/g, '').slice(0, 60)
}

export function sanitiseAddress(raw: string): string {
  return raw.trim().replace(/[<>'"]/g, '').slice(0, 200)
}

export function isValidUtr(utr: string): boolean {
  return /^\d{12,22}$/.test(utr.trim())
}

export function isValidOtp(otp: string): boolean {
  return /^\d{4}$/.test(otp.trim())
}

// Generate a 4-digit numeric OTP
export function generateOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}

/**
 * Strips HTML tags, script vectors, javascript: protocols, and inline event handlers.
 */
export function sanitizeText(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') return ''

  return input
    .replace(/\0/g, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<(\/?(iframe|object|embed|applet|form|link|style|meta))\b[^>]*>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/(javascript|vbscript|data):/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
}

export function sanitizeObject<T>(obj: T): T {
  if (typeof obj === 'string') {
    return sanitizeText(obj) as unknown as T
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item)) as unknown as T
  }
  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value)
    }
    return sanitized
  }
  return obj
}

interface RateLimitRecord {
  attempts: number[]
  lockedUntil: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

const rateLimitStore = new Map<string, RateLimitRecord>()

export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
  lockDurationMs: number = windowMs,
): RateLimitResult {
  const now = Date.now()
  let record = rateLimitStore.get(key)

  if (!record) {
    record = { attempts: [], lockedUntil: 0 }
    rateLimitStore.set(key, record)
  }

  if (record.lockedUntil > now) {
    const retryAfter = Math.ceil((record.lockedUntil - now) / 1000)
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: retryAfter,
    }
  }

  record.attempts = record.attempts.filter((timestamp) => now - timestamp < windowMs)

  if (record.attempts.length >= maxAttempts) {
    record.lockedUntil = now + lockDurationMs
    const retryAfter = Math.ceil(lockDurationMs / 1000)
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: retryAfter,
    }
  }

  record.attempts.push(now)
  const remaining = maxAttempts - record.attempts.length

  return {
    allowed: true,
    remaining,
    retryAfterSeconds: 0,
  }
}

export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key)
}
