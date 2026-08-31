import { createContext, useContext, useState, useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type PlatformRole = 'superadmin' | 'admin' | 'member'

interface SupabaseRoleContextValue {
  session: Session
  role: PlatformRole
  userId: string
  refreshRole: () => Promise<void>
}

const SupabaseRoleContext = createContext<SupabaseRoleContextValue | null>(null)

export function useSupabaseRole(): SupabaseRoleContextValue {
  const ctx = useContext(SupabaseRoleContext)
  if (!ctx) throw new Error('useSupabaseRole must be used inside SupabaseRoleProvider')
  return ctx
}

function extractRole(session: Session | null): PlatformRole {
  if (!session) return 'member'
  const r = session.user.app_metadata?.role ?? session.user.user_metadata?.role
  if (r === 'superadmin' || r === 'admin') return r
  return 'member'
}

interface Props {
  children: React.ReactNode
  initialSession: Session
}

export function SupabaseRoleProvider({ children, initialSession }: Props) {
  const [session, setSession] = useState<Session>(initialSession)
  const [role, setRole] = useState<PlatformRole>(() => extractRole(initialSession))

  async function refreshRole() {
    const { data } = await supabase.auth.refreshSession()
    if (data.session) {
      setSession(data.session)
      setRole(extractRole(data.session))
    }
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('[SupabaseRoleProvider] auth event:', event, 'session:', newSession ? 'valid' : 'null')
      if (newSession) setSession(newSession)
      setRole(extractRole(newSession))
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <SupabaseRoleContext.Provider value={{ session, role, userId: session.user.id, refreshRole }}>
      {children}
    </SupabaseRoleContext.Provider>
  )
}
