/**
 * Shanti Kutir - Native Web Push & Multi-Profile Audio Chimes
 * Supports background push notifications and distinct audio sound signatures.
 */

export type ChimeType = 'dine_in' | 'delivery' | 'ready' | 'alert'

/**
 * Play synthesizer audio chimes (zero external MP3 dependencies)
 */
export function playChime(type: ChimeType = 'dine_in') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()

    if (type === 'dine_in') {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1) // A5
      gain.gain.setValueAtTime(0.7, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.9)
    } else if (type === 'delivery') {
      ;[0, 0.2, 0.4].forEach((delay, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(idx === 2 ? 1046 : 880, ctx.currentTime + delay)
        gain.gain.setValueAtTime(0.6, ctx.currentTime + delay)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.18)
        osc.start(ctx.currentTime + delay)
        osc.stop(ctx.currentTime + delay + 0.18)
      })
    } else if (type === 'ready') {
      ;[0, 0.15].forEach((delay, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(idx === 0 ? 659.25 : 987.77, ctx.currentTime + delay)
        gain.gain.setValueAtTime(0.6, ctx.currentTime + delay)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.4)
        osc.start(ctx.currentTime + delay)
        osc.stop(ctx.currentTime + delay + 0.4)
      })
    }
  } catch {}

  try {
    navigator.vibrate?.([200, 100, 200])
  } catch {}
}

/**
 * Request HTML5 Notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission !== 'denied') {
    const perm = await Notification.requestPermission()
    return perm === 'granted'
  }
  return false
}

/**
 * Show a native system notification (works in background tab)
 */
export function sendSystemNotification(title: string, body: string, icon = '/sk-logo.png', tag = 'sk-order') {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  try {
    new Notification(title, {
      body,
      icon,
      badge: icon,
      tag,
    })
  } catch {}
}

/**
 * Speaks incoming orders aloud for kitchen chefs using Web SpeechSynthesis API.
 */
export function announceOrderVoice(order: {
  orderType: string
  tableNo?: string
  userName?: string
  items: Array<{ name: string; qty: number }>
}) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  try {
    window.speechSynthesis.cancel()

    const loc =
      order.orderType === 'dine_in'
        ? `Table ${order.tableNo || 'Hall'}`
        : order.orderType === 'takeaway'
          ? 'Highway Takeaway Counter'
          : 'Home Delivery'

    const itemsSummary = order.items.map((i) => `${i.qty} ${i.name}`).join(', ')
    const spokenText = `New Order! ${loc}! ${itemsSummary}`

    const utterance = new SpeechSynthesisUtterance(spokenText)
    utterance.rate = 0.95
    utterance.pitch = 1.05
    utterance.volume = 1.0

    window.speechSynthesis.speak(utterance)
  } catch {}
}
