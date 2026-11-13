// Shared TypeScript types for Shanti Kutir
// No Food Garden data, IDs, or credentials here.

export interface Profile {
  id: string
  phone: string
  name: string | null
  role: 'customer' | 'staff' | 'admin'
  created_at: string
  last_active: string | null
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
}

export interface CartItem {
  product: Product
  quantity: number
  size: 'a' | 'b' | 'c'
}

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
}

export interface OrderItemRow {
  id: string
  order_id: string
  product_id: string
  product_name: string
  size_label: string
  price: number
  quantity: number
}

export interface Coupon {
  id: string
  code: string
  discount_type: 'flat' | 'percent'
  discount_value: number
  min_order: number
  max_uses: number | null
  used_count: number
  active: boolean
  expires_at: string | null
  created_at: string
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

export interface AuthState {
  profile: Profile | null
  loading: boolean
  error: string | null
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
