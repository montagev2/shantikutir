/**
 * Shanti Kutir - Zero-Latency SWR Cache, Offline Queue & WebP Optimizer
 *
 * 1. SWR (Stale-While-Revalidate) Cache
 * 2. Offline Mutation Queue & Auto-Retry
 * 3. Dynamic Image CDN & WebP Compression
 * 4. Checkout Idempotency Guard
 */

import { safeGetJSON, safeSetJSON } from './storage'

// -- 1. Image CDN & WebP URL Optimizer -------------------------------------------
export function optimizeImageUrl(url?: string, width = 600, quality = 80): string {
  if (!url || typeof url !== 'string') return ''

  // Unsplash CDN WebP transformation
  if (url.includes('images.unsplash.com')) {
    const clean = url.split('?')[0]
    return `${clean}?w=${width}&auto=format&fit=crop&q=${quality}`
  }

  // Supabase Storage Image Transformation
  if (url.includes('supabase.co/storage/v1/object/public/')) {
    return `${url}?width=${width}&quality=${quality}&format=webp`
  }

  return url
}

// -- 2. SWR In-Memory & LocalStorage Cache ----------------------------------------
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

const memoryCache = new Map<string, CacheEntry<any>>()

export async function fetchWithSWR<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = 60 * 1000,
  onBackgroundUpdate?: (freshData: T) => void
): Promise<T> {
  const now = Date.now()

  let entry = memoryCache.get(key)
  if (!entry) {
    const stored = safeGetJSON<CacheEntry<T> | null>(`sk_swr_${key}`, null)
    if (stored && stored.data) {
      entry = stored
      memoryCache.set(key, stored)
    }
  }

  if (entry && entry.data) {
    const isStale = now - entry.timestamp > entry.ttl
    if (isStale) {
      void fetcher()
        .then((fresh) => {
          if (fresh) {
            const newEntry: CacheEntry<T> = { data: fresh, timestamp: Date.now(), ttl: ttlMs }
            memoryCache.set(key, newEntry)
            safeSetJSON(`sk_swr_${key}`, newEntry)
            onBackgroundUpdate?.(fresh)
          }
        })
        .catch(() => {})
    }
    return entry.data
  }

  const fresh = await fetcher()
  if (fresh) {
    const newEntry: CacheEntry<T> = { data: fresh, timestamp: now, ttl: ttlMs }
    memoryCache.set(key, newEntry)
    safeSetJSON(`sk_swr_${key}`, newEntry)
  }
  return fresh
}

export function invalidateSWRCache(key: string): void {
  memoryCache.delete(key)
  try {
    localStorage.removeItem(`sk_swr_${key}`)
  } catch {}
}

export function updateSWRCache<T>(key: string, data: T, ttlMs = 60 * 1000): void {
  const newEntry: CacheEntry<T> = { data, timestamp: Date.now(), ttl: ttlMs }
  memoryCache.set(key, newEntry)
  safeSetJSON(`sk_swr_${key}`, newEntry)
}

// -- 3. Offline Mutation Queue (Zero Kitchen Lag) ---------------------------------
export interface QueuedMutation {
  id: string
  action: 'update_order_status' | 'verify_utr' | 'place_order' | 'reply_ticket'
  payload: any
  createdAt: number
}

const QUEUE_KEY = 'sk_offline_mutation_queue'

export function enqueueOfflineMutation(action: QueuedMutation['action'], payload: any): void {
  const queue = safeGetJSON<QueuedMutation[]>(QUEUE_KEY, [])
  const item: QueuedMutation = {
    id: `mut_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    action,
    payload,
    createdAt: Date.now(),
  }
  safeSetJSON(QUEUE_KEY, [...queue, item])
}

export function getOfflineQueue(): QueuedMutation[] {
  return safeGetJSON<QueuedMutation[]>(QUEUE_KEY, [])
}

export function removeOfflineMutation(id: string): void {
  const queue = safeGetJSON<QueuedMutation[]>(QUEUE_KEY, [])
  safeSetJSON(QUEUE_KEY, queue.filter((m) => m.id !== id))
}

// -- 4. Checkout Idempotency Key Guard (Zero Duplicate Orders) --------------------
const idempotencyStore = new Map<string, number>()

export function checkCheckoutIdempotency(key: string, cooldownMs = 15000): boolean {
  const now = Date.now()
  const last = idempotencyStore.get(key)
  if (last && now - last < cooldownMs) {
    return false
  }
  idempotencyStore.set(key, now)
  return true
}

export function generateCartSignature(phone: string, total: number, itemsCount: number): string {
  return `idem_${phone}_${total}_${itemsCount}`
}
