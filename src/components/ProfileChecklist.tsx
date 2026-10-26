import { useEffect, useState } from 'react'
import { api } from '../api-client/server'
import { useFeedPosts } from '../api-client/posts'
import { useAuth } from '../providers/AuthProvider'
import { useUIStore } from '../store/ui'
import { supabase } from '../lib/supabase'

interface MyOrgSummary {
  id: string
  members: { userId: string }[]
}

export default function ProfileChecklist({ mobileWelcome = false }: { mobileWelcome?: boolean }) {
  const { currentUser, updateCurrentUser } = useAuth()
  const setActiveView = useUIStore(s => s.setActiveView)
  const setEditProfileOpen = useUIStore(s => s.setEditProfileOpen)
  const { data: posts } = useFeedPosts()
  const [orgs, setOrgs] = useState<MyOrgSummary[] | null>(null)
  const [dismissing, setDismissing] = useState(false)
  const [dismissError, setDismissError] = useState('')

  useEffect(() => {
    if (!currentUser || (mobileWelcome && (!currentUser.welcomeGuideEligible || currentUser.welcomeGuideDismissed))) return
    let active = true
    api<MyOrgSummary[]>('/orgs/my')
      .then(result => { if (active) setOrgs(result) })
      .catch(() => { if (active) setOrgs([]) })
    return () => { active = false }
  }, [mobileWelcome, currentUser?.id, currentUser?.welcomeGuideEligible, currentUser?.welcomeGuideDismissed])

  if (!currentUser || orgs === null) return null
  if (mobileWelcome && (!currentUser.welcomeGuideEligible || currentUser.welcomeGuideDismissed)) return null

  const hasPosted = (posts ?? []).some(p => p.authorId === currentUser.id)
  const hasMinistry = orgs.some(o => o.members.some(m => m.userId === currentUser.id))

  const items = [
    { done: !!currentUser.avatarUrl, label: 'Add a profile photo', action: () => setEditProfileOpen(true) },
    { done: !!currentUser.bio?.trim(), label: 'Write a short bio', action: () => setEditProfileOpen(true) },
    { done: !!(currentUser.title && currentUser.church && currentUser.location), label: 'Add your title, church & location', action: () => setEditProfileOpen(true) },
    { done: hasPosted, label: 'Make your first post', action: () => {
      setActiveView('feed')
      window.setTimeout(() => document.querySelector('.post-composer-launcher')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0)
    } },
    { done: hasMinistry, label: 'Join a ministry', action: () => setActiveView('orgs') },
  ]

  const doneCount = items.filter(i => i.done).length
  if (doneCount === items.length) return null

  async function dismiss() {
    setDismissing(true)
    setDismissError('')
    try {
      const { data, error: getUserError } = await supabase.auth.getUser()
      if (getUserError) throw getUserError
      if (!data.user) throw new Error('Sign in again to save this preference.')
      const { error } = await supabase.auth.updateUser({
        data: { ...data.user.user_metadata, welcomeGuideDismissed: true },
      })
      if (error) throw error
      updateCurrentUser({ welcomeGuideDismissed: true })
    } catch (error: any) {
      setDismissError(error.message ?? 'Could not save your preference. Please try again.')
    } finally {
      setDismissing(false)
    }
  }

  const pct = Math.round((doneCount / items.length) * 100)

  return (
    <div className={mobileWelcome ? 'mobile-welcome-checklist' : undefined} style={{
      backgroundColor: 'var(--color-card)', borderRadius: '12px',
      border: '1px solid var(--color-border)', padding: '16px', marginBottom: '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          {mobileWelcome ? '👋 Getting Started' : '🚀 Complete Your Profile'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-navy-text)' }}>{doneCount}/{items.length}</div>
          {mobileWelcome && <button type="button" onClick={dismiss} disabled={dismissing} aria-label="Dismiss getting started checklist" title="Dismiss checklist" style={{
            padding: '2px 5px', border: 0, borderRadius: '6px', background: 'transparent', color: 'var(--color-text-3)',
            fontSize: '18px', lineHeight: 1, cursor: dismissing ? 'wait' : 'pointer',
          }}>{dismissing ? '…' : '×'}</button>}
        </div>
      </div>
      {mobileWelcome && <p style={{ margin: '0 0 12px', color: 'var(--color-text-2)', fontSize: '13px', lineHeight: 1.5 }}>
        A few quick steps to get connected with the FMCI community.
      </p>}
      <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'var(--color-surface)', overflow: 'hidden', marginBottom: '14px' }}>
        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: 'var(--color-gold)', transition: 'width 0.3s' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
        {items.map((item, i) => (
          <button
            key={i}
            onClick={item.done ? undefined : item.action}
            disabled={item.done}
            style={{
              display: 'flex', alignItems: 'center', gap: '9px', width: '100%',
              padding: 0, border: 'none', background: 'none', textAlign: 'left',
              cursor: item.done ? 'default' : 'pointer', fontFamily: 'var(--font-sans)',
            }}
          >
            <span style={{
              width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px',
              backgroundColor: item.done ? '#22c55e' : 'transparent',
              border: item.done ? 'none' : '1.5px solid var(--color-border)',
              color: '#fff',
            }}>{item.done ? '✓' : ''}</span>
            <span style={{
              fontSize: '13px', fontWeight: item.done ? 500 : 600,
              color: item.done ? 'var(--color-text-3)' : 'var(--color-text-1)',
              textDecoration: item.done ? 'line-through' : 'none',
            }}>{item.label}</span>
          </button>
        ))}
      </div>
      {dismissError && <p role="alert" style={{ margin: '12px 0 0', color: 'var(--color-red-text)', fontSize: '12px' }}>{dismissError}</p>}
    </div>
  )
}
