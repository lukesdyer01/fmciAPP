import { optimizePostImage } from '../lib/postImage'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { activeMention, matchesQuery, insertMention, mentionedUsers } from '../lib/mentions'
import { findYouTubeLink } from '../lib/youtube'
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
  members: { userId: string; role: string; canPostAsMinistry?: boolean }[]
}

interface TaggableMember {
  id: string
  name: string
  avatarUrl: string
}

const TESTIMONY_CATEGORIES = [
  { value: 'healing',     label: 'Healing',     icon: '🩹' },
  { value: 'provision',   label: 'Provision',   icon: '🍞' },
  { value: 'salvation',   label: 'Salvation',   icon: '✝️' },
  { value: 'deliverance', label: 'Deliverance', icon: '🕊️' },
  { value: 'other',       label: 'Other',       icon: '✨' },
]

const MAX_IMAGE_MB = 20
const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024
const DEFAULT_POST_PROMPT = 'Share a post, testimony, teaching, or prayer request with the network…'

// No SVG on purpose: served from the public storage bucket it would be a
// script-execution vector, and a post photo never needs to be vector art.
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/pjpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif',
  'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif',
  'image/avif': 'avif', 'image/bmp': 'bmp',
}
const KNOWN_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'avif', 'bmp'])

function mimeOf(file: File): string {
  return file.type.toLowerCase().split(';')[0].trim()
}

// A pasted image is typically called "image.png", "blob", or nothing at all, so
// the filename is only trusted when it really ends in a known image extension;
// otherwise the MIME type names the stored object.
function imageExt(file: File): string {
  const named = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (named !== file.name.toLowerCase() && KNOWN_EXTS.has(named)) return named === 'jpeg' ? 'jpg' : named
  return EXT_BY_MIME[mimeOf(file)] ?? 'jpg'
}

// Safari and iOS populate clipboardData.files; Chrome and Firefox fill items as
// well. getAsFile() has to run synchronously — the item list is emptied the
// moment the paste event finishes dispatching.
function imageFromClipboard(dt: DataTransfer | null): File | null {
  if (!dt) return null
  const fromFiles = Array.from(dt.files).find(f => f.type.startsWith('image/'))
  if (fromFiles) return fromFiles
  for (const item of Array.from(dt.items)) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const f = item.getAsFile()
      if (f) return f
    }
  }
  return null
}

interface Props {
  type?: 'post' | 'prayer' | 'testimony'
  placeholder?: string
  // When set, the post always lands in this ministry's feed (orgId). If the
  // caller is an owner/admin of it, the "Posting as" selector still appears
  // scoped to just this one org, letting them choose to post as themselves
  // (default — no orgName, no badge) or as the ministry (orgName set, badge
  // + org avatar shown). Only an owner, admin, or superadmin-designated
  // ministry leader sees the selector — used on a ministry's own page.
  fixedOrgId?: string
  // When set, the post is tagged to this user's wall (their profile page) —
  // used both when posting on your own page and on someone else's.
  wallUserId?: string
  wallUserName?: string
  // Hides the "Posting as" org selector even when the user has orgs they
  // could post as — used on the main feed, which the user asked to keep
  // personal-only.
  hidePostAs?: boolean
  // Forces every post from this composer instance to this visibility and
  // hides the Public/Members Only picker entirely — used for a ministry's
  // Prayer/Testimonies tabs, which are always members-only, not a choice.
  forcedVisibility?: 'private'
}

export default function PostComposer({ type = 'post', placeholder, fixedOrgId, wallUserId, wallUserName, hidePostAs, forcedVisibility }: Props) {
  const { currentUser } = useAuth()
  const [composerOpen, setComposerOpen] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const [myOrgs, setMyOrgs] = useState<MyOrg[]>([])
  const [postAs, setPostAs] = useState<'self' | string>('self')
  const [isOrgMember, setIsOrgMember] = useState(false)
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [pin, setPin] = useState(false)
  const [image, setImage] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  // Which detected link the author has waved away, so dismissing an embed
  // sticks to that video rather than suppressing every one they go on to paste.
  const [dismissedVideoId, setDismissedVideoId] = useState('')
  const [composerError, setComposerError] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [testimonyCategory, setTestimonyCategory] = useState('')
  const [taggedUsers, setTaggedUsers] = useState<{ id: string; name: string }[]>([])
  const [taggableMembers, setTaggableMembers] = useState<TaggableMember[] | null>(null)
  // Where the caret is, so the @… being typed can be found. Kept in state
  // rather than read on demand because the suggestions re-render from it.
  const [caret, setCaret] = useState(0)
  const [mentionIndex, setMentionIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const launchRef = useRef<HTMLButtonElement>(null)

  // Facebook-style link detection: paste a YouTube URL anywhere in the post and
  // it becomes a player, with no separate control to find. Derived from the text
  // on every render rather than mirrored into state, so it can never disagree
  // with what has actually been typed. An attached photo wins — the author
  // picked that deliberately, where a link may just be part of what they wrote.
  const detected = findYouTubeLink(text)
  const videoId = detected && !image && detected.id !== dismissedVideoId ? detected.id : ''

  // Suggestions for the @… under the caret. Derived rather than stored so they
  // always describe the text as it stands.
  const mention = activeMention(text, caret)
  const mentionMatches = mention && !anonymous
    ? (taggableMembers ?? []).filter(m => matchesQuery(m.name, mention.query)).slice(0, 6)
    : []
  const userProfile = useUIStore(s => s.userProfile)
  const { mutate: createPost, isPending } = useCreatePost()

  useEffect(() => {
    if (!composerOpen) return
    const previous = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const frame = requestAnimationFrame(() => textareaRef.current?.focus())
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        event.preventDefault()
        setComposerOpen(false)
        setFocused(false)
        return
      }
      if (event.key !== 'Tab') return
      const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), textarea:not(:disabled), input:not(:disabled):not([type="file"]), [tabindex="0"]') ?? [])]
      if (!focusable.length) { event.preventDefault(); return }
      if (event.shiftKey && (document.activeElement === focusable[0] || document.activeElement === dialogRef.current)) {
        event.preventDefault(); focusable.at(-1)?.focus()
      } else if (!event.shiftKey && document.activeElement === focusable.at(-1)) {
        event.preventDefault(); focusable[0].focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
      if (launchRef.current) launchRef.current.focus()
      else previous?.focus()
    }
  }, [composerOpen])

  useEffect(() => {
    if (wallUserId || hidePostAs) return
    api<MyOrg[]>('/orgs/my')
      .then(orgs => {
        const canPostAsMinistry = (o: MyOrg) =>
          Array.isArray(o.members) && o.members.some(m => m.userId === currentUser?.id && (m.role === 'owner' || m.role === 'admin' || m.canPostAsMinistry === true))
        // On a ministry's own page, scope the selector to just that one
        // ministry — showing every other org this person administers would
        // be confusing here. Elsewhere (the main feed), show all of them.
        setMyOrgs(fixedOrgId
          ? orgs.filter(o => o.id === fixedOrgId && canPostAsMinistry(o))
          : orgs.filter(canPostAsMinistry))
        // Any role (not just owner/admin) counts as membership for the
        // purposes of being allowed to post privately to this one ministry.
        if (fixedOrgId) {
          const org = orgs.find(o => o.id === fixedOrgId)
          setIsOrgMember(!!org?.members?.some(m => m.userId === currentUser?.id))
        }
      })
      .catch(() => {})
  }, [fixedOrgId, wallUserId, hidePostAs, currentUser?.id])

  // The one choke point for both ways in — the picker and a paste — so the
  // checks live here rather than in either caller.
  async function handleImageFile(file: File) {
    if (!currentUser || uploadingImage) return
    const mime = mimeOf(file)
    const ext = imageExt(file)
    // Some pickers hand back an empty type, and then a recognised extension is
    // the only evidence available.
    const looksLikeImage = mime ? !!EXT_BY_MIME[mime] : KNOWN_EXTS.has(ext)
    if (!looksLikeImage) {
      setComposerError("That file isn't a supported image — use a JPEG, PNG, GIF, WEBP or HEIC.")
      return
    }
    // Bound the source file before decoding; optimized photos upload at 500 KB or less.
    if (file.size > MAX_IMAGE_BYTES) {
      setComposerError(`That image is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is ${MAX_IMAGE_MB} MB.`)
      return
    }
    setUploadingImage(true); setComposerError('')
    try {
      const optimized = await optimizePostImage(file)
      const path = `${currentUser.id}/post-${crypto.randomUUID()}.${optimized.extension}`
      const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, optimized.blob, {
        upsert: false, contentType: optimized.blob.type || 'image/gif',
      })
      if (uploadErr) throw uploadErr
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      setImage(data.publicUrl)
    } catch (e: any) {
      setComposerError(e.message ?? 'Failed to upload image.')
    } finally {
      setUploadingImage(false)
    }
  }

  // The directory is only fetched once someone actually reaches for a mention,
  // so composing a plain post costs nothing.
  function loadTaggableMembers() {
    if (taggableMembers === null) {
      api<TaggableMember[]>('/members').then(setTaggableMembers).catch(() => setTaggableMembers([]))
    }
  }

  // Paste an image straight into the post. Anything that isn't an image falls
  // through untouched, so pasting text — a YouTube URL included — behaves
  // exactly as before and the link detection still picks it up.
  function onPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    // Photos are a post-only affordance, exactly as the picker is.
    if (type !== 'post') return
    // Copying part of a web page puts both text and an image on the clipboard,
    // and the text is what the author meant to paste.
    if (e.clipboardData?.getData('text/plain').trim()) return
    const file = imageFromClipboard(e.clipboardData)
    if (!file) return
    // Only on the branch that found an image — everything else has to fall
    // through untouched, or pasting a YouTube link stops working.
    e.preventDefault()
    handleImageFile(file)
  }

  function onTextChange(next: string, nextCaret: number) {
    setText(next)
    setCaret(nextCaret)
    setMentionIndex(0)
    if (activeMention(next, nextCaret)) loadTaggableMembers()
  }

  function insertEmoji(emoji: string) {
    const textarea = textareaRef.current
    const start = textarea?.selectionStart ?? text.length
    const end = textarea?.selectionEnd ?? start
    const next = `${text.slice(0, start)}${emoji}${text.slice(end)}`
    const nextCaret = start + emoji.length
    setText(next)
    setCaret(nextCaret)
    setShowEmojiPicker(false)
    requestAnimationFrame(() => {
      textarea?.focus()
      textarea?.setSelectionRange(nextCaret, nextCaret)
    })
  }

  function chooseMention(member: TaggableMember) {
    const active = activeMention(text, caret)
    if (!active) return
    const next = insertMention(text, active.start, caret, member.name)
    setText(next.text)
    setCaret(next.caret)
    setMentionIndex(0)
    setTaggedUsers(prev => prev.some(t => t.id === member.id) ? prev : [...prev, { id: member.id, name: member.name }])
    // Put the caret back after the name we just inserted; without this it jumps
    // to the end of the whole post.
    requestAnimationFrame(() => {
      const el = textareaRef.current
      if (!el) return
      el.focus()
      el.setSelectionRange(next.caret, next.caret)
    })
  }

  function handlePost() {
    // A photo alone is a valid post — text is optional when an image is attached.
    if ((!text.trim() && !image) || isPending || uploadingImage) return
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
      orgId: fixedOrgId ?? orgIdentity?.id,
      orgName: orgIdentity?.name,
      orgImg: orgIdentity?.img,
      visibility: forcedVisibility ?? (fixedOrgId && isOrgMember ? visibility : undefined),
      pinned: orgIdentity?.type === 'headquarters' && pin ? true : undefined,
      wallUserId,
      wallUserName,
      image: image || undefined,
      imageAlt: image ? 'Post photo' : undefined,
      videoId: videoId || undefined,
      isAnonymous: anonymous || undefined,
      testimonyCategory: type === 'testimony' ? testimonyCategory : undefined,
      // Someone tagged and then deleted out of the text shouldn't stay tagged.
      taggedUsers: !anonymous && mentionedUsers(text, taggedUsers).length > 0 ? mentionedUsers(text, taggedUsers) : undefined,
      ...(type === 'prayer' ? { prayerStatus: 'unanswered' as const } : {}),
    }, {
      onSuccess: () => {
        setText(''); setImage(''); setDismissedVideoId(''); setCaret(0)
        setAnonymous(false); setTestimonyCategory(''); setTaggedUsers([])
        setVisibility('public'); setPin(false)
        setComposerOpen(false); setFocused(false)
      },
    })
  }

  const selectedOrg = postAs !== 'self' ? myOrgs.find(o => o.id === postAs) : null
  const avatar = userProfile.avatarUrl
    ? <img src={userProfile.avatarUrl} alt="" style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
    : <span aria-hidden="true" className="post-composer-avatar-fallback">{(userProfile.name || '?').slice(0, 2).toUpperCase()}</span>
  const modalTitle = type === 'prayer' ? 'Create prayer request' : type === 'testimony' ? 'Share your testimony' : 'Create post'

  return (
    <>
      <div className="post-composer-launcher">
        {avatar}
        <button ref={launchRef} type="button" onClick={() => setComposerOpen(true)}>
          {text.trim() || image ? 'Continue your draft…' : selectedOrg ? `Share something on behalf of ${selectedOrg.name}…` : placeholder ?? DEFAULT_POST_PROMPT}
        </button>
      </div>
      {composerOpen && createPortal(
        <div className="post-composer-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) { setComposerOpen(false); setFocused(false) } }}>
          <div ref={dialogRef} className="post-composer-modal" role="dialog" aria-modal="true" aria-labelledby="post-composer-title" tabIndex={-1}>
            <header className="post-composer-modal-header">
              <h2 id="post-composer-title">{modalTitle}</h2>
              <button type="button" aria-label="Close post composer" onClick={() => { setComposerOpen(false); setFocused(false) }}>×</button>
            </header>
            <div className="post-composer-form">
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
            so a non-member can never post anything but a public post here.
            Hidden entirely when the caller (e.g. a ministry's Prayer/
            Testimonies tab) has forced a specific visibility already. */}
        {!forcedVisibility && fixedOrgId && isOrgMember && (
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

        {/* Pin toggle — FMCI's own official announcements only (org.type
            "headquarters" is unique to FMCI), not any individual ministry. */}
        {selectedOrg?.type === 'headquarters' && (
          <div
            role="switch"
            aria-checked={pin}
            tabIndex={0}
            onClick={() => setPin(p => !p)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPin(p => !p) } }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', cursor: 'pointer', userSelect: 'none' }}
          >
            <span style={{
              width: '36px', height: '20px', borderRadius: '10px', position: 'relative', flexShrink: 0,
              backgroundColor: pin ? 'var(--color-gold)' : 'var(--color-border)', transition: 'background 0.15s',
            }}>
              <span style={{
                position: 'absolute', top: '2px', width: '16px', height: '16px', borderRadius: '50%',
                backgroundColor: '#fff', transition: 'left 0.15s', left: pin ? '18px' : '2px',
              }} />
            </span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-2)' }}>
              📌 Pin to top of feed for 7 days
            </span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              flex: 1, backgroundColor: 'var(--color-surface)', borderRadius: '10px',
              padding: '10px 14px', cursor: 'text',
              border: `2px solid ${focused ? 'var(--color-gold)' : 'transparent'}`,
              transition: 'border 0.15s',
              // The photo control lives in here beside the text rather than in a
              // row of options below, so attaching a picture reads as part of
              // writing the post. flex-end keeps it on the last line as the
              // field grows from one row to three.
              display: 'flex', alignItems: 'flex-end', gap: '8px',
            }}
            onClick={() => setFocused(true)}
          >
            <textarea
              ref={textareaRef}
              placeholder={selectedOrg
                ? `Share something on behalf of ${selectedOrg.name}…`
                : placeholder ?? (type === 'post' ? DEFAULT_POST_PROMPT : `Share your ${type}…`)
              }
              value={text}
              onChange={e => onTextChange(e.target.value, e.target.selectionStart ?? e.target.value.length)}
              // Arrow keys and clicks move the caret without changing the text,
              // so the mention under it has to be recomputed on selection too.
              onSelect={e => setCaret((e.target as HTMLTextAreaElement).selectionStart ?? 0)}
              onFocus={() => setFocused(true)}
              // Delayed so a click on a suggestion lands before the list is torn
              // down by the blur — and so the composer's collapse (rows 3→1)
              // doesn't move the Post button out from under a click still in
              // flight. Without the delay, the first tap on Post is eaten by
              // the layout shift and nothing happens until a second tap.
              onBlur={() => { setTimeout(() => { setFocused(false); setCaret(-1) }, 300) }}
              onKeyDown={e => {
                if (mentionMatches.length > 0) {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(i => (i + 1) % mentionMatches.length); return }
                  if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex(i => (i - 1 + mentionMatches.length) % mentionMatches.length); return }
                  if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); chooseMention(mentionMatches[mentionIndex]); return }
                  if (e.key === 'Escape') { e.preventDefault(); setCaret(-1); return }
                }
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlePost()
              }}
              onPaste={onPaste}
              rows={3}
              style={{
                // flex + minWidth:0 rather than width:100% — a flex child won't
                // shrink below its content without it, which pushes the icon out
                // of the box. padding/margin zeroed so the text baseline and the
                // button line up.
                flex: 1, minWidth: 0, padding: 0, margin: 0,
                background: 'none', border: 'none', outline: 'none',
                fontSize: '24px', fontFamily: 'var(--font-sans)',
                color: text ? 'var(--color-text-1)' : 'var(--color-text-3)',
                resize: 'none', lineHeight: 1.5,
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
            {/* Removes the player, not the link: the URL stays in the text the
                author wrote, they just don't want it expanded. */}
            <button onClick={() => setDismissedVideoId(videoId)} title="Don't show this video" style={{
              position: 'absolute', top: '8px', right: '8px', width: '28px', height: '28px', borderRadius: '50%',
              border: 'none', backgroundColor: 'rgba(0,0,0,0.55)', color: '#fff', cursor: 'pointer',
              fontSize: '14px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1,
            }}>✕</button>
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

        {/* Mention suggestions — driven by the @ under the caret in the textarea
            above, so there is no separate control to find. */}
        {mentionMatches.length > 0 && (
          <div style={{ marginTop: '10px', border: '1px solid var(--color-border)', borderRadius: '10px', overflow: 'hidden' }}>
            {mentionMatches.map((m, i) => (
              <button
                key={m.id}
                // onMouseDown, not onClick: the textarea's blur fires first and
                // would take the list away before a click ever landed.
                onMouseDown={e => { e.preventDefault(); chooseMention(m) }}
                onMouseEnter={() => setMentionIndex(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '8px 12px',
                  border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)',
                  backgroundColor: i === mentionIndex ? 'var(--color-hover)' : 'transparent',
                }}
              >
                {m.avatarUrl
                  ? <img src={m.avatarUrl} alt="" style={{ width: '26px', height: '26px', borderRadius: '7px', objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: '26px', height: '26px', borderRadius: '7px', flexShrink: 0, backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '10px' }}>{(m.name || '?').slice(0, 2).toUpperCase()}</div>
                }
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-1)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
              </button>
            ))}
          </div>
        )}

        {composerError && (
          <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-red-text)' }}>{composerError}</div>
        )}
      </div>

      {/* Post button — only while the composer is open, matching the photo
          control. A collapsed one-line box has no actions to discover. */}
      {composerOpen && (
        <div className="post-composer-footer">
          {showEmojiPicker && (
            <div className="post-composer-emoji-picker" role="group" aria-label="Choose an emoji">
              {['😀', '😂', '🥰', '🙏', '❤️', '👏', '🎉', '✨', '🙌', '👍', '😢', '🔥'].map(emoji => (
                <button key={emoji} type="button" onClick={() => insertEmoji(emoji)} aria-label={`Insert ${emoji}`}>
                  {emoji}
                </button>
              ))}
            </div>
          )}
          <div className="post-composer-add-row">
            <strong>Add to your post</strong>
            {type === 'post' && (
              <>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = '' }} />
                <button type="button" className="post-composer-tool photo" onClick={() => fileRef.current?.click()} disabled={uploadingImage} aria-label="Add photo" title="Add photo">
                  <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5L5 20"/></svg>
                </button>
              </>
            )}
            <button type="button" className="post-composer-tool emoji" onClick={() => setShowEmojiPicker(open => !open)} aria-label="Add emoji" aria-expanded={showEmojiPicker} title="Add emoji">
              <span aria-hidden="true">☺</span>
            </button>
            {uploadingImage && <span className="post-composer-uploading">Optimizing and uploading photo…</span>}
          </div>
          <button
            className="post-composer-submit"
            onClick={handlePost}
            disabled={(!text.trim() && !image) || isPending || uploadingImage}
            style={{
              marginLeft: 'auto', padding: '8px 22px', borderRadius: '8px', border: 'none',
              backgroundColor: (text.trim() || image) && !isPending && !uploadingImage ? 'var(--color-navy)' : 'var(--color-border)',
              color: (text.trim() || image) && !isPending && !uploadingImage ? '#fff' : 'var(--color-text-3)',
              fontSize: '14px', fontWeight: 700,
              cursor: (text.trim() || image) && !isPending && !uploadingImage ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
            }}
          >{isPending ? 'Posting…' : 'Post'}</button>
        </div>
      )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
