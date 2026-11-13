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
