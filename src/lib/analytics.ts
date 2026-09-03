import { api } from '../api-client/server'

const SESSION_KEY = 'ic-analytics-session-id'

export function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(SESSION_KEY, id)
  }
  return id
}

// Plain regex on navigator.userAgent, same convention as the iOS detection
// in InstallPrompt.tsx — no UA-parsing library.
function getDeviceInfo() {
  const ua = navigator.userAgent

  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop'
  if (/ipad|tablet(?!.*mobile)/i.test(ua)) deviceType = 'tablet'
  else if (/mobi|iphone|ipod|android.*mobile/i.test(ua)) deviceType = 'mobile'

  let os = 'Other'
  if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS'
  else if (/android/i.test(ua)) os = 'Android'
  else if (/windows/i.test(ua)) os = 'Windows'
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS'
  else if (/linux/i.test(ua)) os = 'Linux'

  let browser = 'Other'
  if (/edg\//i.test(ua)) browser = 'Edge'
  else if (/samsungbrowser/i.test(ua)) browser = 'Samsung Internet'
  else if (/crios|chrome/i.test(ua)) browser = 'Chrome'
  else if (/fxios|firefox/i.test(ua)) browser = 'Firefox'
  else if (/safari/i.test(ua)) browser = 'Safari'

  return { deviceType, os, browser }
}

let sessionStarted = false

// Fire-and-forget, same pattern as other non-blocking calls in this app
// (e.g. the fmci-bootstrap call in App.tsx) — analytics must never affect
// the user-facing experience if the network call fails.
export function trackSessionStart() {
  if (sessionStarted) return
  sessionStarted = true
  api('/analytics/session', {
    method: 'POST',
    body: JSON.stringify({ sessionId: getSessionId(), ...getDeviceInfo() }),
  }).catch(() => {})
}

export function trackPageView(view: string) {
  api('/analytics/pageview', {
    method: 'POST',
    body: JSON.stringify({ sessionId: getSessionId(), view }),
  }).catch(() => {})
}

export function trackHeartbeat() {
  return api('/analytics/heartbeat', {
    method: 'POST',
    body: JSON.stringify({ sessionId: getSessionId() }),
  }).catch(() => {})
}
