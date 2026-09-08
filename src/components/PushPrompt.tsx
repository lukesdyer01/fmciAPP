import { useState, useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { useSubscribeToPush } from '../api-client/push'

const DISMISSED_KEY = 'ic-push-prompt-dismissed'

// Long enough for the launch intro to finish and hand off to the app, so iOS
// doesn't put its permission alert on top of the video. Tied to the length of
// intro.mp4 (5s) plus the cross-fade out of it.
const NATIVE_PROMPT_DELAY_MS = 6000

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
}

function pushSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
}

export default function PushPrompt() {
  const isNative = Capacitor.isNativePlatform()
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === 'true')
  const [error, setError] = useState('')
  const { mutate, isPending } = useSubscribeToPush()
  // StrictMode runs effects twice in development; without this the permission
  // request and registration would both fire twice on every launch.
  const nativeAsked = useRef(false)

  // Native asks for itself. iOS never raises the permission alert on its own —
  // it appears only when the app calls for it — so rather than putting that
  // behind a banner the user has to find and tap, request it on first launch
  // and let the system dialog be the whole interaction.
  //
  // "granted" re-registers rather than returning early: APNs device tokens can
  // rotate, and the backend keys off the token, so refreshing it each launch is
  // what keeps an already-permitted install reachable. "denied" does nothing at
  // all, since iOS only ever shows that alert once and the decision now lives in
  // Settings.
  useEffect(() => {
    if (!isNative || nativeAsked.current) return
    nativeAsked.current = true
    const timer = setTimeout(async () => {
      const status = await PushNotifications.checkPermissions()
      if (status.receive !== 'prompt' && status.receive !== 'granted') return
      mutate(undefined, { onError: () => {} })
    }, NATIVE_PROMPT_DELAY_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNative])

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, 'true')
    setDismissed(true)
  }

  async function handleEnable() {
    setError('')
    mutate(undefined, {
      onSuccess: dismiss,
      onError: (e: any) => setError(e.message ?? 'Could not enable notifications.'),
    })
  }

  // The banner is the web story only. Push permission can only be requested
  // from inside a standalone, installed PWA on iOS — a regular Safari tab is
  // never offered it — so it appears only once InstallPrompt's flow has been
  // completed. The native build has already asked above and shows nothing.
  if (isNative) return null
  if (dismissed) return null
  if (!isStandalone() || !pushSupported() || Notification.permission !== 'default') return null

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 250,
      backgroundColor: 'var(--color-card)', borderTop: '1px solid var(--color-border)',
      borderRadius: '14px 14px 0 0', boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
      padding: '14px 16px', paddingBottom: 'calc(14px + var(--safe-bottom))', display: 'flex', alignItems: 'center', gap: '12px',
    }}>
      <div style={{
        width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
        backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
      }}>🔔</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-1)' }}>Enable Notifications</div>
        <div style={{ fontSize: '12px', color: error ? 'var(--color-red)' : 'var(--color-text-2)' }}>
          {error || "Get notified when someone sends you a message."}
        </div>
      </div>
      <button onClick={handleEnable} disabled={isPending} style={{
        flexShrink: 0, padding: '9px 18px', borderRadius: '20px', border: 'none',
        backgroundColor: 'var(--color-navy)', color: '#fff', fontSize: '13px', fontWeight: 700,
        cursor: isPending ? 'default' : 'pointer', fontFamily: 'var(--font-sans)', opacity: isPending ? 0.6 : 1,
      }}>{isPending ? 'Enabling…' : 'Enable'}</button>
      <button onClick={dismiss} style={{
        background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0,
        color: 'var(--color-text-3)', fontSize: '18px', lineHeight: 1, padding: '4px',
      }}>✕</button>
    </div>
  )
}
