// Shanti Kutir - Unified TypeScript Types
// Supports both Shanti Kutir Supabase DB schema and all luxury UI feature components

export type Portion = 'A' | 'B' | 'C'
export type Lang = 'en' | 'bn'
export type UserRole = 'customer' | 'staff' | 'admin' | 'seller' | 'rider'
export type DiningMode = 'dine_in' | 'takeaway' | 'delivery'
export type OrderType = DiningMode
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'cooking'
  | 'ready'
  | 'delivered'
  | 'cancelled'
  | 'refunded'
  | 'advance_paid'
export type DeliverySlot = 'morning' | 'evening' | 'instant'

export interface Profile {
  id: string
  phone: string
  name: string | null
  role: 'customer' | 'staff' | 'admin' | 'seller' | 'rider'
  created_at: string
  last_active: string | null
}

export type User = Profile

export interface AuthState {
  profile: Profile | null
  loading: boolean
  error: string | null
}

export interface Product {
  id: string
  name: string
  name_bn: string | null
  description: string | null
  category: string
  price_a: number
  price_b: number | null
  price_c: number | null
  label_a: string
  label_b: string | null
  label_c: string | null
  in_stock: boolean
  archived: boolean
  image_url: string | null
  sort_order: number
  created_at: string
  // Aliases for TFG component compatibility
  bnName?: string
  pA?: number
  pB?: number
  pC?: number
  imageUrl?: string
  isVeg?: boolean
  unit?: string
  emoji?: string
}

export type MenuItem = Product

export interface CartItem {
  product: Product
  quantity: number
  size: 'a' | 'b' | 'c' | 'A' | 'B' | 'C'
  // Optional TFG compat properties
  productId?: string
  portion?: Portion
  qty?: number
}

export interface OrderItemRow {
  id: string
  order_id: string
  product_id: string
  product_name: string
  size_label: string
  price: number
  quantity: number
  // Aliases for TFG compat
  productId?: string
  name?: string
  portion?: Portion
  qty?: number
  unitPrice?: number
}

export type OrderItem = OrderItemRow

export interface Order {
  id: string
  customer_id: string | null
  customer_name: string | null
  customer_phone: string | null
  dining_mode: 'dine_in' | 'takeaway' | 'delivery'
  table_number: string | null
  delivery_address: string | null
  delivery_lat: number | null
  delivery_lng: number | null
  status: string
  items: OrderItemRow[]
  subtotal: number
  discount_amount: number
  total: number
  payment_method: 'upi' | 'cash'
  utr_number: string | null
  utr_verified: boolean
  otp_code: string | null
  otp_used: boolean
  rating: number | null
  created_at: string
  updated_at: string
  // Aliases for TFG / Luxury UI compat
  userId?: string
  userName?: string
  phone?: string
  orderType?: 'dine_in' | 'takeaway' | 'delivery'
  tableNo?: string
  address?: string
  pin?: string
  geoLat?: number
  geoLng?: number
  deliveryFee?: number
  discountAmount?: number
  advanceAmount?: number
  utr?: string
  utrVerified?: boolean
  deliveryOtp?: string
  createdAt?: string
  updatedAt?: string
  deliverySlot?: DeliverySlot
  review?: string
  ratingTags?: string[]
  isExtendedDelivery?: boolean
  extendedDeliveryApproved?: boolean
  extraDeliveryCharge?: number
}

export interface Coupon {
  id?: string
  code: string
  discount_type: 'flat' | 'percent'
  discount_value: number
  min_order: number
  max_uses?: number | null
  used_count?: number
  active?: boolean
  expires_at?: string | null
  created_at?: string
  valid?: boolean
  discount?: number
  message?: string
  target_phone?: string | null
  show_popup?: boolean
  popup_title?: string | null
}

export interface DailyReport {
  id: string
  report_date: string
  total_orders: number
  total_revenue: number
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface Address {
  id?: number | string
  user_id?: string
  label: string
  address: string
  phone: string
  pin: string
  is_default: boolean
}

export type TicketCategory = 'payment' | 'delivery' | 'food_quality' | 'table_booking' | 'general'
export type TicketStatus = 'open' | 'in_progress' | 'resolved'

export interface TicketMessage {
  id: string
  sender: 'customer' | 'staff' | 'system'
  senderName: string
  text: string
  createdAt: string
}

export interface SupportTicket {
  id: string
  userId?: string
  userName: string
  phone: string
  orderId?: string
  category: TicketCategory
  subject: string
  message: string
  status: TicketStatus
  adminReply?: string
  messages?: TicketMessage[]
  createdAt: string
  updatedAt?: string
}

export interface StoreState {
  products: Product[]
  cart: CartItem[]
  diningMode: 'dine_in' | 'takeaway' | 'delivery'
  tableNumber: string
  deliveryAddress: string
  deliveryLat: number | null
  deliveryLng: number | null
  appliedCoupon: Coupon | null
  loadingProducts: boolean
}

export function isVegDish(product: Product): boolean {
  if (typeof product.isVeg === 'boolean') return product.isVeg
  const lower = (product.name + ' ' + (product.category || '')).toLowerCase()
  if (
    lower.includes('paneer') ||
    lower.includes('veg') ||
    lower.includes('tea') ||
    lower.includes('lassi') ||
    lower.includes('soda') ||
    lower.includes('drink') ||
    lower.includes('rice') ||
    lower.includes('naan') ||
    lower.includes('roti') ||
    lower.includes('paratha') ||
    lower.includes('dal') ||
    lower.includes('sweet') ||
    lower.includes('doi') ||
    lower.includes('payesh') ||
    lower.includes('rasgolla')
  ) {
    if (
      !lower.includes('chicken') &&
      !lower.includes('mutton') &&
      !lower.includes('fish') &&
      !lower.includes('prawn') &&
      !lower.includes('egg')
    ) {
      return true
    }
  }
  const nonVegKeywords = [
    'chicken',
    'mutton',
    'egg',
    'fish',
    'prawn',
    'chaap',
    'bharta',
    'paturi',
    'ilish',
    'rohu',
    'katla',
    'kebab',
    'tikka',
    'thali',
  ]
  return !nonVegKeywords.some((kw) => lower.includes(kw))
}
