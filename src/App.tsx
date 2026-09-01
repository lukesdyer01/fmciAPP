import { useEffect, Component, type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './api-client/queryClient'
import { AuthProvider } from './providers/AuthProvider'
import { OrgThemeProvider } from './providers/OrgThemeProvider'
import { useUIStore } from './store/ui'
import { useSupabaseRole } from './contexts/SupabaseRoleContext'
import { useAuth } from './providers/AuthProvider'
import { api } from './api-client/server'
import Topbar from './components/Topbar'
import LeftSidebar from './components/LeftSidebar'
import Feed from './components/Feed'
import RightSidebar from './components/RightSidebar'
import AdminShell from './components/admin/AdminShell'
import ProfileView from './components/ProfileView'
import MessagesPanel from './components/MessagesPanel'
import AuthGate from './components/AuthGate'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '40px', fontFamily: 'monospace', backgroundColor: '#0d1117', color: '#f87171', minHeight: '100vh' }}>
          <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>App Error</div>
          <div style={{ fontSize: '13px', color: '#fca5a5', whiteSpace: 'pre-wrap' }}>{(this.state.error as Error).message}</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '12px', whiteSpace: 'pre-wrap' }}>{(this.state.error as Error).stack}</div>
          <button onClick={() => this.setState({ error: null })} style={{ marginTop: '20px', padding: '8px 16px', backgroundColor: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', color: '#e6edf3', borderRadius: '6px', cursor: 'pointer' }}>Retry</button>
        </div>
      )
    }
    return this.props.children
  }
}

export type ActiveView = 'feed' | 'directory' | 'groups' | 'prayer' | 'testimonies' | 'events' | 'resources' | 'orgs' | 'about'

function AppShell() {
  const activeView = useUIStore(s => s.activeView)
  const setActiveView = useUIStore(s => s.setActiveView)
  const adminMode = useUIStore(s => s.adminMode)
  const setAdminMode = useUIStore(s => s.setAdminMode)
  const profileId = useUIStore(s => s.profileId)
  const closeProfile = useUIStore(s => s.closeProfile)
  const messagesOpen = useUIStore(s => s.messagesOpen)
  const updateUserProfile = useUIStore(s => s.updateUserProfile)
  const { role } = useSupabaseRole()
  const { currentUser } = useAuth()

  useEffect(() => {
    // The signed-in user's Supabase Auth record is the single source of truth for
    // profile display — there is no shared/global profile to merge in.
    if (!currentUser) return
    updateUserProfile({
      name: currentUser.displayName ?? '',
      bio: currentUser.bio ?? '',
      avatarUrl: currentUser.avatarUrl ?? '',
      coverUrl: currentUser.coverUrl ?? '',
      title: currentUser.title ?? '',
      church: currentUser.church ?? '',
      location: currentUser.location ?? '',
      website: currentUser.website ?? '',
      email: currentUser.email ?? '',
    })
  }, [currentUser])

  useEffect(() => {
    // Every member is inherently part of FMCI itself — idempotent on the
    // server, so calling it once per session load is enough.
    if (!currentUser) return
    api('/orgs/fmci-bootstrap', { method: 'POST' }).catch(() => {})
  }, [currentUser?.id])

  // If adminMode was somehow activated without a qualifying role, reset it
  useEffect(() => {
    if (adminMode && role === 'member') setAdminMode(false)
  }, [adminMode, role])

  if (adminMode && (role === 'superadmin' || role === 'admin')) return <AdminShell />

  return (
    <div style={{ fontFamily: 'var(--font-sans)', backgroundColor: 'var(--color-surface)', minHeight: '100vh' }}>
      <Topbar />
      <div className="app-grid">
        <LeftSidebar activeView={activeView} setActiveView={setActiveView} />
        <main style={{ padding: '20px 12px', minHeight: 'calc(100vh - 64px)' }}>
          {profileId !== null
            ? <ProfileView userId={profileId} onBack={closeProfile} />
            : <Feed activeView={activeView} />}
        </main>
        <RightSidebar />
      </div>
      {messagesOpen && <MessagesPanel />}
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthGate>
          <AuthProvider>
            <OrgThemeProvider orgId="org_fmci">
              <ErrorBoundary>
                <AppShell />
              </ErrorBoundary>
            </OrgThemeProvider>
          </AuthProvider>
        </AuthGate>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
