import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { useSubscribeToPush } from '../api-client/push'

const DISMISSED_KEY = 'ic-push-prompt-dismissed'

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
  // Native permission state isn't readable synchronously like Notification.permission
  // is on the web, so it's fetched once on mount instead.
  const [nativeUndecided, setNativeUndecided] = useState(false)
  const { mutate, isPending } = useSubscribeToPush()

  useEffect(() => {
    if (!isNative) return
    PushNotifications.checkPermissions().then(status => setNativeUndecided(status.receive === 'prompt'))
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

  // Web: push permission can only be requested from inside a standalone,
  // installed PWA on iOS — a regular Safari tab is never offered it — so
  // this banner only appears once InstallPrompt's flow has been completed.
  // Native: no such install-state gate applies; only the OS permission
  // itself (still undecided) matters.
  if (dismissed) return null
  if (isNative) {
    if (!nativeUndecided) return null
  } else if (!isStandalone() || !pushSupported() || Notification.permission !== 'default') {
    return null
  }

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
