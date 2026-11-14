import type { Order } from '../types'
import { formatOrderId, getOrderToken, STORE_NAME, STORE_ADDRESS, SUPPORT_PHONE, getOrderDeliveryOtp, isOrderOtpRequired } from '../lib/business'

interface ThermalReceiptProps {
  order: Order
  mode?: 'kot' | 'bill'
  onClose: () => void
}

export default function ThermalReceipt({ order, mode = 'kot', onClose }: ThermalReceiptProps) {
  const handlePrint = () => {
    window.print()
  }

  const isKot = mode === 'kot'
  const isCash = !order.utr || order.utr.includes('CASH')

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          color: '#000000',
          width: '100%',
          maxWidth: '340px',
          borderRadius: '12px',
          padding: '1.25rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: '13px',
          lineHeight: 1.4,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Action Controls (Hidden when printed) */}
        <div className="no-print" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.75rem' }}>
          <button
            type="button"
            onClick={handlePrint}
            style={{
              flex: 1,
              minHeight: '44px',
              background: '#f59e0b',
              color: '#000000',
              border: 'none',
              padding: '0.65rem',
              borderRadius: '8px',
              fontWeight: 900,
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              touchAction: 'manipulation',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Print Slip (58/80mm)
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              minHeight: '44px',
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              color: '#374151',
              padding: '0.65rem 1rem',
              borderRadius: '8px',
              fontWeight: 700,
              cursor: 'pointer',
              touchAction: 'manipulation',
            }}
          >
            Close
          </button>
        </div>

        {/* Printable Ticket Area */}
        <div className="printable-receipt" style={{ textAlign: 'center' }}>
          {/* Header */}
          <div style={{ fontWeight: 'bold', fontSize: '16px', letterSpacing: '1px' }}>
            {STORE_NAME.toUpperCase()}
          </div>
          <div style={{ fontSize: '11px', color: '#333' }}>{STORE_ADDRESS}</div>
          <div style={{ fontSize: '11px', color: '#333' }}>Tel: {SUPPORT_PHONE}</div>

          <div style={{ margin: '8px 0', borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '4px 0', fontWeight: 'bold' }}>
            {isKot ? '*** KITCHEN ORDER TICKET (KOT) ***' : '*** CASH RECEIPT / TAX INVOICE ***'}
          </div>

          {/* Metadata */}
          <div style={{ textAlign: 'left', fontSize: '12px', marginBottom: '8px' }}>
            <div style={{ fontSize: '15px', fontWeight: 900, marginBottom: '4px', borderBottom: '1px dashed #000', paddingBottom: '3px' }}>
              TOKEN NO: {getOrderToken(order.id)}
            </div>
            <div><strong>ORDER ID:</strong> #{formatOrderId(order.id)}</div>
            {!isKot && (
              isOrderOtpRequired(order) ? (
                <div><strong>HANDOVER OTP:</strong> {getOrderDeliveryOtp(order)}</div>
              ) : order.orderType === 'dine_in' ? (
                <div><strong>SERVICE:</strong> TABLE DINE-IN (NO OTP)</div>
              ) : (
                <div><strong>PAYMENT:</strong> CASH ON DELIVERY (NO OTP)</div>
              )
            )}
            <div><strong>DATE:</strong> {new Date(order.createdAt || order.created_at || Date.now()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
            <div><strong>CUSTOMER:</strong> {order.userName} ({order.phone})</div>
            <div>
              <strong>ORDER TYPE:</strong>{' '}
              {order.orderType === 'dine_in'
                ? `[DINE-IN] Table ${order.tableNo || 'General'}`
                : order.orderType === 'takeaway'
                ? `[TAKEAWAY] ${order.address || 'Car / Counter Pickup'}`
                : `[HOME DELIVERY (5 km)] ${order.address}`}
            </div>
          </div>

          <div style={{ borderTop: '1px solid #000', margin: '4px 0' }} />

          {/* Items Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '12px' }}>
            <span style={{ textAlign: 'left' }}>QTY / ITEM</span>
            {!isKot && <span>AMOUNT</span>}
          </div>

          <div style={{ borderTop: '1px solid #000', margin: '4px 0 8px' }} />

          {/* Items List */}
          <div style={{ textAlign: 'left' }}>
            {(order.items || []).map((it, idx) => {
              const unitPrice = it.unitPrice ?? it.price ?? 0
              const qty = it.qty ?? it.quantity ?? 1
              const name = it.name ?? it.product_name ?? 'Dish'
              const portion = it.portion ?? it.size_label ?? 'Full'
              return (
                <div key={idx} style={{ marginBottom: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span>
                      {qty} x {name} ({portion === 'A' ? 'Family' : portion === 'B' ? 'Full' : 'Half'})
                    </span>
                    {!isKot && <span>Rs.{unitPrice * qty}</span>}
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

          {/* Financial Totals (Bill Mode) */}
          {!isKot && (
            <div style={{ textAlign: 'right', fontSize: '12px' }}>
              <div>Subtotal: Rs.{order.subtotal || order.total}</div>
              {(order.deliveryFee ?? 0) > 0 && <div>Delivery Fee: Rs.{order.deliveryFee}</div>}
              {(order.discountAmount ?? 0) > 0 && <div>Discount: -Rs.{order.discountAmount}</div>}
              <div style={{ fontSize: '15px', fontWeight: 'bold', marginTop: '4px' }}>
                TOTAL: Rs.{order.total}
              </div>
              <div style={{ fontSize: '11px', color: '#444', marginTop: '2px' }}>
                Payment: {isCash ? 'CASH PENDING' : (order.utr && order.utr !== 'UPI' ? `UPI PAID (${order.utr})` : 'UPI PAID')}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: '12px', fontSize: '11px', textAlign: 'center', borderTop: '1px solid #000', paddingTop: '6px' }}>
            {isKot ? 'Kitchen Instruction: Prepare fresh & hot' : 'Thank you for choosing Shanti Kutir! Visit again.'}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .printable-receipt, .printable-receipt * {
            visibility: visible !important;
          }
          .printable-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}

