import { supabase } from '../lib/supabase'
import { publicAnonKey } from '../../utils/supabase/info'

const BASE = 'https://jbtlmdrmysrgvdpbveyu.supabase.co/functions/v1/dynamic-endpoint'

export const FMCI_ADMIN = '/make-server-5bb4c08d/fmci-admin'

// Share recovery across requests so simultaneous queries don't rotate the
// refresh token repeatedly or clear a session another request just recovered.
let recovery: ReturnType<typeof supabase.auth.refreshSession> | undefined
function recoverSession() {
  if (!recovery) recovery = supabase.auth.refreshSession().finally(() => { recovery = undefined })
  return recovery
}

export async function api<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const publicRequest = (!options?.method || ['GET', 'HEAD'].includes(options.method.toUpperCase())) && ['/settings', '/health'].includes(path)
  if (!data.session && !publicRequest) throw new Error('Your session has ended. Please sign in again.')

  function request(token: string) {
    const headers = new Headers(options?.headers)
    if (options?.body != null && !(options.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
    headers.set('Authorization', `Bearer ${token}`)
    return fetch(`${BASE}${path}`, { ...options, headers })
  }

  let res = await request(data.session?.access_token ?? publicAnonKey)
  // Authentication middleware rejects the request before mutations run, so a
  // single retry with a refreshed session does not duplicate a successful write.
  if (res.status === 401 && data.session) {
    const refreshed = await recoverSession()
    if (refreshed.error || !refreshed.data.session) {
      await supabase.auth.signOut({ scope: 'local' })
      throw new Error('Your session has expired. Please sign in again.')
    }
    res = await request(refreshed.data.session.access_token)
  }
  if (!res.ok) {
    if (res.status === 401) throw new Error('Your session could not be verified. Please sign out and sign in again.')
    let message = `Unable to complete this request (${res.status}). Please try again.`
    try {
      const body = await res.json()
      if (typeof body.error === 'string') message = body.error
    } catch { /* Keep the readable fallback for non-JSON gateway responses. */ }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}
