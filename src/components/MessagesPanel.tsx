import { useState, useEffect, useRef } from 'react'
import { useUIStore } from '../store/ui'
import { useAuth } from '../providers/AuthProvider'
import { useConversations, useConversationMessages, useStartConversation, useSendMessage, type ConversationSummary } from '../api-client/messages'

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

function ConversationList({ conversations, loading, activeId, onSelect }: {
  conversations: ConversationSummary[]
  loading: boolean
  activeId: string | null
  onSelect: (conv: ConversationSummary) => void
}) {
  if (loading) {
    return <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-3)', fontSize: '13px' }}>Loading…</div>
  }
  if (conversations.length === 0) {
    return <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--color-text-3)', fontSize: '13px', lineHeight: 1.6 }}>No conversations yet. Start one from a member's profile.</div>
  }
  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      {conversations.map(conv => (
        <button key={conv.id} onClick={() => onSelect(conv)} style={{
          display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px 16px',
          border: 'none', borderBottom: '1px solid var(--color-border-light)', cursor: 'pointer', textAlign: 'left',
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
          {conv.unreadCount > 0 && (
            <div style={{
              minWidth: '18px', height: '18px', borderRadius: '9px', padding: '0 5px', flexShrink: 0,
              backgroundColor: 'var(--color-gold)', color: '#fff', fontSize: '11px', fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{conv.unreadCount}</div>
          )}
        </button>
      ))}
    </div>
  )
}

function Thread({ conversation, onBack }: { conversation: ConversationSummary; onBack: () => void }) {
  const { currentUser } = useAuth()
  const { data: messages, isLoading } = useConversationMessages(conversation.id)
  const sendMessage = useSendMessage()
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages?.length])

  function handleSend() {
    if (!text.trim() || sendMessage.isPending) return
    sendMessage.mutate({ conversationId: conversation.id, text: text.trim() }, {
      onSuccess: () => setText(''),
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
        <button onClick={onBack} className="messages-back-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-2)', fontSize: '18px', padding: '2px 4px' }}>←</button>
        <Avatar name={conversation.otherUser.name} avatarUrl={conversation.otherUser.avatarUrl} size={32} />
        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-1)' }}>{conversation.otherUser.name || 'Member'}</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {isLoading && <div style={{ textAlign: 'center', color: 'var(--color-text-3)', fontSize: '13px' }}>Loading…</div>}
        {!isLoading && (messages ?? []).length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--color-text-3)', fontSize: '13px', padding: '20px' }}>No messages yet. Say hello!</div>
        )}
        {(messages ?? []).map(m => {
          const mine = m.senderId === currentUser?.id
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
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

export default function MessagesPanel() {
  const closeMessages = useUIStore(s => s.closeMessages)
  const messageTargetUserId = useUIStore(s => s.messageTargetUserId)
  const { data: conversations, isLoading } = useConversations()
  const startConversation = useStartConversation()
  const [activeConv, setActiveConv] = useState<ConversationSummary | null>(null)

  // When opened with a specific target user, find or create that conversation.
  useEffect(() => {
    if (!messageTargetUserId) return
    const existing = conversations?.find(c => c.otherUser.id === messageTargetUserId)
    if (existing) {
      setActiveConv(existing)
    } else if (!startConversation.isPending) {
      startConversation.mutate(messageTargetUserId, {
        onSuccess: conv => setActiveConv(conv),
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageTargetUserId, conversations])

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) closeMessages() }}
      style={{ position: 'fixed', inset: 0, zIndex: 400, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'flex-end' }}
    >
      <div className="messages-panel" style={{
        width: '760px', maxWidth: '100vw', height: '100vh', backgroundColor: 'var(--color-card)',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--color-text-1)' }}>Messages</div>
          <button onClick={closeMessages} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', fontSize: '20px', lineHeight: 1, padding: '4px' }}>✕</button>
        </div>
        <div className="messages-body" data-active={activeConv ? 'true' : 'false'} style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* width/flex-shrink/display all live in CSS (base + mobile override),
              not here — an inline width or display would always beat the
              mobile class rules that expand this pane full-width and hide it
              once a conversation is open. */}
          <div className="messages-list-pane" style={{ borderRight: '1px solid var(--color-border)', flexDirection: 'column' }}>
            <ConversationList conversations={conversations ?? []} loading={isLoading} activeId={activeConv?.id ?? null} onSelect={setActiveConv} />
          </div>
          <div className="messages-thread-pane" style={{ flex: 1, flexDirection: 'column', minWidth: 0 }}>
            {activeConv
              ? <Thread conversation={activeConv} onBack={() => setActiveConv(null)} />
              : <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)', fontSize: '14px' }}>Select a conversation</div>
            }
          </div>
        </div>
      </div>
    </div>
  )
}
