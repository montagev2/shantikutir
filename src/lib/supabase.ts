import { createClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_URL = 'https://penzktygcpvymfsyslew.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_3olaTzF0zwMpxoIqiQ1D8A_U-SMOqVj'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || DEFAULT_SUPABASE_URL
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || DEFAULT_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {
      'x-sk-client': 'web-v2.0',
    },
  },
})

// Connection pool warmup ping on startup (resilience against free-tier cold sleep)
if (typeof window !== 'undefined' && supabaseUrl && !supabaseUrl.includes('placeholder')) {
  let lastPingAt = 0
  const PING_INTERVAL_MS = 20 * 60 * 1000

  const ping = () => {
    const now = Date.now()
    if (now - lastPingAt < PING_INTERVAL_MS) return
    lastPingAt = now
    void (async () => {
      try {
        await supabase.from('products').select('id').limit(1)
      } catch {
        // Silent ignore on ping
      }
    })()
  }

  ping()
  window.addEventListener('focus', ping)
}
