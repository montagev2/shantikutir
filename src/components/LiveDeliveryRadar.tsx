import { useState, useEffect, useMemo, useCallback } from 'react'
import type { Order } from '../types'
import ThreeRadarCanvas from './ThreeRadarCanvas'
import { supabase } from '../lib/supabase'
import {
  getOrderDeliveryOtp,
  isOrderOtpRequired,
  RESTAURANT_COORDINATES as RESTAURANT_COORDS,
  MAX_DELIVERY_RADIUS_KM,
  calculateDistanceKm,
} from '../lib/business'

interface LiveDeliveryRadarProps {
  order: Order
}

export default function LiveDeliveryRadar({ order }: LiveDeliveryRadarProps) {
  const [customerCoords, setCustomerCoords] = useState<{ lat: number; lng: number } | null>(() => {
    if (order.geoLat && order.geoLng) {
      return { lat: order.geoLat, lng: order.geoLng }
    }
    return null
  })
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [riderProgress, setRiderProgress] = useState(0.2) // 0 (at restaurant) to 1 (at customer)

  // Request live customer GPS with silent two-tier indoor fallback
  const handleLocateCustomer = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser')
      return
    }
    setGpsLoading(true)
    setGpsError(null)

    const onLocationSuccess = (pos: GeolocationPosition) => {
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      setCustomerCoords({ lat, lng })
      setGpsLoading(false)
      setGpsError(null)

      // Sync customer live GPS pin directly to Supabase so the rider's phone gets the exact pin
      if (order?.id && (!order.geoLat || !order.geoLng || Math.abs(order.geoLat - lat) > 0.0001)) {
        supabase
          .from('orders')
          .update({ geo_lat: lat, geo_lng: lng })
          .eq('id', order.id)
          .then(({ error }) => {
            if (error) console.warn('[LiveDeliveryRadar] Live GPS sync failed:', error.message)
          })
      }
    }

    navigator.geolocation.getCurrentPosition(
      onLocationSuccess,
      () => {
        // High accuracy satellite timed out (common indoors) â€” silently fall back to Wi-Fi/Cellular
        navigator.geolocation.getCurrentPosition(
          onLocationSuccess,
          (err2) => {
            setGpsLoading(false)
            if (err2.code === err2.PERMISSION_DENIED) {
              setGpsError('Location access was denied. Please allow location access to track delivery live.')
            } else {
              setGpsError('Using estimated delivery hub coordinates.')
            }
          },
          { enableHighAccuracy: false, timeout: 7000, maximumAge: 300000 }
        )
      },
      { enableHighAccuracy: true, timeout: 3500, maximumAge: 60000 }
    )
  }, [order?.id, order?.geoLat, order?.geoLng])

  // Auto-detect live customer GPS on mount (Strictly auto, mobile-first)
  useEffect(() => {
    if (!customerCoords && !gpsLoading) {
      handleLocateCustomer()
    }
  }, [customerCoords, gpsLoading, handleLocateCustomer])

  // Calculate real distance
  const distanceKm = useMemo(() => {
    if (customerCoords) {
      return calculateDistanceKm(
        RESTAURANT_COORDS.lat,
        RESTAURANT_COORDS.lng,
        customerCoords.lat,
        customerCoords.lng
      )
    }
    // Default estimate if GPS not yet granted (approx 2.4 km)
    return 2.4
  }, [customerCoords])

  // Real-time ticking timer so countdown updates smoothly as time passes
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000)
    return () => clearInterval(timer)
  }, [])

  // Elapsed time in minutes since order was created
  const elapsedMinutes = useMemo(() => {
    if (!order.createdAt) return 0
    const createdMs = new Date(order.createdAt).getTime()
    if (isNaN(createdMs)) return 0
    return Math.max(0, Math.floor((now - createdMs) / 60000))
  }, [order.createdAt, now])

  const isPending = order.status === 'pending'

  // Dynamic arrival countdown:
  // 1. Cancelled or Delivered: 0 mins.
  // 2. Pending: staff has NOT accepted yet. No countdown runs; shows awaiting acceptance.
  // 3. Confirmed / Cooking / Ready: starts at 45 mins, counts DOWN as time passes.
  const etaMinutes = useMemo(() => {
    if (order.status === 'delivered' || order.status === 'cancelled') return 0
    if (isPending) return 45 // Nominal initial delivery window, timer inactive until approved

    // Active countdown: starts from 45 min, decreases as time goes on
    const baseRemaining = Math.max(4, 45 - elapsedMinutes)

    if (order.status === 'ready') {
      // Out for delivery: bound by travel distance time
      const travelMins = Math.max(3, Math.round(distanceKm * 2.5 + 3))
      return Math.min(baseRemaining, travelMins)
    }

    return baseRemaining
  }, [order.status, isPending, elapsedMinutes, distanceKm])

  // Simulated live rider movement along route when out for delivery
  useEffect(() => {
    if (order.status === 'ready') {
      const interval = setInterval(() => {
        setRiderProgress((prev) => {
          if (prev >= 0.95) return 0.95
          return Number((prev + 0.05).toFixed(2))
        })
      }, 4000)
      return () => clearInterval(interval)
    } else if (order.status === 'delivered') {
      setRiderProgress(1.0)
    } else if (order.status === 'cancelled') {
      setRiderProgress(0)
    } else if (order.status === 'cooking') {
      setRiderProgress(0.25)
    } else if (order.status === 'confirmed') {
      setRiderProgress(0.12)
    } else {
      setRiderProgress(0.04) // Pending at restaurant hub
    }
  }, [order.status])

  // Google Maps directions URL
  const googleMapsUrl = useMemo(() => {
    const dest = customerCoords
      ? `${customerCoords.lat},${customerCoords.lng}`
      : encodeURIComponent(order.address || 'Nandakumar, West Bengal')
    return `https://www.google.com/maps/dir/?api=1&origin=${RESTAURANT_COORDS.lat},${RESTAURANT_COORDS.lng}&destination=${dest}&travelmode=driving`
  }, [customerCoords, order.address])

  const deliveryOtp = getOrderDeliveryOtp(order)
  const isWithinZone = distanceKm <= MAX_DELIVERY_RADIUS_KM

  const statusMeta = useMemo(() => {
    switch (order.status) {
      case 'cancelled':
        return {
          label: 'Order Cancelled',
          color: '#f87171',
          bg: 'rgba(239, 68, 68, 0.18)',
          border: 'rgba(239, 68, 68, 0.4)',
          dot: '#ef4444',
        }
      case 'delivered':
        return {
          label: 'Delivered',
          color: '#4ade80',
          bg: 'rgba(34, 197, 94, 0.18)',
          border: 'rgba(34, 197, 94, 0.4)',
          dot: '#22c55e',
        }
      case 'ready':
        return {
          label: 'Rider On The Way',
          color: '#4ade80',
          bg: 'rgba(34, 197, 94, 0.18)',
          border: 'rgba(34, 197, 94, 0.4)',
          dot: '#22c55e',
        }
      case 'cooking':
        return {
          label: 'Kitchen Preparing',
          color: '#fb923c',
          bg: 'rgba(251, 146, 60, 0.18)',
          border: 'rgba(251, 146, 60, 0.4)',
          dot: '#f97316',
        }
      case 'confirmed':
      case 'advance_paid':
        return {
          label: 'Kitchen Accepted',
          color: '#38bdf8',
          bg: 'rgba(56, 189, 248, 0.18)',
          border: 'rgba(56, 189, 248, 0.4)',
          dot: '#38bdf8',
        }
      case 'pending':
      default:
        return {
          label: 'Awaiting Kitchen Approval',
          color: '#fbbf24',
          bg: 'rgba(245, 158, 11, 0.18)',
          border: 'rgba(245, 158, 11, 0.4)',
          dot: '#f59e0b',
        }
    }
  }, [order.status])

  return (
    <div
      style={{
        background: 'linear-gradient(145deg, rgba(24, 24, 27, 0.95), rgba(15, 15, 18, 0.98))',
        border: '1.5px solid rgba(245, 158, 11, 0.3)',
        borderRadius: '20px',
        padding: '1.25rem',
        margin: '1.25rem 0',
        boxShadow: '0 12px 36px rgba(0,0,0,0.55)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top Banner: Zomato-style ETA & Live Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: statusMeta.bg,
                color: statusMeta.color,
                padding: '4px 10px',
                borderRadius: '9999px',
                fontSize: '0.72rem',
                fontWeight: 900,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                border: `1px solid ${statusMeta.border}`,
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: statusMeta.dot,
                  animation: 'pulse 1.5s infinite',
                }}
              />
              {statusMeta.label}
            </span>

            <span
              style={{
                fontSize: '0.72rem',
                padding: '4px 8px',
                borderRadius: '6px',
                background: isWithinZone ? 'rgba(56, 189, 248, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: isWithinZone ? '#38bdf8' : '#f87171',
                fontWeight: 800,
                border: `1px solid ${isWithinZone ? 'rgba(56, 189, 248, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              }}
            >
              {isWithinZone ? `${distanceKm} km â€¢ Within 5 km Zone` : `${distanceKm} km â€¢ Outside 5 km`}
            </span>
          </div>

          <h3 style={{ margin: '0.45rem 0 0.15rem', fontSize: '1.25rem', color: '#fafaf9', fontWeight: 900 }}>
            {order.status === 'cancelled' ? (
              <span style={{ color: '#f87171' }}>Order Cancelled</span>
            ) : order.status === 'delivered' ? (
              <span style={{ color: '#22c55e' }}>Order Delivered â€” Enjoy Your Food</span>
            ) : isPending ? (
              <span style={{ color: '#fafaf9' }}>Order Placed Â· Awaiting Acceptance</span>
            ) : (
              <>Arriving in <span style={{ color: '#f59e0b' }}>~{etaMinutes} mins</span></>
            )}
          </h3>

          <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: order.status === 'cancelled' ? '#fca5a5' : isPending ? '#fbbf24' : '#a1a1aa', fontWeight: (isPending || order.status === 'cancelled') ? 700 : 500 }}>
            {order.status === 'cancelled'
              ? 'This order was cancelled. No food preparation or delivery is in progress.'
              : order.status === 'delivered'
              ? 'Successfully handed over at your doorstep'
              : isPending
              ? 'Staff is reviewing your items. 45-min delivery countdown starts once confirmed!'
              : elapsedMinutes > 0
              ? `${elapsedMinutes}m elapsed since confirmation Â· standard 45-min delivery promise`
              : 'Kitchen accepted order Â· standard 45-min delivery countdown started'}
          </p>
        </div>

        {/* Locate Me Button */}
        <button
          type="button"
          onClick={handleLocateCustomer}
          disabled={gpsLoading}
          style={{
            background: customerCoords ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            border: `1px solid ${customerCoords ? 'rgba(34, 197, 94, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
            color: customerCoords ? '#4ade80' : '#fbbf24',
            padding: '0.45rem 0.85rem',
            borderRadius: '10px',
            fontSize: '0.75rem',
            fontWeight: 800,
            cursor: gpsLoading ? 'wait' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            touchAction: 'manipulation',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/></svg>
          {gpsLoading ? 'Locating...' : customerCoords ? 'Live GPS Active' : 'Use My Live GPS'}
        </button>
      </div>

      {gpsError && (
        <div style={{ fontSize: '0.74rem', color: '#f87171', background: 'rgba(239, 68, 68, 0.1)', padding: '0.4rem 0.75rem', borderRadius: '8px', marginBottom: '0.75rem' }}>
          {gpsError}
        </div>
      )}

      {/* Interactive Live Radar & Route Visualizer */}
      <div
        style={{
          background: '#0d0d10',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '1.25rem',
          position: 'relative',
          overflow: 'hidden',
          minHeight: '140px',
        }}
      >
        {/* Three.js 3D Holographic Delivery Radar Sphere & Orbiting Rings */}
        <ThreeRadarCanvas status={order.status as any} riderProgress={riderProgress} distanceKm={distanceKm} />

        {/* Route Progress Track */}
        <div style={{ position: 'relative', zIndex: 2, padding: '0.5rem 0.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.72rem', color: '#a1a1aa', fontWeight: 700 }}>
              Shanti Kutir Hub (NH-116)
            </span>
            <span style={{ fontSize: '0.72rem', color: '#a1a1aa', fontWeight: 700 }}>
              Your Doorstep
            </span>
          </div>

          {/* Progress bar line */}
          <div
            style={{
              height: '8px',
              background: '#27272a',
              borderRadius: '9999px',
              position: 'relative',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.8)',
            }}
          >
            {/* Completed portion */}
            <div
              style={{
                height: '100%',
                width: `${riderProgress * 100}%`,
                background: 'linear-gradient(90deg, #f59e0b, #22c55e)',
                borderRadius: '9999px',
                transition: 'width 0.8s ease',
                boxShadow: '0 0 12px rgba(34, 197, 94, 0.6)',
              }}
            />

            {/* Start Pin: Restaurant */}
            <div
              style={{
                position: 'absolute',
                left: '0%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                border: '2px solid #18181b',
                boxShadow: '0 0 10px #f59e0b',
                overflow: 'hidden',
              }}
            >
              <img src="/sk-logo.png" alt="TFG Hub" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>

            {/* Moving Rider Icon */}
            <div
              style={{
                position: 'absolute',
                left: `${riderProgress * 100}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: '#18181b',
                border: '2px solid #22c55e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'left 0.8s ease',
                boxShadow: '0 0 16px rgba(34, 197, 94, 0.8)',
                cursor: 'pointer',
              }}
              title="Delivery Rider Live Position"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>
            </div>

            {/* Destination Pin: Customer */}
            <div
              style={{
                position: 'absolute',
                left: '100%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #18181b',
                boxShadow: '0 0 10px #38bdf8',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', fontSize: '0.75rem' }}>
            <span style={{ color: order.status === 'cancelled' ? '#f87171' : '#f59e0b', fontWeight: 800 }}>
              {order.status === 'cancelled'
                ? 'Delivery Inactive (Order Cancelled)'
                : order.status === 'delivered'
                ? 'Delivered at Doorstep'
                : order.status === 'ready'
                ? (riderProgress < 0.4 ? 'Bhabanipur Highway Outlet' : 'En Route on NH-116')
                : order.status === 'cooking'
                ? 'Kitchen Preparing Your Meal'
                : order.status === 'confirmed'
                ? 'Chef Accepted Â· Prepping Kitchen'
                : 'Awaiting Kitchen Acceptance'}
            </span>
            <span style={{ color: '#38bdf8', fontWeight: 800 }}>
              {order.address ? order.address.slice(0, 30) + '...' : 'Destination Point'}
            </span>
          </div>
        </div>
      </div>

      {/* Rider & Delivery Security Handoff Card */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '0.85rem',
          marginTop: '1rem',
        }}
      >
        {/* Delivery OTP or Cancellation Notice Card */}
        {order.status === 'cancelled' ? (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(24, 24, 27, 0.95))',
              border: '1.5px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '14px',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: '0.72rem', color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 900 }}>
                Order Cancelled
              </span>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.74rem', color: '#f4f4f5', fontWeight: 600 }}>
                {(order.advanceAmount ?? 0) > 0
                  ? `Refund of Rs.${order.advanceAmount} initiated to original payment source`
                  : 'Order voided - Zero payment required'}
              </p>
            </div>
            <div
              style={{
                fontSize: '0.8rem',
                fontWeight: 900,
                color: '#fca5a5',
                background: '#18181b',
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(239, 68, 68, 0.4)',
              }}
            >
              Cancelled
            </div>
          </div>
        ) : !isOrderOtpRequired(order) ? (
          <div
            style={{
              background: 'rgba(34, 197, 94, 0.08)',
              border: '1.5px solid rgba(34, 197, 94, 0.35)',
              borderRadius: '14px',
              padding: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: '0.72rem', color: '#86efac', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}>
                Payment: Cash on Delivery
              </span>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.74rem', color: '#f4f4f5', fontWeight: 700 }}>
                {Number(order.extraDeliveryCharge || 0) > 0
                  ? `Pay cash to rider upon arrival (â‚¹${order.total} food + â‚¹${order.extraDeliveryCharge} distance fee)`
                  : 'Pay cash to rider upon arrival (No OTP needed)'}
              </p>
            </div>
            <div
              style={{
                fontSize: '1.2rem',
                fontWeight: 900,
                color: '#4ade80',
                background: '#18181b',
                padding: '0.35rem 0.75rem',
                borderRadius: '10px',
                border: '1px solid rgba(34, 197, 94, 0.4)',
              }}
            >
              â‚¹{order.total + Number(order.extraDeliveryCharge || 0)}
            </div>
          </div>
        ) : order.status !== 'pending' ? (
          <div
            style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1.5px solid rgba(245, 158, 11, 0.35)',
              borderRadius: '14px',
              padding: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: '0.72rem', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}>
                Delivery Handover OTP
              </span>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.72rem', color: '#d6d3d1' }}>
                {Number(order.extraDeliveryCharge || 0) > 0
                  ? `Pay Rs.${order.extraDeliveryCharge} distance fee in cash to rider & share code`
                  : Math.max(0, order.total - (order.advanceAmount ?? 0)) > 0
                  ? `Pay balance Rs.${Math.max(0, order.total - (order.advanceAmount ?? 0))} & share code with rider`
                  : 'Share this 4-digit code with rider upon arrival'}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {Number(order.extraDeliveryCharge || 0) > 0 && (
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  color: '#fbbf24',
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  padding: '3px 7px',
                  borderRadius: '6px',
                  whiteSpace: 'nowrap',
                }}>
                  +â‚¹{order.extraDeliveryCharge} Cash
                </span>
              )}
              <div
                style={{
                  fontSize: '1.45rem',
                  fontWeight: 900,
                  color: '#f59e0b',
                  background: '#18181b',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(245, 158, 11, 0.5)',
                  letterSpacing: '0.15em',
                }}
              >
                {deliveryOtp}
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              background: 'rgba(245, 158, 11, 0.05)',
              border: '1.5px dashed rgba(245, 158, 11, 0.3)',
              borderRadius: '14px',
              padding: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: '0.72rem', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}>
                Delivery Handover OTP
              </span>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700 }}>
                Generates upon kitchen acceptance
              </p>
            </div>
            <div
              style={{
                fontSize: '1.2rem',
                fontWeight: 800,
                color: '#71717a',
                background: '#18181b',
                padding: '0.35rem 0.85rem',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                letterSpacing: '0.15em',
              }}
            >
              â€¢â€¢â€¢â€¢
            </div>
          </div>
        )}

        {/* Rider Contact & Google Maps Direct Link */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <a
            href="tel:+917001045147"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: '#27272a',
              border: '1px solid #3f3f46',
              borderRadius: '12px',
              color: '#fafaf9',
              padding: '0.65rem',
              textDecoration: 'none',
              fontWeight: 800,
              fontSize: '0.8rem',
              touchAction: 'manipulation',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            Call Kitchen / Rider
          </a>

          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #38bdf8, #0284c7)',
              borderRadius: '12px',
              color: '#0f172a',
              padding: '0.65rem',
              textDecoration: 'none',
              fontWeight: 900,
              fontSize: '0.8rem',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
              touchAction: 'manipulation',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
            Open Google Maps
          </a>
        </div>
      </div>
    </div>
  )
}

