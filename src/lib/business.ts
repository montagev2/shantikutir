// Shanti Kutir - Business Constants & Authentic Heritage Configuration
// Pure Shanti Kutir brand identity. Zero shared with The Food Garden.

export const STORE_NAME = 'Shanti Kutir'
export const STORE_NAME_BN = 'শান্তিকুটির'
export const STORE_TAGLINE = 'Authentic Bengali Heritage & Charcoal Tandoor'
export const STORE_TAGLINE_BN = 'শান্তি ও স্বাদের মেলবন্ধন'
export const SUPPORT_PHONE = '+91 90000 00000'
export const SUPPORT_WHATSAPP = '919000000000'
export const STORE_ADDRESS = 'Tamluk-Nandakumar Road, NH-116, Purba Medinipur, West Bengal'
export const STORE_HOURS = '10:00 AM – 11:30 PM'
export const UPI_ID = 'shantikutir@upi'
export const UPI_MERCHANT_NAME = 'SHANTI KUTIR'
export const ORDER_ID_PREFIX = 'SK' // format: SK-DDMM-XXX
export const MIN_ORDER_AMOUNT = 150
export const RESTAURANT_COORDINATES = { lat: 22.177882, lng: 87.869264 }
export const MAX_DELIVERY_RADIUS_KM = 5
export const SUPER_ADMIN_PHONES: string[] = []

export const GOOGLE_MAPS_LOCATION_URL = 'https://maps.google.com/?q=22.177882,87.869264'
export const GOOGLE_MAPS_DIRECTIONS_URL = 'https://www.google.com/maps/dir/?api=1&destination=22.177882,87.869264'
export const GOOGLE_MAPS_REVIEW_URL = 'https://search.google.com/local/writereview?placeid=ChIJ_shantikutir'

export const PORTION_LABELS: Record<'A' | 'B' | 'C', { en: string; bn: string }> = {
  A: { en: 'Family / Jumbo', bn: 'ফ্যামিলি / জাম্বো' },
  B: { en: 'Full Plate', bn: 'ফুল প্লেট' },
  C: { en: 'Half Plate', bn: 'হাফ প্লেট' },
}

export const DELIVERY_WINDOW = '30–45 mins'
export const DELIVERY_WINDOW_BN = '৩০–৪৫ মিনিট'

export const DINING_MODES = {
  DINE_IN: 'dine_in',
  TAKEAWAY: 'takeaway',
  DELIVERY: 'delivery',
} as const

export type DiningMode = (typeof DINING_MODES)[keyof typeof DINING_MODES]

export const DINING_MODE_LABELS: Record<DiningMode, string> = {
  dine_in: 'Dine In',
  takeaway: 'Takeaway',
  delivery: 'Home Delivery',
}

export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'delivered',
  'cancelled',
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

export function generateOrderId(): string {
  const now = new Date()
  const dd = String(now.getDate()).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const rand = Math.floor(100 + Math.random() * 900)
  return `${ORDER_ID_PREFIX}-${dd}${mm}-${rand}`
}

export function buildUpiDeepLink(
  amount: number,
  orderId: string,
  note = 'Shanti Kutir Order',
): string {
  const params = new URLSearchParams({
    pa: UPI_ID,
    pn: UPI_MERCHANT_NAME,
    am: amount.toFixed(2),
    cu: 'INR',
    tn: `${note} ${orderId}`,
  })
  return `upi://pay?${params.toString()}`
}

export function buildQrUrl(text: string, size = 200): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`
}

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function formatOrderId(id: string): string {
  if (!id) return ''
  const match = id.match(/^SK-(\d{4})-(\d+)(?:-(\d+))?$/i)
  if (match) {
    return match[3] ? `SK-${match[1]}-${match[2]}-${match[3]}` : `SK-${match[1]}-${match[2]}`
  }
  return id.replace(/^ord[-_]?/i, '').slice(0, 16).toUpperCase()
}

export function getOrderToken(id: string): string {
  if (!id) return ''
  const match = id.match(/^SK-\d{4}-(\d+)(?:-(\d+))?$/i)
  if (match) {
    return match[2] ? `#${match[1]}-${match[2]}` : `#${match[1]}`
  }
  const digits = id.replace(/\D/g, '')
  return digits.length >= 3 ? `#${digits.slice(-3)}` : `#${digits || id}`
}

export function isSuperAdmin(user?: { phone?: string; isSuperAdmin?: boolean } | null): boolean {
  if (!user) return false
  if (user.isSuperAdmin === true) return true
  if (user.phone && SUPER_ADMIN_PHONES.includes(user.phone.replace(/\D/g, ''))) return true
  return false
}

export function getRestaurantShiftStatus(): {
  isOpen: boolean
  statusText: string
  statusTextBn: string
  statusColor: string
  nextOpenTime: string
} {
  const now = new Date()
  const hours = now.getHours()
  const isOpen = hours >= 10 && hours < 23

  if (isOpen) {
    const hoursLeft = 23 - hours
    return {
      isOpen: true,
      statusText: `Kitchen Open · Closes at 11:30 PM (${hoursLeft}h left)`,
      statusTextBn: `রান্নাঘর খোলা · রাত ১১:৩০টায় বন্ধ (${hoursLeft} ঘন্টা বাকি)`,
      statusColor: '#22c55e',
      nextOpenTime: '11:30 PM',
    }
  } else {
    const hoursTillOpen = hours >= 23 ? 10 + (24 - hours) : 10 - hours
    return {
      isOpen: false,
      statusText: `Kitchen Closed · Re-opens Today 10:00 AM (${hoursTillOpen}h)`,
      statusTextBn: `রান্নাঘর বন্ধ · সকাল ১০টায় পুনরায় খুলবে (${hoursTillOpen} ঘন্টা)`,
      statusColor: '#f59e0b',
      nextOpenTime: 'Today 10:00 AM',
    }
  }
}

export function getOrderDeliveryOtp(
  order: { id: string; phone?: string; createdAt?: string; deliveryOtp?: string }
): string {
  if (order.deliveryOtp && /^\d{4}$/.test(order.deliveryOtp.trim())) {
    return order.deliveryOtp.trim()
  }
  const seed = `${order.id}${order.phone || ''}${order.createdAt || ''}`
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  const code = 1000 + (Math.abs(hash) % 9000)
  return String(code)
}

export function isOrderOtpRequired(order: any): boolean {
  if (!order) return false
  const mode = order.dining_mode || order.orderType || 'dine_in'
  return mode === 'delivery'
}

export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  return haversineKm(lat1, lon1, lat2, lon2)
}
