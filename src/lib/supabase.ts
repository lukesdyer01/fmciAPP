import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { projectId, publicAnonKey } from '../../utils/supabase/info'

// Key is project-specific so changing the project ID creates a fresh client
const key = `__fmci_supabase_${projectId}__`
const g = globalThis as any

if (!g[key]) {
  // Remove any stale clients from previous project IDs
  Object.keys(g).filter(k => k.startsWith('__fmci_supabase_') && k !== key).forEach(k => delete g[k])
  g[key] = createClient(`https://${projectId}.supabase.co`, publicAnonKey)
}

export const supabase: SupabaseClient = g[key]
