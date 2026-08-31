import { useState, useEffect } from 'react'
import { useUIStore } from '../store/ui'
import { useCreatePost } from '../api-client/posts'
import { api } from '../api-client/server'

interface MyOrg {
  id: string
  name: string
  type: string
  members: { userId: string; role: string }[]
}

const POST_TYPES = [
  { icon: '🎥', label: 'Live Video',     color: '#E05D5D' },
  { icon: '🖼️', label: 'Photo/Video',    color: '#4CAF50' },
  { icon: '📖', label: 'Scripture',      color: 'var(--color-gold)' },
  { icon: '🙏', label: 'Prayer Request', color: '#7C3AED' },
  { icon: '😊', label: 'Feeling',        color: '#FF9800' },
]

export default function PostComposer() {
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const [myOrgs, setMyOrgs] = useState<MyOrg[]>([])
  const [postAs, setPostAs] = useState<'self' | string>('self')
  const userProfile = useUIStore(s => s.userProfile)
  const { mutate: createPost, isPending } = useCreatePost()

  useEffect(() => {
    api<MyOrg[]>('/orgs/my')
      .then(orgs => {
        // Only show orgs where the user is owner or admin (can post as)
        setMyOrgs(orgs.filter(o =>
          Array.isArray(o.members) && o.members.some(m =>
            m.role === 'owner' || m.role === 'admin'
          )
        ))
      })
      .catch(() => {})
  }, [])

  function handlePost() {
    if (!text.trim() || isPending) return
    const selectedOrg = postAs !== 'self' ? myOrgs.find(o => o.id === postAs) : null
    createPost({
      author: userProfile.name,
      avatar: userProfile.avatarUrl,
      title: userProfile.title,
      church: userProfile.church,
      location: userProfile.location,
      badges: [],
      type: 'post',
      content: text.trim(),
      isFollowing: false,
      orgId: selectedOrg?.id,
      orgName: selectedOrg?.name,
    }, {
      onSuccess: () => setText(''),
    })
  }

  const selectedOrg = postAs !== 'self' ? myOrgs.find(o => o.id === postAs) : null

  return (
    <div style={{
      backgroundColor: 'var(--color-card)',
      borderRadius: '12px', marginBottom: '12px',
      border: '1px solid var(--color-border)',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '14px 16px' }}>
        {/* Post as selector */}
        {myOrgs.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-3)' }}>Posting as:</span>
            <button
              onClick={() => setPostAs('self')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '5px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 600,
                backgroundColor: postAs === 'self' ? 'var(--color-navy)' : 'var(--color-surface)',
                color: postAs === 'self' ? '#fff' : 'var(--color-text-2)',
                transition: 'all 0.15s',
              }}
            >
              {userProfile.avatarUrl
                ? <img src={userProfile.avatarUrl} alt="" style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }} />
                : <span style={{ fontSize: '14px' }}>👤</span>
              }
              Myself
            </button>
            {myOrgs.map(org => (
              <button
                key={org.id}
                onClick={() => setPostAs(org.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '5px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 600,
                  backgroundColor: postAs === org.id ? 'var(--color-gold)' : 'var(--color-surface)',
                  color: postAs === org.id ? '#fff' : 'var(--color-text-2)',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: '14px' }}>🏛</span>
                {org.name}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {selectedOrg ? (
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', flexShrink: 0, backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
              🏛
            </div>
          ) : userProfile.avatarUrl ? (
            <img
              src={userProfile.avatarUrl}
              alt={userProfile.name}
              style={{ width: '42px', height: '42px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
            />
          ) : (
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', flexShrink: 0, backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '16px' }}>
              {(userProfile.name || '?').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div
            style={{
              flex: 1, backgroundColor: 'var(--color-surface)', borderRadius: '10px',
              padding: '10px 14px', cursor: 'text',
              border: `2px solid ${focused ? 'var(--color-gold)' : 'transparent'}`,
              transition: 'border 0.15s',
            }}
            onClick={() => setFocused(true)}
          >
            <textarea
              placeholder={selectedOrg
                ? `Share something on behalf of ${selectedOrg.name}…`
                : 'Share a post, testimony, teaching, or prayer request with the network…'
              }
              value={text}
              onChange={e => setText(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlePost() }}
              rows={focused ? 3 : 1}
              style={{
                width: '100%', background: 'none', border: 'none', outline: 'none',
                fontSize: '15px', fontFamily: 'var(--font-sans)',
                color: text ? 'var(--color-text-1)' : 'var(--color-text-3)',
                resize: 'none', lineHeight: 1.6,
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '0 12px 12px', flexWrap: 'wrap' }}>
        {POST_TYPES.map((t, i) => (
          <button key={i} style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '7px 12px', borderRadius: '8px', border: 'none',
            background: 'none', cursor: 'pointer',
            fontSize: '13px', fontWeight: 600, color: 'var(--color-text-2)',
            fontFamily: 'var(--font-sans)', transition: 'background 0.15s',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-hover)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
          >
            <span style={{ fontSize: '16px' }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
        <button
          onClick={handlePost}
          disabled={!text.trim() || isPending}
          style={{
            marginLeft: 'auto', padding: '8px 22px', borderRadius: '8px', border: 'none',
            backgroundColor: text.trim() && !isPending ? 'var(--color-navy)' : 'var(--color-border)',
            color: text.trim() && !isPending ? '#fff' : 'var(--color-text-3)',
            fontSize: '14px', fontWeight: 700,
            cursor: text.trim() && !isPending ? 'pointer' : 'not-allowed',
            fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
          }}
        >{isPending ? 'Posting…' : 'Post'}</button>
      </div>
    </div>
  )
}
