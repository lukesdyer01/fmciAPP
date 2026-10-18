import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../providers/AuthProvider'
import { api } from '../api-client/server'
import { publishStory, storyKeys, useStories, type Story, type StoryReaction, type StoryViewer } from '../api-client/stories'
import { prepareStoryPhoto } from '../lib/storyPhoto'
import { useBlockMember } from '../api-client/moderation'
import ReportModal from './ReportModal'

const reactions: [StoryReaction, string][] = [['heart', '❤️ Heart'], ['amen', '🙌 Amen'], ['pray', '🙏 Pray']]
function useStoryDialog(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  const close = useRef(onClose); close.current = onClose
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    function key(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); close.current(); return }
      if (e.key !== 'Tab') return
      const nodes = [...(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [tabindex="0"]') ?? [])]
      if (!nodes.length) { e.preventDefault(); return }
      if (e.shiftKey && (document.activeElement === nodes[0] || document.activeElement === ref.current)) { e.preventDefault(); nodes.at(-1)?.focus() }
      else if (!e.shiftKey && document.activeElement === nodes.at(-1)) { e.preventDefault(); nodes[0].focus() }
    }
    document.addEventListener('keydown', key)
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', key); previous?.focus() }
  }, [])
  return ref
}
function StoryThumbnail({ story }: { story: Story }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [visible, setVisible] = useState(false)
  const [failedUrl, setFailedUrl] = useState('')
  const retried = useRef(false)
  const { data, refetch } = useQuery({
    queryKey: [...storyKeys.all, 'thumbnail', story.id],
    queryFn: () => api<{ url: string }>(`/stories/${story.id}/media`),
    enabled: visible && Date.parse(story.expiresAt) > Date.now(),
    staleTime: 45_000,
    retry: false,
  })
  useEffect(() => {
    const observer = new IntersectionObserver(entries => setVisible(entries.some(entry => entry.isIntersecting)), { rootMargin: '100px' })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return <span ref={ref} className="story-thumbnail">
    {data?.url && failedUrl !== data.url ? <img src={data.url} alt="" decoding="async" onError={() => {
      setFailedUrl(data.url)
      if (!retried.current) { retried.current = true; void refetch() }
    }} /> : <span aria-hidden="true">▧</span>}
  </span>
}

function StoryComposer({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [photo, setPhoto] = useState<Blob | null>(null)
  const [preview, setPreview] = useState('')
  const [caption, setCaption] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const uploadId = useRef(crypto.randomUUID())
  const dialog = useStoryDialog(() => { if (!busy) onClose() })
  useEffect(() => { if (!photo) { setPreview(''); return }; const url = URL.createObjectURL(photo); setPreview(url); return () => URL.revokeObjectURL(url) }, [photo])
  async function choose(file?: File) {
    if (!file) return
    setBusy(true); setError(''); setPhoto(null); uploadId.current = crypto.randomUUID()
    try { setPhoto(await prepareStoryPhoto(file)) } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  async function publish() {
    if (!photo || busy) return
    setBusy(true); setError('')
    try { await publishStory(uploadId.current, photo, caption.trim()); await qc.invalidateQueries({ queryKey: storyKeys.all }); onClose() }
    catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  return createPortal(<div className="story-backdrop">
    <div ref={dialog} role="dialog" aria-modal="true" aria-label="Create photo Story" tabIndex={-1} className="story-composer">
      <div className="story-toolbar"><h2>Create Story</h2><button disabled={busy} aria-label="Close Story composer" onClick={onClose}>✕</button></div>
      <p>Visible to FMCI members · Disappears after 24 hours</p>
      <label className="story-photo-picker">Choose a photo<input disabled={busy} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { void choose(e.target.files?.[0]); e.target.value = '' }} /></label>
      {preview && <img className="story-preview" src={preview} alt="Story photo preview" />}
      <label className="story-caption-label">Caption (optional)<textarea disabled={busy} value={caption} maxLength={300} onChange={e => setCaption(e.target.value)} placeholder="Share a moment with the community…" /></label>
      <p className="story-hint">Photos only. Up to 10 photos per 24 hours. Photos are compressed before upload and aren’t archived.</p>
      {error && <p role="alert" className="story-error">{error}</p>}
      <button className="story-publish" disabled={!photo || busy} onClick={publish}>{busy ? 'Preparing or sharing…' : 'Share Story'}</button>
    </div>
  </div>, document.body)
}
function StoryPlayer({ stories, startId, userId, onClose }: { stories: Story[]; startId: string; userId: string; onClose: () => void }) {
  const [index, setIndex] = useState(Math.max(0, stories.findIndex(s => s.id === startId)))
  const story = stories[index]
  const [media, setMedia] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [paused, setPaused] = useState(false)
  const [held, setHeld] = useState(false)
  const [background, setBackground] = useState(document.hidden)
  const [progress, setProgress] = useState(0)
  const [report, setReport] = useState(false)
  const [viewers, setViewers] = useState<StoryViewer[] | null>(null)
  const [reaction, setReaction] = useState<StoryReaction | null>(story.reaction)
  const [working, setWorking] = useState(false)
  const [menu, setMenu] = useState(false)
  const qc = useQueryClient()
  const block = useBlockMember()
  const own = story.authorId === userId
  const dialog = useStoryDialog(() => { if (!report) onClose() })
  const elapsed = useRef(0)
  const move = useCallback((delta: number) => {
    setMenu(false); setViewers(null); setReport(false)
    const next = index + delta
    if (next < 0) return
    if (next >= stories.length) { onClose(); return }
    setIndex(next)
  }, [index, stories.length, onClose])
  useEffect(() => {
    let live = true
    setMedia(''); setLoaded(false); setError(''); setProgress(0); elapsed.current = 0; setReaction(story.reaction); setPaused(false); setHeld(false)
    api<{ url: string }>(`/stories/${story.id}/media`).then(d => { if (live) setMedia(d.url) }).catch(e => { if (live) setError(e.message) })
    return () => { live = false }
  }, [story.id])
  useEffect(() => {
    const visibility = () => setBackground(document.hidden)
    const blur = () => setBackground(true)
    const focus = () => setBackground(document.hidden)
    document.addEventListener('visibilitychange', visibility); window.addEventListener('blur', blur); window.addEventListener('focus', focus)
    return () => { document.removeEventListener('visibilitychange', visibility); window.removeEventListener('blur', blur); window.removeEventListener('focus', focus) }
  }, [])
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (report || viewers || menu || (e.target as HTMLElement).closest('button,input,textarea')) return
      if (e.key === 'ArrowRight') { e.preventDefault(); move(1) }
      if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1) }
      if (e.key === ' ') { e.preventDefault(); setPaused(p => !p) }
    }
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key)
  }, [move, report, viewers, menu])
  useEffect(() => {
    const timer = window.setInterval(() => { if (Date.now() >= Date.parse(story.expiresAt)) move(1) }, 1000)
    return () => clearInterval(timer)
  }, [story.id, move])
  useEffect(() => {
    if (!loaded || paused || held || background || report || viewers || menu || working || error) return
    let frame = 0; let previous = performance.now()
    const tick = (now: number) => {
      elapsed.current += Math.min(now - previous, 100); previous = now
      setProgress(Math.min(1, elapsed.current / 7000))
      if (elapsed.current >= 7000) move(1); else frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame)
  }, [loaded, paused, held, background, report, viewers, menu, working, error, move])
  async function act(action: () => Promise<unknown>) {
    setWorking(true); setError('')
    try { await action(); await qc.invalidateQueries({ queryKey: storyKeys.all }) } catch (e) { setError((e as Error).message) } finally { setWorking(false) }
  }
  function onLoaded() {
    setLoaded(true)
    if (!own) void api(`/stories/${story.id}/view`, { method: 'POST' }).then(() => qc.invalidateQueries({ queryKey: storyKeys.all })).catch(e => setError(e.message))
  }
  return createPortal(<div className="story-player-backdrop">
    <div ref={dialog} role="dialog" aria-modal="true" aria-label={`${story.authorName}'s Story`} tabIndex={-1} className="story-player">
      <div className="story-progress" aria-label="Story progress">{stories.filter(s => s.authorId === story.authorId).map(s => <span key={s.id}><i style={{ width: `${s.id === story.id ? progress * 100 : Date.parse(s.createdAt) < Date.parse(story.createdAt) ? 100 : 0}%` }} /></span>)}</div>
      <div className="story-toolbar story-player-toolbar"><div><strong>{story.authorName}</strong><small>{new Date(story.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small></div><button onClick={() => setPaused(p => !p)} aria-label={paused ? 'Play Story' : 'Pause Story'}>{paused ? '▶' : 'Ⅱ'}</button><button aria-label="Story options" onClick={() => setMenu(v => !v)}>•••</button><button aria-label="Close Stories" onClick={onClose}>✕</button></div>
      {menu && <div className="story-options">
        {own ? <button disabled={working} onClick={() => { if (window.confirm('Delete this Story photo?')) void act(async () => { await api(`/stories/${story.id}`, { method: 'DELETE' }); move(1) }) }}>Delete photo</button> : <><button onClick={() => { setMenu(false); setReport(true) }}>Report Story</button><button disabled={working} onClick={() => { if (window.confirm(`Block ${story.authorName}?`)) void act(async () => { await block.mutateAsync(story.authorId); onClose() }) }}>Block member</button></>}
      </div>}
      <div className="story-image-area" onPointerDown={() => setHeld(true)} onPointerUp={() => setHeld(false)} onPointerCancel={() => setHeld(false)} onPointerLeave={() => setHeld(false)}>
        {media && <img key={story.id} src={media} alt={story.caption || `Photo shared by ${story.authorName}`} onLoad={onLoaded} onError={() => setError('Unable to load this photo. Close and reopen the Story to retry.')} draggable={false} />}
        {!loaded && !error && <span role="status">Loading photo…</span>}
      </div>
      {story.caption && <p className="story-player-caption">{story.caption}</p>}
      <div className="story-player-bottom">
        <button disabled={index === 0} onClick={() => move(-1)} aria-label="Previous Story">‹</button>
        {own ? <button disabled={working} onClick={() => void act(async () => setViewers(await api<StoryViewer[]>(`/stories/${story.id}/viewers`)))}>Viewers</button> : <div className="story-reactions">{reactions.map(([value, label]) => <button key={value} disabled={!loaded || working} aria-pressed={reaction === value} onClick={() => void act(async () => { const next = reaction === value ? null : value; await api(`/stories/${story.id}/reaction`, { method: 'PUT', body: JSON.stringify({ reaction: next }) }); setReaction(next) })}>{label}</button>)}</div>}
        <button onClick={() => move(1)} aria-label="Next Story">›</button>
      </div>
      {error && <div role="alert" className="story-error">{error}</div>}
      {viewers && <div className="story-viewers"><div className="story-toolbar"><strong>{viewers.length} viewers</strong><button aria-label="Close viewer list" onClick={() => setViewers(null)}>✕</button></div>{viewers.length ? viewers.map(v => <p key={v.id}>{v.name} {reactions.find(([r]) => r === v.reaction)?.[1]}</p>) : <p>No views yet.</p>}</div>}
      {report && <ReportModal targetType="story" targetId={story.id} targetAuthorId={story.authorId} targetLabel="Story" onClose={() => { setReport(false); onClose() }} />}
    </div>
  </div>, document.body)
}
export default function Stories() {
  const { currentUser } = useAuth()
  const { data = [], isError, refetch } = useStories(currentUser?.id)
  const [now, setNow] = useState(Date.now())
  const [create, setCreate] = useState(false)
  const [playing, setPlaying] = useState<{ stories: Story[]; startId: string } | null>(null)
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer) }, [])
  const groups = new Map<string, Story[]>()
  for (const story of data.filter(s => Date.parse(s.expiresAt) > now)) groups.set(story.authorId, [...(groups.get(story.authorId) ?? []), story])
  const authors = [...groups.values()].sort((a, b) => Number(b[0].authorId === currentUser?.id) - Number(a[0].authorId === currentUser?.id) || Number(a.every(s => s.seen)) - Number(b.every(s => s.seen)) || Date.parse(b[0].createdAt) - Date.parse(a[0].createdAt))
  const sequence = authors.flatMap(list => [...list].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)))
  const close = useCallback(() => setPlaying(null), [])
  return <section className="stories-section" aria-label="Photo Stories">
    <div className="stories-row"><button className="story-create-card" onClick={() => setCreate(true)}><span>＋</span>Create Story</button>{authors.map(list => {
      const author = list[0]
      return <button key={author.authorId} className={`story-author-card ${list.some(s => !s.seen) ? 'story-unseen' : ''}`} onClick={() => setPlaying({ stories: sequence, startId: [...list].reverse().find(s => !s.seen)?.id ?? list.at(-1)!.id })} aria-label={`View ${author.authorId === currentUser?.id ? 'your' : author.authorName + "'s"} Stories${list.some(s => !s.seen) ? ', unseen photos' : ''}`}><StoryThumbnail story={author} /><span>{author.authorId === currentUser?.id ? 'Your Story' : author.authorName}</span></button>
    })}</div>
    {isError && <button className="story-retry" onClick={() => void refetch()}>Unable to load Stories. Retry</button>}
    {create && <StoryComposer onClose={() => setCreate(false)} />}
    {playing && currentUser && <StoryPlayer {...playing} userId={currentUser.id} onClose={close} />}
  </section>
}
