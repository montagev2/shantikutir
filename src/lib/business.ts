// Shanti Kutir - Business Constants
// All values are specific to this restaurant. Zero shared with The Food Garden.

export const STORE_NAME = 'Shanti Kutir'
export const STORE_NAME_BN = 'শান্তিকুটির'
export const STORE_TAGLINE = 'Peaceful Dining · Authentic Taste'
export const STORE_TAGLINE_BN = 'শান্তি ও স্বাদের মেলবন্ধন'
export const SUPPORT_PHONE = '+91XXXXXXXXXX' // placeholder - client to confirm
export const STORE_ADDRESS = 'Tamluk-Nandakumar Road, Purba Medinipur, West Bengal'
export const UPI_ID = 'YOUR_UPI_ID@bank' // placeholder - client to provide
export const UPI_MERCHANT_NAME = 'SHANTI KUTIR'
export const ORDER_ID_PREFIX = 'SK' // format: SK-DDMM-XXX
export const MIN_ORDER_AMOUNT = 150
export const RESTAURANT_COORDINATES = { lat: 22.177882, lng: 87.869264 }
export const MAX_DELIVERY_RADIUS_KM = 3
export const SUPER_ADMIN_PHONES: string[] = [] // empty - client to provide

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
