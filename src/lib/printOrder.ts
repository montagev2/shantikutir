import type { Order } from '../types'
import { STORE_NAME, formatOrderId, getOrderToken } from './business'

export function printOrderInvoice(order: Order) {
  const shortId = formatOrderId(order.id)
  const token = getOrderToken(order.id)
  const rows = (order.items || [])
    .map((it) => {
      const price = it.unitPrice ?? it.price ?? 0
      const qty = it.qty ?? it.quantity ?? 1
      const portion = it.portion ?? it.size_label ?? 'Regular'
      const name = it.name ?? it.product_name ?? 'Dish'
      return `<tr><td>${name} (${portion})</td><td>${qty}</td><td>Rs.${price}</td><td>Rs.${price * qty}</td></tr>`
    })
    .join('')

  const adv = order.advanceAmount ?? 0
  const isPaidOnline = adv >= order.total || (order.utr && order.utr !== 'CASH') || (order.payment_method === 'upi' && order.utr_verified)
  const paymentLabel = isPaidOnline ? 'PAID ONLINE (UPI)' : 'CASH ON ARRIVAL'
  const dateStr = order.createdAt || order.created_at || new Date().toISOString()
  const customerName = order.userName || order.customer_name || 'Customer'
  const phone = order.phone || order.customer_phone || ''
  const orderType = order.orderType || order.dining_mode || 'dine_in'
  const tableNo = order.tableNo || order.table_number || ''
  const address = order.address || order.delivery_address || ''

  const html = `<!DOCTYPE html><html><head><title>Bill ${shortId}</title>
  <style>
    body{font-family:'Poppins','Hind Siliguri',system-ui,sans-serif;padding:20px;color:#111}
    h1{margin:0 0 4px;font-size:20px} .token{font-size:16px;font-weight:900;color:#000;margin:4px 0} .muted{color:#666;font-size:13px}
    table{width:100%;border-collapse:collapse;margin-top:14px}
    th,td{border-bottom:1px solid #ddd;padding:6px 4px;text-align:left;font-size:13px}
    .tot{margin-top:14px;font-size:14px}
  </style></head><body>
  <h1>${STORE_NAME}</h1>
  <div class="token">TOKEN NO: ${token}</div>
  <p class="muted">Order #${shortId} - ${new Date(dateStr).toLocaleString()}</p>
  <p><strong>Customer: ${customerName} (${phone})</strong><br/>
  Type: <b>${orderType === 'dine_in' ? `Dine-In (${tableNo || 'Hall'})` : orderType === 'takeaway' ? 'Highway Takeaway' : `Delivery (${address})`}</b></p>
  <table><thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
  <tbody>${rows}</tbody></table>
  <div class="tot">
    <div>Total Amount: <strong>Rs.${order.total}</strong></div>
    <div>Payment Status: <strong>${paymentLabel}</strong></div>
  </div>
  <script>window.onload=()=>window.print()</script>
  </body></html>`

  const w = window.open('', '_blank', 'width=480,height=700')
  if (w) {
    w.document.write(html)
    w.document.close()
  }
}
