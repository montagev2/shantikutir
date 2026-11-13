import React, { createContext, useContext, useEffect, useReducer } from 'react'
import type { Product, CartItem, Coupon, StoreState } from '../types'
import { supabase } from '../lib/supabase'

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

const initialState: StoreState = {
  products: [],
  cart: [],
  diningMode: 'dine_in',
  tableNumber: '',
  deliveryAddress: '',
  deliveryLat: null,
  deliveryLng: null,
  appliedCoupon: null,
  loadingProducts: true,
}

function reducer(state: StoreState, action: Action): StoreState {
  switch (action.type) {
    case 'SET_PRODUCTS':
      return { ...state, products: action.products, loadingProducts: false }
    case 'SET_LOADING':
      return { ...state, loadingProducts: action.loading }
    case 'ADD_TO_CART': {
      const existing = state.cart.find(
        c => c.product.id === action.item.product.id && c.size === action.item.size,
      )
      if (existing) {
        return {
          ...state,
          cart: state.cart.map(c =>
            c.product.id === action.item.product.id && c.size === action.item.size
              ? { ...c, quantity: c.quantity + action.item.quantity }
              : c,
          ),
        }
      }
      return { ...state, cart: [...state.cart, action.item] }
    }
    case 'REMOVE_FROM_CART':
      return {
        ...state,
        cart: state.cart.filter(
          c => !(c.product.id === action.productId && c.size === action.size),
        ),
      }
    case 'UPDATE_QTY':
      return {
        ...state,
        cart: state.cart.map(c =>
          c.product.id === action.productId && c.size === action.size
            ? { ...c, quantity: action.qty }
            : c,
        ).filter(c => c.quantity > 0),
      }
    case 'CLEAR_CART':
      return { ...state, cart: [], appliedCoupon: null }
    case 'SET_DINING_MODE':
      return { ...state, diningMode: action.mode }
    case 'SET_TABLE':
      return { ...state, tableNumber: action.table }
    case 'SET_DELIVERY_ADDRESS':
      return {
        ...state,
        deliveryAddress: action.address,
        deliveryLat: action.lat,
        deliveryLng: action.lng,
      }
    case 'SET_COUPON':
      return { ...state, appliedCoupon: action.coupon }
    default:
      return state
  }
}

interface StoreContextValue extends StoreState {
  dispatch: React.Dispatch<Action>
  cartSubtotal: number
  cartCount: number
  cartDiscount: number
  cartTotal: number
}

const StoreContext = createContext<StoreContextValue | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    supabase
      .from('products')
      .select('*')
      .eq('archived', false)
      .order('sort_order')
      .then(({ data }) => {
        if (data) dispatch({ type: 'SET_PRODUCTS', products: data as Product[] })
        else dispatch({ type: 'SET_LOADING', loading: false })
      })
  }, [])

  const cartSubtotal = state.cart.reduce((sum, item) => {
    const price =
      item.size === 'a'
        ? item.product.price_a
        : item.size === 'b'
          ? (item.product.price_b ?? item.product.price_a)
          : (item.product.price_c ?? item.product.price_a)
    return sum + price * item.quantity
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
  const cartCount = state.cart.reduce((n, item) => n + item.quantity, 0)

  return (
    <StoreContext.Provider
      value={{ ...state, dispatch, cartSubtotal, cartCount, cartDiscount, cartTotal }}
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
