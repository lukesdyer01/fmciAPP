import { PushNotifications } from '@capacitor/push-notifications'
import { readMessageNotificationUrl } from './lib/messageNotification'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import App from './App'
import { ThemeProvider } from './providers/ThemeProvider'
import './index.css'

// Register before React/auth mounts so cold-start taps are retained in the URL.
if (Capacitor.isNativePlatform()) {
  PushNotifications.addListener('pushNotificationActionPerformed', action => {
    const url = action.notification.data?.url
    if (typeof url !== 'string' || !readMessageNotificationUrl(url, window.location.href)) return
    const destination = new URL(url, window.location.href)
    window.history.replaceState(null, '', destination.pathname + destination.search)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }).catch(() => {})
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)

// Enables installability + Web Push (iOS 16.4+/Android for an installed
// home-screen app). Registered here, once, independent of React/auth state.
// Skipped inside the native Capacitor shell — there's no "install" to enable
// and push there goes through @capacitor/push-notifications instead.
if ('serviceWorker' in navigator && !Capacitor.isNativePlatform()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
