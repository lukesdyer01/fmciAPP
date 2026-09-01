import { supabase } from '../lib/supabase'
import { publicAnonKey } from '../../utils/supabase/info'

const BASE = 'https://jbtlmdrmysrgvdpbveyu.supabase.co/functions/v1/dynamic-endpoint'

export const FMCI_ADMIN = '/make-server-5bb4c08d/fmci-admin'

export async function api<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession()
  // Falls back to the anon key so calls made before sign-in (e.g. checking
  // whether registration is open) still pass the gateway's auth-header check.
  const token = data.session?.access_token ?? publicAnonKey
  const hasBody = options?.body != null
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  })
  if (!res.ok) throw new Error(`Server error ${res.status}: ${await res.text()}`)
  return res.json() as Promise<T>
}
