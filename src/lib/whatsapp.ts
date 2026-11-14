/**
 * Shanti Kutir - Automated WhatsApp Operations Engine
 * Generates formatted, 1-tap WhatsApp messages for invoices, kitchen alerts, and rider updates.
 */

import { formatOrderId, getOrderToken, STORE_NAME, SUPPORT_PHONE, SUPPORT_WHATSAPP } from './business'
import type { Order } from '../types'

export function cleanPhoneForWhatsApp(phone?: string): string {
  if (!phone) return SUPPORT_WHATSAPP
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return digits
  return digits || SUPPORT_WHATSAPP
}

export const formatWhatsAppPhone = cleanPhoneForWhatsApp

/**
 * 1. Cashier / Kitchen -> Customer: Official Formatted Order Receipt & Tracking
 */
export function openCustomerWhatsAppReceipt(order: Order): void {
  const targetPhone = cleanPhoneForWhatsApp(order.phone || order.customer_phone || '')
  const itemsText = (order.items || [])
    .map((it) => {
      const price = it.unitPrice ?? it.price ?? 0
      const qty = it.qty ?? it.quantity ?? 1
      const size = it.portion ?? it.size_label ?? 'Regular'
      const name = it.name ?? it.product_name ?? 'Item'
      return `- ${qty}x ${name} (${size}) - Rs.${price * qty}`
    })
    .join('\n')

  const isCash = (!order.utr && !order.utr_number) || order.utr === 'CASH' || order.payment_method === 'cash'
  const utrRef = order.utr || order.utr_number
  const paymentStatus = isCash
    ? 'Cash Payment (Pending on Delivery/Table)'
    : utrRef && utrRef !== 'UPI'
      ? `Paid via UPI (Ref: ${utrRef})`
      : 'Paid via UPI'
  const trackUrl = `https://shantikutir.vercel.app/track?id=${encodeURIComponent(order.id)}`

  const orderType = order.orderType || order.dining_mode || 'dine_in'
  const tableNo = order.tableNo || order.table_number || ''
  const address = order.address || order.delivery_address || ''
  const customerName = order.userName || order.customer_name || 'Customer'
  const phone = order.phone || order.customer_phone || ''
  const adv = order.advanceAmount ?? 0

  const locationText =
    orderType === 'dine_in'
      ? `${tableNo ? `Table ${tableNo}` : 'Dine-In'}`
      : orderType === 'takeaway'
        ? `Highway Takeaway (${address || 'Car / Counter Pickup'})`
        : `Home Delivery: ${address}`

  const message = [
    `*${STORE_NAME.toUpperCase()} - ORDER INVOICE*`,
    '--------------------------------',
    `*Token No:* ${getOrderToken(order.id)}`,
    `*Order Reference:* #${formatOrderId(order.id)}`,
    `*Customer:* ${customerName}`,
    `*Phone:* ${phone}`,
    `*Type:* ${locationText}`,
    '--------------------------------',
    '*ORDERED ITEMS:*',
    itemsText,
    '--------------------------------',
    `*Total Amount:* Rs.${order.total}`,
    adv > 0 && adv < order.total
      ? `*Advance Paid:* Rs.${adv} | Balance Due: Rs.${order.total - adv}`
      : '',
    `*Payment Mode:* ${paymentStatus}`,
    '--------------------------------',
    `*Live Order Tracker:* ${trackUrl}`,
    `*Restaurant Helpline:* ${SUPPORT_PHONE}`,
    '\n_Thank you for dining with Shanti Kutir (Tamluk-Nandakumar Road, NH-116)!_',
  ]
    .filter(Boolean)
    .join('\n')

  window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`, '_blank')
}

/**
 * 2. Rider -> Customer: 1-Tap Arrival Notification
 */
export function openRiderArrivalWhatsApp(order: Order): void {
  const targetPhone = cleanPhoneForWhatsApp(order.phone || order.customer_phone || '')
  const customerName = order.userName || order.customer_name || 'Customer'
  const address = order.address || order.delivery_address || ''
  const isCash = (!order.utr && !order.utr_number) || order.utr === 'CASH' || order.payment_method === 'cash'

  const message = [
    `*SHANTI KUTIR - DELIVERY PARTNER AT YOUR LOCATION*`,
    '--------------------------------',
    `Hi *${customerName}*, I have arrived with your hot food order *#${formatOrderId(order.id)}* (Token: ${getOrderToken(order.id)})!`,
    `*Delivery Address:* ${address}`,
    isCash
      ? `*Amount to Collect (Cash):* Rs.${order.total}`
      : '*Order is Paid Online*',
    '\nPlease collect your meal. Enjoy your dining!',
  ].join('\n')

  window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`, '_blank')
}

/**
 * 3. Customer -> Friends / Family: Share Order & Live Tracking
 */
export function shareOrderOnWhatsApp(order: Order): void {
  const message = [
    `Ordered delicious food from *${STORE_NAME}*!`,
    `Token: ${getOrderToken(order.id)} - Order: #${formatOrderId(order.id)} (Rs.${order.total})`,
    `Track delivery in real-time here: https://shantikutir.vercel.app/track?id=${encodeURIComponent(order.id)}`,
    'Order authentic Bengali food on: https://shantikutir.vercel.app',
  ].join('\n')

  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
}

/**
 * 4. Kitchen / Chef -> Supplier: 1-Tap Daily Sourcing List
 */
export function openSupplierSourcingWhatsApp(items: Array<{ name: string; totalQty: number }>): void {
  const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })

  const itemsList = items
    .map((it) => `- *${it.name}:* ${it.totalQty} plates / portions`)
    .join('\n')

  const message = [
    `*${STORE_NAME.toUpperCase()} - KITCHEN SOURCING MANIFEST*`,
    `*Date:* ${dateStr} (${timeStr})`,
    '--------------------------------',
    '*REQUIRED INGREDIENTS / DISH VOLUME:*',
    itemsList || '- No active cooking items currently queued.',
    '--------------------------------',
    `*Deliver to:* ${STORE_NAME} Kitchen, Tamluk-Nandakumar Road, NH-116`,
    `*Manager Phone:* ${SUPPORT_PHONE}`,
    '\n_Please dispatch fresh stock as per standard procurement specs._',
  ].join('\n')

  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
}
