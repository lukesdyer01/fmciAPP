import { useState, useEffect, useRef } from 'react'
import { useUIStore } from '../store/ui'
import { useCreatePost } from '../api-client/posts'
import { api } from '../api-client/server'
import { supabase } from '../lib/supabase'
import { useAuth } from '../providers/AuthProvider'

interface MyOrg {
  id: string
  name: string
  type: string
  img?: string
  members: { userId: string; role: string }[]
}

interface TaggableMember {
  id: string
  name: string
  avatarUrl: string
}

const POST_TYPES = [
  { icon: '🙏', label: 'Prayer Request', color: '#7C3AED' },
]

const TESTIMONY_CATEGORIES = [
  { value: 'healing',     label: 'Healing',     icon: '🩹' },
  { value: 'provision',   label: 'Provision',   icon: '🍞' },
  { value: 'salvation',   label: 'Salvation',   icon: '✝️' },
  { value: 'deliverance', label: 'Deliverance', icon: '🕊️' },
  { value: 'other',       label: 'Other',       icon: '✨' },
]

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

interface Props {
  type?: 'post' | 'prayer' | 'testimony'
  placeholder?: string
  // When set, the post always lands in this ministry's feed (orgId). If the
  // caller is an owner/admin of it, the "Posting as" selector still appears
  // scoped to just this one org, letting them choose to post as themselves
  // (default — no orgName, no badge) or as the ministry (orgName set, badge
  // + org avatar shown). Non-owner/admins never see the selector and always
  // post as themselves — used on a ministry's own page.
  fixedOrgId?: string
  // When set, the post is tagged to this user's wall (their profile page) —
  // used both when posting on your own page and on someone else's.
  wallUserId?: string
  wallUserName?: string
  // Hides the "Posting as" org selector even when the user has orgs they
  // could post as — used on the main feed, which the user asked to keep
  // personal-only.
  hidePostAs?: boolean
}

export default function PostComposer({ type = 'post', placeholder, fixedOrgId, wallUserId, wallUserName, hidePostAs }: Props) {
  const { currentUser } = useAuth()
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const [myOrgs, setMyOrgs] = useState<MyOrg[]>([])
  const [postAs, setPostAs] = useState<'self' | string>('self')
  const [isOrgMember, setIsOrgMember] = useState(false)
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [image, setImage] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [videoId, setVideoId] = useState('')
  const [showVideoInput, setShowVideoInput] = useState(false)
  const [videoUrlDraft, setVideoUrlDraft] = useState('')
  const [composerError, setComposerError] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [testimonyCategory, setTestimonyCategory] = useState('')
  const [taggedUsers, setTaggedUsers] = useState<{ id: string; name: string }[]>([])
  const [showTagPicker, setShowTagPicker] = useState(false)
  const [tagQuery, setTagQuery] = useState('')
  const [taggableMembers, setTaggableMembers] = useState<TaggableMember[] | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const userProfile = useUIStore(s => s.userProfile)
  const { mutate: createPost, isPending } = useCreatePost()

  useEffect(() => {
    if (wallUserId || hidePostAs) return
    api<MyOrg[]>('/orgs/my')
      .then(orgs => {
        const isOwnerOrAdmin = (o: MyOrg) =>
          Array.isArray(o.members) && o.members.some(m => m.userId === currentUser?.id && (m.role === 'owner' || m.role === 'admin'))
        // On a ministry's own page, scope the selector to just that one
        // ministry — showing every other org this person administers would
        // be confusing here. Elsewhere (the main feed), show all of them.
        setMyOrgs(fixedOrgId
          ? orgs.filter(o => o.id === fixedOrgId && isOwnerOrAdmin(o))
          : orgs.filter(isOwnerOrAdmin))
        // Any role (not just owner/admin) counts as membership for the
        // purposes of being allowed to post privately to this one ministry.
        if (fixedOrgId) {
          const org = orgs.find(o => o.id === fixedOrgId)
          setIsOrgMember(!!org?.members?.some(m => m.userId === currentUser?.id))
        }
      })
      .catch(() => {})
  }, [fixedOrgId, wallUserId, hidePostAs, currentUser?.id])

  async function handleImageFile(file: File) {
    if (!currentUser) return
    setUploadingImage(true); setComposerError('')
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${currentUser.id}/post-${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, {
        upsert: true, contentType: file.type || 'image/jpeg',
      })
      if (uploadErr) throw uploadErr
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      setImage(data.publicUrl)
      setVideoId(''); setShowVideoInput(false)
    } catch (e: any) {
      setComposerError(e.message ?? 'Failed to upload image.')
    } finally {
      setUploadingImage(false)
    }
  }

  function openTagPicker() {
    setShowTagPicker(v => !v)
    if (taggableMembers === null) {
      api<TaggableMember[]>('/members').then(setTaggableMembers).catch(() => setTaggableMembers([]))
    }
  }

  function toggleTag(member: TaggableMember) {
    setTaggedUsers(prev =>
      prev.some(t => t.id === member.id)
        ? prev.filter(t => t.id !== member.id)
        : [...prev, { id: member.id, name: member.name }]
    )
  }

  function confirmVideo() {
    const id = extractYouTubeId(videoUrlDraft.trim())
    if (!id) { setComposerError('Enter a valid YouTube video URL.'); return }
    setVideoId(id)
    setImage('')
    setShowVideoInput(false)
    setComposerError('')
  }

  function handlePost() {
    if (!text.trim() || isPending) return
    if (type === 'testimony' && !testimonyCategory) { setComposerError('Choose a category for this testimony.'); return }
    // Set only when the user has actively selected an org identity via the
    // pill — orgId still gets set below whenever fixedOrgId is present (so
    // the post appears in that ministry's feed either way), but orgName
    // (which triggers the "Posted on behalf of" badge) only when this is set.
    const orgIdentity = postAs !== 'self' ? myOrgs.find(o => o.id === postAs) : null
    // Anonymous posts still carry the real caller's authorId server-side (so the
    // poster keeps edit/delete rights), but the displayed name/avatar/details are
    // replaced so other users can't identify them.
    createPost({
      author: anonymous ? 'Anonymous' : userProfile.name,
      avatar: anonymous ? '' : userProfile.avatarUrl,
      title: anonymous ? '' : userProfile.title,
      church: anonymous ? '' : userProfile.church,
      location: anonymous ? '' : userProfile.location,
      badges: !anonymous && currentUser?.verified ? ['verified'] : [],
      type,
      content: text.trim(),
      isFollowing: false,
      orgId: fixedOrgId ?? orgIdentity?.id,
      orgName: orgIdentity?.name,
      orgImg: orgIdentity?.img,
      visibility: fixedOrgId && isOrgMember ? visibility : undefined,
      wallUserId,
      wallUserName,
      image: image || undefined,
      imageAlt: image ? 'Post photo' : undefined,
      videoId: videoId || undefined,
      isAnonymous: anonymous || undefined,
      testimonyCategory: type === 'testimony' ? testimonyCategory : undefined,
      taggedUsers: !anonymous && taggedUsers.length > 0 ? taggedUsers : undefined,
      ...(type === 'prayer' ? { prayerStatus: 'unanswered' as const } : {}),
    }, {
      onSuccess: () => {
        setText(''); setImage(''); setVideoId(''); setVideoUrlDraft(''); setShowVideoInput(false)
        setAnonymous(false); setTestimonyCategory(''); setTaggedUsers([]); setShowTagPicker(false); setTagQuery('')
        setVisibility('public')
      },
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

        {/* Visibility selector — only for actual members of this ministry,
            so a non-member can never post anything but a public post here. */}
        {fixedOrgId && isOrgMember && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-3)' }}>Visibility:</span>
            {([
              { id: 'public' as const, icon: '🌐', label: 'Public' },
              { id: 'private' as const, icon: '🔒', label: 'Members Only' },
            ]).map(v => (
              <button
                key={v.id}
                onClick={() => setVisibility(v.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '5px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 600,
                  backgroundColor: visibility === v.id ? 'var(--color-navy)' : 'var(--color-surface)',
                  color: visibility === v.id ? '#fff' : 'var(--color-text-2)',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: '14px' }}>{v.icon}</span>
                {v.label}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {selectedOrg ? (
            selectedOrg.img ? (
              <img src={selectedOrg.img} alt={selectedOrg.name} style={{ width: '42px', height: '42px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', flexShrink: 0, backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                🏛
              </div>
            )
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
                : placeholder ?? 'Share a post, testimony, teaching, or prayer request with the network…'
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

        {/* Image preview */}
        {image && (
          <div style={{ position: 'relative', marginTop: '12px', borderRadius: '10px', overflow: 'hidden' }}>
            <img src={image} alt="" style={{ width: '100%', maxHeight: '320px', objectFit: 'cover', display: 'block' }} />
            <button onClick={() => setImage('')} style={{
              position: 'absolute', top: '8px', right: '8px', width: '28px', height: '28px', borderRadius: '50%',
              border: 'none', backgroundColor: 'rgba(0,0,0,0.55)', color: '#fff', cursor: 'pointer',
              fontSize: '14px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>✕</button>
          </div>
        )}

        {/* Video preview */}
        {videoId && (
          <div style={{ position: 'relative', marginTop: '12px', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#000' }}>
            <div style={{ position: 'relative', paddingTop: '56.25%' }}>
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                title="YouTube video"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <button onClick={() => setVideoId('')} style={{
              position: 'absolute', top: '8px', right: '8px', width: '28px', height: '28px', borderRadius: '50%',
              border: 'none', backgroundColor: 'rgba(0,0,0,0.55)', color: '#fff', cursor: 'pointer',
              fontSize: '14px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1,
            }}>✕</button>
          </div>
        )}

        {/* Video URL input */}
        {showVideoInput && !videoId && (
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
            <input
              value={videoUrlDraft}
              onChange={e => setVideoUrlDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') confirmVideo() }}
              placeholder="Paste a YouTube video URL…"
              autoFocus
              style={{
                flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)',
                fontSize: '13px', fontFamily: 'var(--font-sans)', color: 'var(--color-text-1)',
                backgroundColor: 'var(--color-surface)', outline: 'none',
              }}
            />
            <button onClick={confirmVideo} style={{
              padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--color-navy)',
              color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}>Add</button>
            <button onClick={() => { setShowVideoInput(false); setVideoUrlDraft(''); setComposerError('') }} style={{
              padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'none',
              color: 'var(--color-text-2)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}>Cancel</button>
          </div>
        )}

        {/* Anonymous toggle — prayer requests only */}
        {type === 'prayer' && (
          <div
            role="switch"
            aria-checked={anonymous}
            tabIndex={0}
            onClick={() => setAnonymous(a => !a)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAnonymous(a => !a) } }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', cursor: 'pointer', userSelect: 'none' }}
          >
            <span style={{
              width: '36px', height: '20px', borderRadius: '10px', position: 'relative', flexShrink: 0,
              backgroundColor: anonymous ? 'var(--color-navy)' : 'var(--color-border)', transition: 'background 0.15s',
            }}>
              <span style={{
                position: 'absolute', top: '2px', width: '16px', height: '16px', borderRadius: '50%',
                backgroundColor: '#fff', transition: 'left 0.15s', left: anonymous ? '18px' : '2px',
              }} />
            </span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-2)' }}>
              🕶 Post anonymously — your name won't be shown
            </span>
          </div>
        )}

        {/* Category picker — testimonies only */}
        {type === 'testimony' && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              What did God do? *
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {TESTIMONY_CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => { setTestimonyCategory(cat.value); setComposerError('') }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 600,
                    backgroundColor: testimonyCategory === cat.value ? 'var(--color-navy)' : 'var(--color-surface)',
                    color: testimonyCategory === cat.value ? '#fff' : 'var(--color-text-2)',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: '14px' }}>{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tagged people chips */}
        {taggedUsers.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
            {taggedUsers.map(t => (
              <span key={t.id} style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                padding: '4px 6px 4px 10px', borderRadius: '20px',
                backgroundColor: 'var(--color-gold-bg)', border: '1px solid var(--color-gold-border)',
                fontSize: '12px', fontWeight: 600, color: 'var(--color-gold)',
              }}>
                {t.name}
                <button
                  onClick={() => setTaggedUsers(prev => prev.filter(x => x.id !== t.id))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--color-gold)', fontSize: '12px', lineHeight: 1, display: 'flex' }}
                >✕</button>
              </span>
            ))}
          </div>
        )}

        {/* Tag people picker */}
        {showTagPicker && (
          <div style={{ marginTop: '12px', border: '1px solid var(--color-border)', borderRadius: '10px', overflow: 'hidden' }}>
            <input
              autoFocus
              value={tagQuery}
              onChange={e => setTagQuery(e.target.value)}
              placeholder="Search people to tag…"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: 'none', borderBottom: '1px solid var(--color-border)',
                fontSize: '13px', fontFamily: 'var(--font-sans)', color: 'var(--color-text-1)',
                backgroundColor: 'var(--color-surface)', outline: 'none',
              }}
            />
            <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
              {taggableMembers === null && (
                <div style={{ padding: '14px', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-3)' }}>Loading…</div>
              )}
              {taggableMembers !== null && taggableMembers
                .filter(m => m.name.toLowerCase().includes(tagQuery.trim().toLowerCase()))
                .slice(0, 8)
                .map(m => {
                  const selected = taggedUsers.some(t => t.id === m.id)
                  return (
                    <button key={m.id} onClick={() => toggleTag(m)} style={{
                      display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '8px 12px',
                      border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)',
                      backgroundColor: selected ? 'var(--color-gold-bg)' : 'transparent',
                    }}
                      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-hover)' }}
                      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
                    >
                      {m.avatarUrl
                        ? <img src={m.avatarUrl} alt="" style={{ width: '26px', height: '26px', borderRadius: '7px', objectFit: 'cover', flexShrink: 0 }} />
                        : <div style={{ width: '26px', height: '26px', borderRadius: '7px', flexShrink: 0, backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '10px' }}>{(m.name || '?').slice(0, 2).toUpperCase()}</div>
                      }
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-1)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
                      {selected && <span style={{ color: 'var(--color-gold)', fontSize: '13px' }}>✓</span>}
                    </button>
                  )
                })}
              {taggableMembers !== null && taggableMembers.filter(m => m.name.toLowerCase().includes(tagQuery.trim().toLowerCase())).length === 0 && (
                <div style={{ padding: '14px', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-3)' }}>No matches</div>
              )}
            </div>
          </div>
        )}

        {composerError && (
          <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-red)' }}>{composerError}</div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '0 12px 12px', flexWrap: 'wrap' }}>
        {type === 'post' && (
          <>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = '' }} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingImage}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '7px 12px', borderRadius: '8px', border: 'none',
                background: 'none', cursor: uploadingImage ? 'default' : 'pointer',
                fontSize: '13px', fontWeight: 600, color: 'var(--color-text-2)',
                fontFamily: 'var(--font-sans)', transition: 'background 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-hover)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
            >
              <span style={{ fontSize: '16px' }}>🖼️</span>
              {uploadingImage ? 'Uploading…' : 'Photo'}
            </button>
            <button
              onClick={() => { setShowVideoInput(v => !v); setComposerError('') }}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '7px 12px', borderRadius: '8px', border: 'none',
                background: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: 600, color: 'var(--color-text-2)',
                fontFamily: 'var(--font-sans)', transition: 'background 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-hover)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
            >
              <span style={{ fontSize: '16px' }}>▶️</span>
              Video
            </button>
          </>
        )}
        {!anonymous && (
          <button
            onClick={openTagPicker}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '7px 12px', borderRadius: '8px', border: 'none',
              background: showTagPicker ? 'var(--color-hover)' : 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: 600, color: 'var(--color-text-2)',
              fontFamily: 'var(--font-sans)', transition: 'background 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-hover)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = showTagPicker ? 'var(--color-hover)' : 'transparent' }}
          >
            <span style={{ fontSize: '16px' }}>🏷️</span>
            {taggedUsers.length > 0 ? `Tagged (${taggedUsers.length})` : 'Tag People'}
          </button>
        )}
        {type === 'post' && POST_TYPES.map((t, i) => (
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
