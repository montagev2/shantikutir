import { supabase } from './supabase'
import type { Profile } from '../types'

// Verify login by phone + PIN via RPC
export async function verifyLogin(phone: string, pin: string): Promise<Profile> {
  const { data, error } = await supabase.rpc('verify_login', {
    p_phone: phone,
    p_pin: pin,
  })
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error('Invalid phone or PIN')
  return data[0] as Profile
}

// Register or upgrade a customer account
export async function registerOrUpgrade(
  phone: string,
  pin: string,
  name: string,
): Promise<Profile> {
  const { data, error } = await supabase.rpc('register_or_upgrade_customer_secure', {
    p_phone: phone,
    p_pin: pin,
    p_name: name,
  })
  if (error) throw new Error(error.message)
  return data as Profile
}

// Submit an order via secure RPC (anon role never writes directly to tables)
export async function submitOrder(payload: {
  p_customer_id: string | null
  p_customer_name: string
  p_customer_phone: string
  p_dining_mode: string
  p_table_number: string | null
  p_delivery_address: string | null
  p_delivery_lat: number | null
  p_delivery_lng: number | null
  p_items: Array<{
    product_id: string
    product_name: string
    size_label: string
    price: number
    quantity: number
  }>
  p_subtotal: number
  p_discount_amount: number
  p_total: number
  p_payment_method: string
  p_coupon_code: string | null
}): Promise<string> {
  const { data, error } = await supabase.rpc('submit_order_secure', payload)
  if (error) throw new Error(error.message)
  return data as string // returns the new order id
}

// Track order publicly (no auth required)
export async function trackOrderPublic(orderId: string) {
  const { data, error } = await supabase.rpc('track_order_public', {
    p_order_id: orderId,
  })
  if (error) throw new Error(error.message)
  return data
}

// Update order status (staff/admin)
export async function updateOrderStatus(
  orderId: string,
  newStatus: string,
  staffId: string,
): Promise<void> {
  const { error } = await supabase.rpc('update_order_status_secure', {
    p_order_id: orderId,
    p_new_status: newStatus,
    p_staff_id: staffId,
  })
  if (error) throw new Error(error.message)
}

// Verify UTR (staff/admin)
export async function verifyUtr(
  orderId: string,
  staffId: string,
  verified: boolean,
): Promise<void> {
  const { error } = await supabase.rpc('verify_utr_secure', {
    p_order_id: orderId,
    p_staff_id: staffId,
    p_verified: verified,
  })
  if (error) throw new Error(error.message)
}

// Get all orders for staff
export async function getAllOrdersStaff() {
  const { data, error } = await supabase.rpc('get_all_orders_staff')
  if (error) throw new Error(error.message)
  return data
}

// Get all users for admin
export async function getAllUsersStaff() {
  const { data, error } = await supabase.rpc('get_all_users_staff')
  if (error) throw new Error(error.message)
  return data
}

// Update own profile
export async function updateOwnProfile(
  userId: string,
  name: string,
): Promise<void> {
  const { error } = await supabase.rpc('update_own_profile_secure', {
    p_user_id: userId,
    p_name: name,
  })
  if (error) throw new Error(error.message)
}

// Update own PIN
export async function updateOwnPin(
  userId: string,
  oldPin: string,
  newPin: string,
): Promise<void> {
  const { error } = await supabase.rpc('update_own_pin_secure', {
    p_user_id: userId,
    p_old_pin: oldPin,
    p_new_pin: newPin,
  })
  if (error) throw new Error(error.message)
}

// Keepalive ping
export async function keepalivePing(): Promise<void> {
  await supabase.rpc('keepalive_ping')
}

// Rate an order
export async function rateOrder(orderId: string, rating: number): Promise<void> {
  const { error } = await supabase.rpc('rate_order_secure', {
    p_order_id: orderId,
    p_rating: rating,
  })
  if (error) throw new Error(error.message)
}

// Get active coupons for user
export async function getActiveCoupons(userId: string | null) {
  const { data, error } = await supabase.rpc('get_active_coupons_for_user', {
    p_user_id: userId,
  })
  if (error) throw new Error(error.message)
  return data
}

// Delete orders (admin)
export async function deleteOrders(orderIds: string[]): Promise<void> {
  const { error } = await supabase.rpc('delete_orders_secure', {
    p_order_ids: orderIds,
  })
  if (error) throw new Error(error.message)
}

// Update product price and stock (admin)
export async function updateProductPriceAndStock(payload: {
  p_product_id: string
  p_p_a: number
  p_p_b: number | null
  p_p_c: number | null
  p_in_stock: boolean
  p_archived: boolean
}): Promise<void> {
  const { error } = await supabase.rpc('update_product_price_and_stock', payload)
  if (error) throw new Error(error.message)
}

// Reset all product stock (admin)
export async function resetAllProductsStock(): Promise<void> {
  const { error } = await supabase.rpc('reset_all_products_stock_secure')
  if (error) throw new Error(error.message)
}

// Upsert daily report (admin)
export async function upsertDailyReport(payload: {
  p_report_date: string
  p_total_orders: number
  p_total_revenue: number
  p_notes: string | null
  p_created_by: string
}): Promise<void> {
  const { error } = await supabase.rpc('upsert_daily_report_secure', payload)
  if (error) throw new Error(error.message)
}

// Admin coupon management
export async function adminCreateCoupon(payload: {
  p_code: string
  p_discount_type: string
  p_discount_value: number
  p_min_order: number
  p_max_uses: number | null
  p_expires_at: string | null
}): Promise<void> {
  const { error } = await supabase.rpc('admin_create_coupon_secure', payload)
  if (error) throw new Error(error.message)
}

export async function adminToggleCoupon(couponId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_toggle_coupon_secure', {
    p_coupon_id: couponId,
  })
  if (error) throw new Error(error.message)
}

export async function adminDeleteCoupon(couponId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_coupon_secure', {
    p_coupon_id: couponId,
  })
  if (error) throw new Error(error.message)
}

// Admin staff management
export async function adminCreateStaff(payload: {
  p_phone: string
  p_name: string
  p_pin: string
  p_role: string
}): Promise<void> {
  const { error } = await supabase.rpc('admin_create_staff_secure', payload)
  if (error) throw new Error(error.message)
}

export async function adminDeleteUser(userId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_user_secure', {
    p_target_id: userId,
  })
  if (error) throw new Error(error.message)
}

// Approve extended delivery (admin)
export async function approveExtendedDelivery(orderId: string): Promise<void> {
  const { error } = await supabase.rpc('approve_extended_delivery_secure', {
    p_order_id: orderId,
  })
  if (error) throw new Error(error.message)
}
