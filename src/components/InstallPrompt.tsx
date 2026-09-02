import { useEffect, useState } from 'react'

const DISMISSED_KEY = 'ic-install-prompt-dismissed'

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
}

const ua = navigator.userAgent
const isIOS = /iphone|ipad|ipod/i.test(ua) && !(window as any).MSStream
// Chrome/Firefox/Edge/Opera on iOS are all WebKit-in-a-wrapper and inject
// their own UA token even though only Safari itself supports installing to
// the home screen — this excludes them from being treated as "iOS Safari".
const isIOSSafari = isIOS && /safari/i.test(ua) && !/crios|fxios|edgios|opios/i.test(ua)
const isIOSOtherBrowser = isIOS && !isIOSSafari

function IconBadge() {
  return <img src="/apple-touch-icon.png" alt="" style={{ width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0 }} />
}

function BannerShell({ onDismiss, children }: { onDismiss: () => void; children: React.ReactNode }) {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 250,
      backgroundColor: 'var(--color-card)', borderTop: '1px solid var(--color-border)',
      borderRadius: '14px 14px 0 0', boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
      padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px',
    }}>
      {children}
      <button onClick={onDismiss} style={{
        background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0,
        color: 'var(--color-text-3)', fontSize: '18px', lineHeight: 1, padding: '4px',
      }}>✕</button>
    </div>
  )
}

export default function InstallPrompt() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === 'true')
  const [installed, setInstalled] = useState(() => isStandalone())
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    function handler(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  useEffect(() => {
    function onInstalled() { setInstalled(true) }
    window.addEventListener('appinstalled', onInstalled)
    return () => window.removeEventListener('appinstalled', onInstalled)
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, 'true')
    setDismissed(true)
  }

  async function handleAndroidInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  // Desktop already has its own install affordance in the browser's own UI
  // (address-bar icon) — this banner is specifically for mobile users.
  if (installed || dismissed || window.innerWidth > 768) return null

  // Android/Chrome/Edge — the browser tells us it's installable via this
  // event; only show once that fires (no generic "maybe installable" guess).
  if (deferredPrompt) {
    return (
      <BannerShell onDismiss={dismiss}>
        <IconBadge />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-1)' }}>Install FMCI Network</div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-2)' }}>Add to your home screen for the full app experience.</div>
        </div>
        <button onClick={handleAndroidInstall} style={{
          flexShrink: 0, padding: '9px 18px', borderRadius: '20px', border: 'none',
          backgroundColor: 'var(--color-navy)', color: '#fff', fontSize: '13px', fontWeight: 700,
          cursor: 'pointer', fontFamily: 'var(--font-sans)',
        }}>Install</button>
      </BannerShell>
    )
  }

  // iOS Safari — no programmatic install API exists on iOS at all; the only
  // way in is the manual Share-sheet flow, so just explain it.
  if (isIOSSafari) {
    return (
      <BannerShell onDismiss={dismiss}>
        <IconBadge />
        <div style={{ flex: 1, minWidth: 0, fontSize: '13px', color: 'var(--color-text-1)', lineHeight: 1.4 }}>
          <strong>Install FMCI Network:</strong> tap <span style={{ fontWeight: 700 }}>Share</span> <span aria-hidden>⬆️</span> then <strong>"Add to Home Screen"</strong>.
        </div>
      </BannerShell>
    )
  }

  // Chrome/Firefox/etc. on iOS — WebKit wrappers with no home-screen-install
  // capability at all, regardless of what they do on other platforms.
  if (isIOSOtherBrowser) {
    return (
      <BannerShell onDismiss={dismiss}>
        <IconBadge />
        <div style={{ flex: 1, minWidth: 0, fontSize: '13px', color: 'var(--color-text-1)', lineHeight: 1.4 }}>
          Open this site in <strong>Safari</strong> to install it as an app.
        </div>
      </BannerShell>
    )
  }

  return null
}
