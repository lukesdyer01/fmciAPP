import { useMutation } from '@tanstack/react-query'
import { api } from './server'
import { VAPID_PUBLIC_KEY } from '../../utils/supabase/vapid'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

// One-shot registration — Notification.requestPermission() only works
// meaningfully here because the caller (PushPrompt) only renders once the
// app is confirmed running standalone (installed to the home screen), which
// is iOS's hard requirement for even offering push permission at all.
export async function subscribeToPush(): Promise<void> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notification permission denied')

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
  })

  await api('/push/subscribe', { method: 'POST', body: JSON.stringify(subscription.toJSON()) })
}

export function useSubscribeToPush() {
  return useMutation({ mutationFn: subscribeToPush })
}
