import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { projectId, publicAnonKey } from '../../utils/supabase/info'

// Key is project-specific so changing the project ID creates a fresh client
const key = `__fmci_supabase_${projectId}__`
const g = globalThis as any

// Inside a Capacitor WebView, default localStorage can be evicted by iOS
// under storage pressure — Preferences is backed by the iOS Keychain/
// UserDefaults instead, so a signed-in session survives reliably across
// app restarts. Web behavior (plain localStorage) is unchanged.
const nativeAuthStorage = {
  getItem: async (k: string) => (await Preferences.get({ key: k })).value,
  setItem: async (k: string, v: string) => { await Preferences.set({ key: k, value: v }) },
  removeItem: async (k: string) => { await Preferences.remove({ key: k }) },
}

if (!g[key]) {
  // Remove any stale clients from previous project IDs
  Object.keys(g).filter(k => k.startsWith('__fmci_supabase_') && k !== key).forEach(k => delete g[k])
  const isNative = Capacitor.isNativePlatform()
  g[key] = createClient(`https://${projectId}.supabase.co`, publicAnonKey, isNative ? {
    auth: { storage: nativeAuthStorage, detectSessionInUrl: false },
  } : undefined)
}

export const supabase: SupabaseClient = g[key]
