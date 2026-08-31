import { supabase } from '../lib/supabase'

const BASE = 'https://jbtlmdrmysrgvdpbveyu.supabase.co/functions/v1/dynamic-endpoint'

export const FMCI_ADMIN = '/make-server-5bb4c08d/fmci-admin'

export async function api<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
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
