import React, { createContext, useContext, useEffect, useReducer, useState, useCallback } from 'react'
import type { Product, CartItem, Coupon, StoreState, Lang, Order, Address, Portion } from '../types'
import { supabase } from '../lib/supabase'
import { safeGetJSON, safeSetJSON, runCacheMigration } from '../lib/storage'
import { PORTION_LABELS, getOrderDeliveryOtp } from '../lib/business'

// Run one-time cache migration on startup
runCacheMigration()

type Action =
  | { type: 'SET_PRODUCTS'; products: Product[] }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'ADD_TO_CART'; item: CartItem }
  | { type: 'REMOVE_FROM_CART'; productId: string; size: string }
  | { type: 'UPDATE_QTY'; productId: string; size: string; qty: number }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_DINING_MODE'; mode: StoreState['diningMode'] }
  | { type: 'SET_TABLE'; table: string }
  | { type: 'SET_DELIVERY_ADDRESS'; address: string; lat: number | null; lng: number | null }
  | { type: 'SET_COUPON'; coupon: Coupon | null }
  | { type: 'RESTORE_CART'; cart: CartItem[] }

const initialCart = safeGetJSON<CartItem[]>('sk_cart', [])

const initialState: StoreState = {
  products: safeGetJSON<Product[]>('sk_products_cache', []),
  cart: initialCart,
  diningMode: safeGetJSON<StoreState['diningMode']>('sk_dining_mode', 'dine_in'),
  tableNumber: '',
  deliveryAddress: '',
  deliveryLat: null,
  deliveryLng: null,
  appliedCoupon: null,
  loadingProducts: true,
}

function normalizeSize(s: string): 'a' | 'b' | 'c' {
  const lower = s.toLowerCase()
  if (lower === 'b') return 'b'
  if (lower === 'c') return 'c'
  return 'a'
}

function reducer(state: StoreState, action: Action): StoreState {
  let newState: StoreState

  switch (action.type) {
    case 'SET_PRODUCTS':
      newState = { ...state, products: action.products, loadingProducts: false }
      break
    case 'SET_LOADING':
      newState = { ...state, loadingProducts: action.loading }
      break
    case 'RESTORE_CART':
      newState = { ...state, cart: action.cart }
      break
    case 'ADD_TO_CART': {
      const actSize = normalizeSize(String(action.item.size || action.item.portion || 'a'))
      const existing = state.cart.find(
        (c) =>
          (c.product?.id || c.productId) === (action.item.product?.id || action.item.productId) &&
          normalizeSize(String(c.size || c.portion || 'a')) === actSize,
      )
      const qtyToAdd = action.item.quantity || action.item.qty || 1
      if (existing) {
        newState = {
          ...state,
          cart: state.cart.map((c) =>
            (c.product?.id || c.productId) === (action.item.product?.id || action.item.productId) &&
            normalizeSize(String(c.size || c.portion || 'a')) === actSize
              ? {
                  ...c,
                  quantity: (c.quantity || c.qty || 0) + qtyToAdd,
                  qty: (c.quantity || c.qty || 0) + qtyToAdd,
                }
              : c,
          ),
        }
      } else {
        const normalizedItem: CartItem = {
          ...action.item,
          size: actSize,
          quantity: qtyToAdd,
          qty: qtyToAdd,
          productId: action.item.product?.id || action.item.productId,
          portion: actSize.toUpperCase() as Portion,
        }
        newState = { ...state, cart: [...state.cart, normalizedItem] }
      }
      break
    }
    case 'REMOVE_FROM_CART': {
      const targetSize = normalizeSize(action.size)
      newState = {
        ...state,
        cart: state.cart.filter(
          (c) =>
            !(
              (c.product?.id || c.productId) === action.productId &&
              normalizeSize(String(c.size || c.portion || 'a')) === targetSize
            ),
        ),
      }
      break
    }
    case 'UPDATE_QTY': {
      const targetSize = normalizeSize(action.size)
      newState = {
        ...state,
        cart: state.cart
          .map((c) =>
            (c.product?.id || c.productId) === action.productId &&
            normalizeSize(String(c.size || c.portion || 'a')) === targetSize
              ? { ...c, quantity: action.qty, qty: action.qty }
              : c,
          )
          .filter((c) => (c.quantity || c.qty || 0) > 0),
      }
      break
    }
    case 'CLEAR_CART':
      newState = { ...state, cart: [], appliedCoupon: null }
      break
    case 'SET_DINING_MODE':
      safeSetJSON('sk_dining_mode', action.mode)
      newState = { ...state, diningMode: action.mode }
      break
    case 'SET_TABLE':
      newState = { ...state, tableNumber: action.table }
      break
    case 'SET_DELIVERY_ADDRESS':
      newState = {
        ...state,
        deliveryAddress: action.address,
        deliveryLat: action.lat,
        deliveryLng: action.lng,
      }
      break
    case 'SET_COUPON':
      newState = { ...state, appliedCoupon: action.coupon }
      break
    default:
      return state
  }

  // Persist cart to localStorage
  if (newState.cart !== state.cart) {
    safeSetJSON('sk_cart', newState.cart)
  }
  return newState
}

export interface StoreContextValue extends StoreState {
  menu: Product[]
  dispatch: React.Dispatch<Action>
  cartSubtotal: number
  cartCount: number
  cartDiscount: number
  cartTotal: number
  lang: Lang
  setLang: (lang: Lang) => void
  setDiningMode: (mode: StoreState['diningMode']) => void
  addToCart: (productOrId: Product | string, sizeOrPortion?: string, qty?: number) => void
  updateCartQty: (productId: string, sizeOrPortion: string, qty: number) => void
  removeFromCart: (productId: string, sizeOrPortion: string) => void
  clearCart: () => void
  reorder: (order: Order) => void
  addresses: Address[]
  saveAddress: (address: Address) => void
  deleteAddress: (id: string | number) => void
  updateOrderStatus: (orderId: string, status: any) => Promise<boolean>
  placeOrder: (orderData: Partial<Order>) => Promise<Order>
  validateCoupon: (code: string, total: number, phone?: string, silent?: boolean) => Promise<{ valid: boolean; discount?: number; message?: string }>
  priceFor: (item: Product, portion: string) => number
  orders: Order[]
  refreshOrders: () => Promise<void>
  cancelOrder: (orderId: string, _reason?: string) => Promise<boolean>
  rateOrder: (orderId: string, rating: number, _review?: string, _tags?: string[]) => Promise<boolean>
}

const StoreContext = createContext<StoreContextValue | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [lang, setLangState] = useState<Lang>(() => safeGetJSON<Lang>('sk_lang', 'en'))
  const [orders, setOrders] = useState<Order[]>([])
  const [addresses, setAddresses] = useState<Address[]>(() => safeGetJSON<Address[]>('sk_addresses', []))

  const setLang = useCallback((l: Lang) => {
    safeSetJSON('sk_lang', l)
    setLangState(l)
  }, [])

  // Fetch products from Supabase
  const loadProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('archived', false)
        .order('sort_order')

      if (data && !error) {
        const enriched = (data as Product[]).map((p) => ({
          ...p,
          bnName: p.name_bn || p.name,
          pA: p.price_a,
          pB: p.price_b ?? p.price_a,
          pC: p.price_c ?? p.price_a,
          imageUrl: p.image_url || undefined,
        }))
        dispatch({ type: 'SET_PRODUCTS', products: enriched })
        safeSetJSON('sk_products_cache', enriched)
      } else {
        dispatch({ type: 'SET_LOADING', loading: false })
      }
    } catch {
      dispatch({ type: 'SET_LOADING', loading: false })
    }
  }, [])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  // Refresh orders from Supabase or localStorage guest orders
  const refreshOrders = useCallback(async () => {
    try {
      const guestIds = safeGetJSON<string[]>('sk_guest_orders', [])
      if (guestIds.length > 0) {
        const { data } = await supabase
          .from('orders')
          .select('*, items:order_items(*)')
          .in('id', guestIds.slice(0, 20))
          .order('created_at', { ascending: false })

        if (data) {
          setOrders(data as Order[])
        }
      }
    } catch {}
  }, [])

  useEffect(() => {
    refreshOrders()
  }, [refreshOrders])

  // Cart calculations
  const cartSubtotal = state.cart.reduce((sum, item) => {
    const p = item.product || state.products.find((prod) => prod.id === item.productId)
    if (!p) return sum
    const normSize = normalizeSize(String(item.size || item.portion || 'a'))
    const price =
      normSize === 'a'
        ? p.price_a
        : normSize === 'b'
          ? (p.price_b ?? p.price_a)
          : (p.price_c ?? p.price_a)
    const quantity = item.quantity || item.qty || 1
    return sum + price * quantity
  }, 0)

  let cartDiscount = 0
  if (state.appliedCoupon) {
    const c = state.appliedCoupon
    if (c.discount_type === 'flat') {
      cartDiscount = c.discount_value
    } else {
      cartDiscount = Math.round((cartSubtotal * c.discount_value) / 100)
    }
  }

  const cartTotal = Math.max(0, cartSubtotal - cartDiscount)
  const cartCount = state.cart.reduce((n, item) => n + (item.quantity || item.qty || 1), 0)

  const setDiningMode = useCallback((mode: StoreState['diningMode']) => {
    dispatch({ type: 'SET_DINING_MODE', mode })
  }, [])

  const addToCart = useCallback(
    (productOrId: Product | string, sizeOrPortion: string = 'a', qty = 1) => {
      let product: Product | undefined
      if (typeof productOrId === 'string') {
        product = state.products.find((p) => p.id === productOrId)
      } else {
        product = productOrId
      }
      if (!product) return

      const normSize = normalizeSize(sizeOrPortion)
      dispatch({
        type: 'ADD_TO_CART',
        item: {
          product,
          productId: product.id,
          size: normSize,
          portion: normSize.toUpperCase() as Portion,
          quantity: qty,
          qty,
        },
      })
    },
    [state.products],
  )

  const updateCartQty = useCallback((productId: string, sizeOrPortion: string, qty: number) => {
    dispatch({ type: 'UPDATE_QTY', productId, size: normalizeSize(sizeOrPortion), qty })
  }, [])

  const removeFromCart = useCallback((productId: string, sizeOrPortion: string) => {
    dispatch({ type: 'REMOVE_FROM_CART', productId, size: normalizeSize(sizeOrPortion) })
  }, [])

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR_CART' })
  }, [])

  const reorder = useCallback(
    (order: Order) => {
      if (!order || !order.items || order.items.length === 0) return
      clearCart()
      for (const it of order.items) {
        const prod = state.products.find((p) => p.id === (it.product_id || (it as any).productId))
        if (prod) {
          const normSize = normalizeSize(it.size_label || String((it as any).portion) || 'a')
          dispatch({
            type: 'ADD_TO_CART',
            item: {
              product: prod,
              productId: prod.id,
              size: normSize,
              portion: normSize.toUpperCase() as Portion,
              quantity: it.quantity || (it as any).qty || 1,
              qty: it.quantity || (it as any).qty || 1,
            },
          })
        }
      }
    },
    [clearCart, state.products],
  )

  const saveAddress = useCallback((addr: Address) => {
    setAddresses((prev) => {
      const updated = [addr, ...prev.filter((a) => a.id !== addr.id)]
      safeSetJSON('sk_addresses', updated)
      return updated
    })
  }, [])

  const deleteAddress = useCallback((id: string | number) => {
    setAddresses((prev) => {
      const updated = prev.filter((a) => String(a.id) !== String(id))
      safeSetJSON('sk_addresses', updated)
      return updated
    })
  }, [])

  const updateOrderStatus = useCallback(async (orderId: string, status: any): Promise<boolean> => {
    try {
      const { updateOrderStatusSecure } = await import('../lib/api')
      await updateOrderStatusSecure(orderId, status)
      await refreshOrders()
      return true
    } catch {
      return false
    }
  }, [refreshOrders])

  const priceFor = useCallback((item: Product, portion: string): number => {
    const p = portion.toLowerCase()
    if (p === 'a') return item.price_a
    if (p === 'b') return item.price_b ?? item.price_a
    if (p === 'c') return item.price_c ?? item.price_a
    return item.price_a
  }, [])

  const placeOrder = useCallback(async (orderData: Partial<Order>): Promise<Order> => {
    const { submitOrder } = await import('../lib/api')
    const subtotal = cartSubtotal
    const deliveryFee = orderData.orderType === 'delivery' ? (orderData.deliveryFee ?? 0) : 0
    const discount = orderData.discountAmount || 0
    const total = Math.max(0, subtotal + deliveryFee - discount)

    const orderItems = state.cart.map((c) => {
      const prodId = c.productId || c.product?.id || ''
      const p = state.products.find((m) => m.id === prodId) || c.product
      const portionStr = (c.portion || c.size || 'b').toUpperCase()
      const portionKey = (['A', 'B', 'C'].includes(portionStr) ? portionStr : 'B') as Portion
      const unitPrice = p ? priceFor(p, portionKey) : 0
      const qty = c.qty || c.quantity || 1
      return {
        product_id: prodId,
        product_name: p ? p.name : 'Food Item',
        size_label: PORTION_LABELS[portionKey.toUpperCase() as 'A' | 'B' | 'C']?.en || portionKey,
        price: unitPrice,
        quantity: qty,
      }
    })

    const orderId = await submitOrder({
      p_customer_id: orderData.userId || null,
      p_customer_name: orderData.userName || 'Guest Customer',
      p_customer_phone: orderData.phone || '',
      p_dining_mode: orderData.orderType || 'dine_in',
      p_table_number: orderData.tableNo || null,
      p_delivery_address: orderData.address || null,
      p_delivery_lat: (orderData as any).geoLat || null,
      p_delivery_lng: (orderData as any).geoLng || null,
      p_items: orderItems,
      p_subtotal: subtotal,
      p_discount_amount: discount,
      p_total: total,
      p_payment_method: (orderData as any).paymentMode === 'cash' ? 'cash' : 'upi',
      p_coupon_code: (orderData as any).couponCode || null,
    })

    const newOrder: Order = {
      id: orderId,
      customer_id: orderData.userId || null,
      customer_name: orderData.userName || 'Guest Customer',
      customer_phone: orderData.phone || '',
      dining_mode: (orderData.orderType === 'delivery' || orderData.orderType === 'takeaway') ? orderData.orderType : 'dine_in',
      table_number: orderData.tableNo || null,
      delivery_address: orderData.address || null,
      delivery_lat: (orderData as any).geoLat || null,
      delivery_lng: (orderData as any).geoLng || null,
      status: 'pending',
      subtotal,
      discount_amount: discount,
      total,
      payment_method: (orderData as any).paymentMode === 'cash' ? 'cash' : 'upi',
      utr_number: orderData.utr || null,
      utr_verified: true,
      otp_code: getOrderDeliveryOtp({ id: orderId, phone: orderData.phone }),
      otp_used: false,
      rating: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      userId: orderData.userId,
      userName: orderData.userName || 'Guest Customer',
      phone: orderData.phone || '',
      orderType: orderData.orderType || 'dine_in',
      tableNo: orderData.tableNo,
      address: orderData.address,
      items: state.cart.map((c) => {
        const prodId = c.productId || c.product?.id || ''
        const p = state.products.find((m) => m.id === prodId) || c.product
        const portionStr = (c.portion || c.size || 'b').toUpperCase()
        const portionKey = (['A', 'B', 'C'].includes(portionStr) ? portionStr : 'B') as Portion
        const unitPrice = p ? priceFor(p, portionKey) : 0
        const qty = c.qty || c.quantity || 1
        return {
          id: `${orderId}-${prodId}`,
          order_id: orderId,
          product_id: prodId,
          product_name: p ? p.name : 'Food Item',
          size_label: PORTION_LABELS[portionKey.toUpperCase() as 'A' | 'B' | 'C']?.en || portionKey,
          price: unitPrice,
          quantity: qty,
          name: p ? p.name : 'Food Item',
          bnName: p ? (p.bnName || p.name_bn || '') : '',
          portion: portionKey,
          qty,
          unitPrice,
          emoji: '',
        }
      }),
      deliveryFee,
      discountAmount: discount,
      advanceAmount: orderData.advanceAmount ?? total,
      utr: orderData.utr || '',
      deliveryOtp: getOrderDeliveryOtp({ id: orderId, phone: orderData.phone }),
    }

    setOrders((prev) => [newOrder, ...prev])
    clearCart()
    return newOrder
  }, [state.cart, state.products, cartSubtotal, priceFor, clearCart])

  const validateCoupon = useCallback(async (code: string, total: number, _phone?: string, _silent = false) => {
    try {
      const { getActiveCoupons } = await import('../lib/api')
      const coupons = await getActiveCoupons(null)
      const found = (coupons || []).find((c: any) => c.code.toUpperCase() === code.toUpperCase().trim() && c.is_active)
      if (!found) return { valid: false, message: 'Invalid or expired coupon' }
      if (found.min_order_amount && total < found.min_order_amount) {
        return { valid: false, message: `Minimum order of Rs.${found.min_order_amount} required` }
      }
      let discount = 0
      if (found.discount_percent) {
        discount = Math.round((total * found.discount_percent) / 100)
        if (found.max_discount && discount > found.max_discount) discount = found.max_discount
      } else if (found.discount_amount) {
        discount = found.discount_amount
      }
      return { valid: true, discount, message: `Coupon applied: Rs.${discount} OFF!` }
    } catch {
      return { valid: false, message: 'Could not validate coupon' }
    }
  }, [])

  
  async function cancelOrder(orderId: string, _reason?: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId)
      if (!error) {
        await refreshOrders()
        return true
      }
      return false
    } catch {
      return false
    }
  }

  async function rateOrder(orderId: string, rating: number, _review?: string, _tags?: string[]): Promise<boolean> {
    try {
      const { error } = await supabase.from('orders').update({ rating }).eq('id', orderId)
      if (!error) {
        await refreshOrders()
        return true
      }
      return false
    } catch {
      return false
    }
  }

  return (
    <StoreContext.Provider
      value={{
        ...state,
        menu: state.products,
        dispatch,
        cartSubtotal,
        cartCount,
        cartDiscount,
        cartTotal,
        lang,
        setLang,
        setDiningMode,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        reorder,
        addresses,
        saveAddress,
        deleteAddress,
        updateOrderStatus,
        placeOrder,
        validateCoupon,
        priceFor,
        orders,
        refreshOrders,
    cancelOrder,
    rateOrder,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}
