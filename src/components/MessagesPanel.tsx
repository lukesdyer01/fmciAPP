import GroupMessages from './GroupMessages'
import { useNetworkSettings } from '../api-client/features'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api-client/server'
import { useState, useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { useUIStore } from '../store/ui'
import { useAuth } from '../providers/AuthProvider'
import {
  useConversations, useArchivedConversations, useConversationMessages,
  useStartConversation, useSendMessage, useArchiveConversation,
  useUnarchiveConversation, useDeleteConversation, type ConversationSummary,
} from '../api-client/messages'
import { useBlockMember, useUnblockMember, useBlockedMembers } from '../api-client/moderation'
import { useSwipeBack } from '../hooks/useSwipeBack'
import { hapticSuccess } from '../lib/haptics'

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.round(ms / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.round(hours / 24)}d`
}

function Avatar({ name, avatarUrl, size = 40 }: { name: string; avatarUrl?: string; size?: number }) {
  return avatarUrl
    ? <img src={avatarUrl} alt={name} style={{ width: size, height: size, borderRadius: size / 3, objectFit: 'cover', flexShrink: 0, display: 'block' }} />
    : (
      <div style={{
        width: size, height: size, borderRadius: size / 3, flexShrink: 0,
        backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 800, fontSize: size * 0.4,
      }}>{(name || '?').slice(0, 2).toUpperCase()}</div>
    )
}

const menuItemStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '11px 14px',
  border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left',
  fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-1)',
}

// Shared ⋯ menu for a conversation: Archive/Unarchive, Delete, Block/Unblock.
// Anchored to the button that opened it; backdrop tap closes. All three
// actions are per-user and silent — the other participant is never told.
function ConversationMenu({ conv, archived, anchor, onClose, onChanged }: {
  conv: ConversationSummary
  archived: boolean
  anchor: { x: number; y: number }
  onClose: () => void
  onChanged: (conversationId: string) => void
}) {
  const archive = useArchiveConversation()
  const unarchive = useUnarchiveConversation()
  const del = useDeleteConversation()
  const blockMember = useBlockMember()
  const unblockMember = useUnblockMember()
  const { data: blocked } = useBlockedMembers()
  const isBlocked = (blocked ?? []).some(b => b.id === conv.otherUser.id)
  const name = conv.otherUser.name || 'this member'

  const menuWidth = 224
  const left = Math.max(8, Math.min(anchor.x - menuWidth + 36, window.innerWidth - menuWidth - 8))
  const top = Math.min(anchor.y + 6, window.innerHeight - 200)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 600 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        position: 'fixed', left, top, width: menuWidth,
        backgroundColor: 'var(--color-card)', borderRadius: '12px',
        border: '1px solid var(--color-border)', boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        overflow: 'hidden', zIndex: 601,
      }}>
        <button style={menuItemStyle} onClick={() => {
          ;(archived ? unarchive : archive).mutate(conv.id)
          onChanged(conv.id)
          onClose()
        }}>
          {archived ? '📂 Unarchive' : '📁 Archive'}
        </button>
        <button style={menuItemStyle} onClick={() => {
          if (window.confirm(`Delete this conversation with ${name}? This only removes it for you.`)) del.mutate(conv.id)
          onChanged(conv.id)
          onClose()
        }}>🗑 Delete conversation</button>
        <button style={{ ...menuItemStyle, color: 'var(--color-red-text)' }} onClick={() => {
          if (isBlocked) {
            unblockMember.mutate(conv.otherUser.id)
          } else if (window.confirm(`Block ${name}? You will no longer see their posts, comments, or messages.`)) {
            blockMember.mutate(conv.otherUser.id)
          }
          onChanged(conv.id)
          onClose()
        }}>{isBlocked ? '✓ Unblock' : '🚫 Block'} {name}</button>
      </div>
    </div>
  )
}

function ConversationList({ conversations, archived, loading, activeId, onSelect, onMenu }: {
  conversations: ConversationSummary[]
  archived: boolean
  loading: boolean
  activeId: string | null
  onSelect: (conv: ConversationSummary) => void
  onMenu: (conv: ConversationSummary, anchor: { x: number; y: number }) => void
}) {
  if (loading) {
    return <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-3)', fontSize: '13px' }}>Loading…</div>
  }
  if (conversations.length === 0) {
    return (
      <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--color-text-3)', fontSize: '13px', lineHeight: 1.6 }}>
        {archived ? 'No archived conversations.' : 'No conversations yet. Tap New conversation to find a member.'}
      </div>
    )
  }
  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      {conversations.map(conv => (
        <div key={conv.id} onClick={() => onSelect(conv)} style={{
          display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px 8px 12px 16px',
          borderBottom: '1px solid var(--color-border-light)', cursor: 'pointer', textAlign: 'left',
          fontFamily: 'var(--font-sans)', backgroundColor: activeId === conv.id ? 'var(--color-hover)' : 'transparent',
        }}>
          <Avatar name={conv.otherUser.name} avatarUrl={conv.otherUser.avatarUrl} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
              <span style={{ fontSize: '14px', fontWeight: conv.unreadCount > 0 ? 800 : 700, color: 'var(--color-text-1)' }}>{conv.otherUser.name || 'Member'}</span>
              {conv.lastMessage && <span style={{ fontSize: '11px', color: 'var(--color-text-3)', flexShrink: 0 }}>{timeAgo(conv.lastMessage.createdAt)}</span>}
            </div>
            <div style={{
              fontSize: '12px', color: conv.unreadCount > 0 ? 'var(--color-text-1)' : 'var(--color-text-3)',
              fontWeight: conv.unreadCount > 0 ? 700 : 400,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{conv.lastMessage?.text ?? 'Say hello…'}</div>
          </div>
          {conv.unreadCount > 0 && !archived && (
            <div style={{
              minWidth: '18px', height: '18px', borderRadius: '9px', padding: '0 5px', flexShrink: 0,
              backgroundColor: 'var(--color-gold)', color: '#fff', fontSize: '11px', fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{conv.unreadCount}</div>
          )}
          <button
            aria-label="Conversation actions"
            onClick={e => {
              e.stopPropagation()
              const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
              onMenu(conv, { x: r.right, y: r.bottom })
            }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', fontSize: '18px', padding: '6px 8px', flexShrink: 0, lineHeight: 1 }}
          >⋯</button>
        </div>
      ))}
    </div>
  )
}

function Thread({ conversation, onBack, onMenu }: {
  conversation: ConversationSummary
  onBack: () => void
  onMenu: (conv: ConversationSummary, anchor: { x: number; y: number }) => void
}) {
  useSwipeBack(onBack)
  const { currentUser } = useAuth()
  const { data: messages, isLoading } = useConversationMessages(conversation.id)
  const sendMessage = useSendMessage()
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const targetRef = useRef<HTMLDivElement>(null)
  const targetMessageId = useUIStore(s => s.messageTargetMessageId)
  const scrolledTarget = useRef<string | null>(null)

  useEffect(() => {
    if (targetMessageId && targetRef.current) {
      if (scrolledTarget.current !== targetMessageId) {
        targetRef.current.scrollIntoView({ block: 'center' })
        scrolledTarget.current = targetMessageId
      }
      return
    }
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages?.length, targetMessageId])

  function handleSend() {
    if (!text.trim() || sendMessage.isPending) return
    hapticSuccess()
    sendMessage.mutate({ conversationId: conversation.id, text: text.trim() }, {
      onSuccess: () => setText(''),
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
        <button onClick={onBack} className="messages-back-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-2)', fontSize: '18px', padding: '2px 4px' }}>←</button>
        <Avatar name={conversation.otherUser.name} avatarUrl={conversation.otherUser.avatarUrl} size={32} />
        <span style={{ flex: 1, fontSize: '14px', fontWeight: 700, color: 'var(--color-text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conversation.otherUser.name || 'Member'}</span>
        <button
          aria-label="Conversation actions"
          onClick={e => {
            const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
            onMenu(conversation, { x: r.right, y: r.bottom })
          }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', fontSize: '18px', padding: '4px 8px', lineHeight: 1 }}
        >⋯</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {isLoading && <div style={{ textAlign: 'center', color: 'var(--color-text-3)', fontSize: '13px' }}>Loading…</div>}
        {!isLoading && (messages ?? []).length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--color-text-3)', fontSize: '13px', padding: '20px' }}>No messages yet. Say hello!</div>
        )}
        {(messages ?? []).map(m => {
          const mine = m.senderId === currentUser?.id
          return (
            <div key={m.id} ref={m.id === targetMessageId ? targetRef : undefined} style={{ outline: m.id === targetMessageId ? '2px solid var(--color-gold)' : undefined, outlineOffset: '3px', borderRadius: '14px', display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '75%', padding: '8px 12px', borderRadius: '14px',
                backgroundColor: mine ? 'var(--color-navy)' : 'var(--color-surface)',
                color: mine ? '#fff' : 'var(--color-text-1)',
                fontSize: '14px', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>{m.text}</div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: 'flex', gap: '8px', padding: '12px 16px', borderTop: '1px solid var(--color-border)' }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Write a message…"
          style={{
            flex: 1, padding: '9px 14px', borderRadius: '20px', border: '1px solid var(--color-border)',
            fontSize: '14px', fontFamily: 'var(--font-sans)', color: 'var(--color-text-1)',
            backgroundColor: 'var(--color-surface)', outline: 'none',
          }}
        />
        <button onClick={handleSend} disabled={!text.trim() || sendMessage.isPending} style={{
          padding: '9px 18px', borderRadius: '20px', border: 'none',
          backgroundColor: text.trim() ? 'var(--color-navy)' : 'var(--color-border)',
          color: text.trim() ? '#fff' : 'var(--color-text-3)',
          fontSize: '13px', fontWeight: 700, cursor: text.trim() ? 'pointer' : 'default', fontFamily: 'var(--font-sans)',
        }}>Send</button>
      </div>
    </div>
  )
}

interface ConversationMember { id: string; name: string; church?: string; title?: string; avatarUrl?: string }

function NewConversationPicker({ onSelect, onCancel, busy }: {
  onSelect: (id: string) => void
  onCancel: () => void
  busy: boolean
}) {
  const { currentUser } = useAuth()
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const members = useQuery({
    queryKey: ['conversation-members', currentUser?.id],
    queryFn: () => api<ConversationMember[]>('/members'),
  })
  const blocked = useBlockedMembers()
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    inputRef.current?.focus()
    return () => { if (previous?.isConnected) previous.focus() }
  }, [])
  const blockedIds = new Set((blocked.data ?? []).map(member => member.id))
  const query = search.trim().toLowerCase()
  const matches = (members.data ?? []).filter(member => member.id !== currentUser?.id && !blockedIds.has(member.id) &&
    [member.name, member.church, member.title].some(value => value?.toLowerCase().includes(query)))
  const loading = members.isPending || blocked.isPending
  const error = members.isError || blocked.isError
  return <section aria-labelledby="new-conversation-title" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, color: 'var(--color-text-1)' }}>
    <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h2 id="new-conversation-title" style={{ margin: '0 0 12px', fontSize: 17 }}>New conversation</h2>
        <button type="button" disabled={busy} onClick={onCancel} style={{ ...menuItemStyle, width: 'auto' }}>Cancel</button>
      </div>
      <label htmlFor="conversation-member-search" style={{ display: 'block', fontSize: 13, marginBottom: 8 }}>Find a member</label>
      <input ref={inputRef} id="conversation-member-search" type="search" autoComplete="off" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by name, church, or title" style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-1)', fontSize: 16 }} />
    </div>
    <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, overscrollBehavior: 'contain' }}>
      {loading && <p role="status" style={{ padding: 16 }}>Loading members…</p>}
      {error && <p role="alert" style={{ padding: 16 }}>Unable to load members. <button onClick={() => { void members.refetch(); void blocked.refetch() }}>Retry</button></p>}
      {!loading && !error && !matches.length && <p style={{ padding: 16 }}>{query ? 'No members match your search.' : 'No members available to message.'}</p>}
      {!loading && !error && matches.slice(0, 30).map(member => <button type="button" key={member.id} disabled={busy} onClick={() => onSelect(member.id)} style={{ ...menuItemStyle, padding: '14px 16px', borderBottom: '1px solid var(--color-border)', opacity: busy ? 0.6 : 1 }}>
        <Avatar name={member.name} avatarUrl={member.avatarUrl} />
        <span style={{ minWidth: 0 }}><strong style={{ display: 'block', overflowWrap: 'anywhere' }}>{member.name || 'Member'}</strong><span style={{ display: 'block', color: 'var(--color-text-2)', fontSize: 12, marginTop: 4 }}>{[member.title, member.church].filter(Boolean).join(' · ')}</span></span>
      </button>)}
      {!loading && !error && matches.length > 30 && <p style={{ padding: 16 }}>Showing the first 30 members. Refine your search to find someone.</p>}
      {busy && <p role="status" style={{ padding: 16 }}>Opening conversation…</p>}
    </div>
  </section>
}

export default function MessagesPanel() {
  const { data: settings } = useNetworkSettings()
  const [groupMode, setGroupMode] = useState(false)
  const [groupTarget, setGroupTarget] = useState('')
  const groupMessageId = useUIStore(s => s.messageTargetMessageId)
  const closeMessages = useUIStore(s => s.closeMessages)
  const messageTargetUserId = useUIStore(s => s.messageTargetUserId)
  const { data: conversations, isLoading } = useConversations()
  const { data: archivedConversations, isLoading: archivedLoading } = useArchivedConversations()
  const startConversation = useStartConversation()
  const [activeConv, setActiveConv] = useState<ConversationSummary | null>(null)
  const [tab, setTab] = useState<'inbox' | 'archived'>('inbox')
  const [choosingMember, setChoosingMember] = useState(false)
  const [menu, setMenu] = useState<{ conv: ConversationSummary; archived: boolean; anchor: { x: number; y: number } } | null>(null)

  // When opened with a specific target user, find or create that conversation.
  useEffect(() => {
    if (messageTargetUserId?.startsWith('group:')) { setGroupTarget(messageTargetUserId.slice(6)); setGroupMode(true); useUIStore.setState({ messageTargetUserId: null }); return }
    if (!messageTargetUserId || isLoading || archivedLoading) return
    setGroupMode(false)
    const existing = [...(conversations ?? []), ...(archivedConversations ?? [])].find(c => c.otherUser.id === messageTargetUserId)
    if (existing) {
      setActiveConv(existing)
      setChoosingMember(false)
      setTab((archivedConversations ?? []).some(c => c.id === existing.id) ? 'archived' : 'inbox')
      useUIStore.setState({ messageTargetUserId: null })
    } else if (!startConversation.isPending) {
      startConversation.mutate(messageTargetUserId, {
        onSuccess: conv => { setActiveConv(conv); setChoosingMember(false); setTab('inbox'); useUIStore.setState({ messageTargetUserId: null }) },
        onError: () => useUIStore.setState({ messageTargetUserId: null }),
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageTargetUserId, conversations, archivedConversations, isLoading, archivedLoading])

  const list = tab === 'inbox' ? conversations ?? [] : archivedConversations ?? []
  const loading = tab === 'inbox' ? isLoading : archivedLoading

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) closeMessages() }}
      style={{ position: 'fixed', inset: 0, zIndex: 400, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'flex-end' }}
    >
      <div className="messages-panel" style={{
        width: '760px', maxWidth: '100vw', height: '100vh', backgroundColor: 'var(--color-card)',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
          {/* Which of these two shows is a breakpoint decision made in CSS — see
              .messages-home-btn / .messages-close-btn. Both do the same thing;
              full-screen on a phone wants the labelled way out, the desktop
              slide-over wants the usual dismiss. */}
          <button onClick={closeMessages} className="messages-home-btn" style={{
            background: 'none', border: 'none', cursor: 'pointer', alignItems: 'center', gap: '5px',
            color: 'var(--color-navy-text)', fontSize: '14px', fontWeight: 700, padding: '4px 2px',
            fontFamily: 'var(--font-sans)',
          }}>← Home</button>
          <div style={{ flex: 1, fontSize: '17px', fontWeight: 800, color: 'var(--color-text-1)' }}>Messages</div>
          {settings?.groupMessagesEnabled === 1 && <button type="button" style={{ padding: 9, background: 'var(--color-surface)', color: 'var(--color-text-1)', border: '1px solid var(--color-border)', borderRadius: 8 }} onClick={() => {setGroupTarget('');setGroupMode(true);setChoosingMember(false)}}>Group chats</button>}
          <button type="button" className="messages-new-conversation" aria-label="New conversation" title="New conversation" disabled={choosingMember || startConversation.isPending} onClick={() => { startConversation.reset(); setMenu(null); setGroupMode(false); setChoosingMember(true) }} style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-navy-text)', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}><span aria-hidden="true" style={{ fontSize: 18 }}>✎</span><span className="messages-new-conversation-label">New conversation</span></button>
          <button onClick={closeMessages} className="messages-close-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', fontSize: '20px', lineHeight: 1, padding: '4px' }}>✕</button>
        </div>
        {startConversation.isError && <p role="alert" style={{ padding: '0 16px', color: 'var(--color-red-text)', fontSize: 13 }}>Unable to open this conversation. It may no longer be available.</p>}
        {groupMode && (settings?.groupMessagesEnabled === 1 ? <GroupMessages initialId={groupTarget} initialMessage={groupMessageId ?? undefined} onBack={() => setGroupMode(false)} /> : <div style={{ padding: 20 }}><p>Group messaging is currently disabled.</p><button onClick={() => setGroupMode(false)}>Back to messages</button></div>)}
        {!groupMode && choosingMember && <NewConversationPicker busy={startConversation.isPending || !!messageTargetUserId} onCancel={() => { setChoosingMember(false); startConversation.reset() }} onSelect={id => { startConversation.reset(); useUIStore.setState({ messageTargetUserId: id, messageTargetMessageId: null }) }} />}<div className="messages-body" data-active={activeConv ? 'true' : 'false'} style={{ display: choosingMember || groupMode ? 'none' : 'flex', flex: 1, minHeight: 0 }}>
          {/* width/flex-shrink/display all live in CSS (base + mobile override),
              not here — an inline width or display would always beat the
              mobile class rules that expand this pane full-width and hide it
              once a conversation is open. */}
          <div className="messages-list-pane" style={{ borderRight: '1px solid var(--color-border)', flexDirection: 'column' }}>
            {/* Inbox / Archived toggle */}
            <div style={{ display: 'flex', gap: '6px', padding: '10px 16px 6px' }}>
              {(['inbox', 'archived'] as const).map(t => (
                <button key={t} onClick={() => { setTab(t); setActiveConv(null) }} style={{
                  flex: 1, padding: '7px 0', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-sans)',
                  backgroundColor: tab === t ? 'var(--color-navy)' : 'transparent',
                  color: tab === t ? '#fff' : 'var(--color-text-2)',
                  transition: 'all 0.15s',
                }}>{t === 'inbox' ? 'Inbox' : 'Archived'}</button>
              ))}
            </div>
            <ConversationList
              conversations={list}
              archived={tab === 'archived'}
              loading={loading}
              activeId={activeConv?.id ?? null}
              onSelect={conv => { if (conv.kind === 'group') { setGroupTarget(conv.id.slice(6)); setGroupMode(true) } else setActiveConv(conv) }}
              onMenu={(conv, anchor) => { if (conv.kind === 'group') { setGroupTarget(conv.id.slice(6)); setGroupMode(true) } else setMenu({ conv, archived: tab === 'archived', anchor }) }}
            />
          </div>
          <div className="messages-thread-pane" style={{ flex: 1, flexDirection: 'column', minWidth: 0 }}>
            {activeConv
              ? <Thread key={activeConv.id} conversation={activeConv} onBack={() => setActiveConv(null)} onMenu={(conv, anchor) => setMenu({ conv, archived: tab === 'archived', anchor })} />
              : <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)', fontSize: '14px' }}>Select a conversation</div>
            }
          </div>
        </div>
      </div>
      {menu && (
        <ConversationMenu
          conv={menu.conv}
          archived={menu.archived}
          anchor={menu.anchor}
          onClose={() => setMenu(null)}
          onChanged={id => { if (activeConv?.id === id) setActiveConv(null) }}
        />
      )}
    </div>
  )
}