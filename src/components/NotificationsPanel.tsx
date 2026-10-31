import NotificationPreferences from './NotificationPreferences'
import { useState } from 'react'
import { useNotifications, useReadNotification, type ReactionNotification } from '../api-client/notifications'
import PostCard from './PostCard'
// Full-window Notifications panel — mirrors MessagesPanel: a slide-over on
// desktop, the whole screen on a phone. The bell tab opens it; the labelled
// "← Home" (mobile) / ✕ (desktop) buttons and a backdrop tap close it. The
// tab bar hides while it's open so the two never fight.

import { useUIStore } from '../store/ui'

export default function NotificationsPanel() {
  const notifications=useNotifications(),read=useReadNotification()
  const [selected,setSelected]=useState<ReactionNotification|null>(null)
  const reactions={amen:"✝️ Amen",pray:"🙏 Pray",heart:"❤️ Love",praise:"🙌 Praise"}
  const setNotifOpen = useUIStore(s => s.setNotifOpen)

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) setNotifOpen(false) }}
      style={{ position: 'fixed', inset: 0, zIndex: 400, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'flex-end' }}
    >
      <div className="notifications-panel" style={{
        width: '760px', maxWidth: '100vw', height: '100vh', backgroundColor: 'var(--color-card)',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
          {/* Which of these two shows is a breakpoint decision made in CSS — see
              .notifications-home-btn / .notifications-close-btn. Both do the same
              thing; full-screen on a phone wants the labelled way out, the desktop
              slide-over wants the usual dismiss. */}
          <button onClick={() => setNotifOpen(false)} className="notifications-home-btn" style={{
            background: 'none', border: 'none', cursor: 'pointer', alignItems: 'center', gap: '5px',
            color: 'var(--color-navy-text)', fontSize: '14px', fontWeight: 700, padding: '4px 2px',
            fontFamily: 'var(--font-sans)',
          }}>← Home</button>
          <div style={{ flex: 1, fontSize: '17px', fontWeight: 800, color: 'var(--color-text-1)' }}>Notifications</div>
          <button onClick={() => setNotifOpen(false)} className="notifications-close-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', fontSize: '20px', lineHeight: 1, padding: '4px' }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          <section aria-label="Reaction activity">
            <h2 style={{fontSize:16,marginTop:0}}>Recent activity</h2>
            {notifications.isPending&&<p role="status">Loading notifications…</p>}
            {notifications.isError&&<p role="alert">Unable to load notifications. <button onClick={()=>notifications.refetch()}>Retry</button></p>}
            {notifications.data?.length===0&&<p>Reactions to your posts and comments will appear here.</p>}
            {notifications.data?.map(item=><button key={item.id} className="reaction-notification" onClick={()=>{setSelected(item);read.mutate(item)}}>
              <span aria-hidden="true">{reactions[item.reaction].split(' ')[0]}</span>
              <span><strong>{item.actorName}</strong> reacted with {reactions[item.reaction].split(' ')[1]} to your {item.commentId?'comment':'post'}.
                <span className="notification-preview">{item.preview.slice(0,140)}</span>
                <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time>
              </span>
              {!item.readAt&&<span className="notification-unread" aria-label="Unread"/>}
            </button>)}
            {read.isError&&<p role="alert">Unable to mark notification read. Please try again.</p>}
            {selected&&<div style={{margin:'16px 0'}}><button onClick={()=>setSelected(null)}>Close post</button><PostCard key={selected.id+selected.createdAt} post={notifications.data?.find(item=>item.id===selected.id)?.post??selected.post} initialCommentId={selected.commentId}/></div>}
          </section>
          <NotificationPreferences />
          <p>Messages appear in your inbox. Push notifications open the related conversation or event.</p>
        </div>
      </div>
    </div>
  )
}