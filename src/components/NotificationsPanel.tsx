import { useState, useEffect, useRef } from "react"
import {
  useNotifications,
  useReadNotification,
  useClearNotifications,
  type ReactionNotification,
} from "../api-client/notifications"
import PostCard from "./PostCard"
import { useConversations } from "../api-client/messages"
// Bell dropdown shows activity and unread conversations; preferences live in Settings.

import { useUIStore } from "../store/ui"

export default function NotificationsPanel() {
  const conversations = useConversations()
  const unreadMessages = (conversations.data ?? []).filter(
    (c) => c.unreadCount > 0,
  )
  const notifications = useNotifications(),
    read = useReadNotification()
  const clear = useClearNotifications()
  const [selected, setSelected] = useState<ReactionNotification | null>(null)
  const openMessagesWith = useUIStore((s) => s.openMessagesWith)
  const reactions = {
    amen: "✝️ Amen",
    pray: "🙏 Pray",
    heart: "❤️ Love",
    praise: "🙌 Praise",
  }
  const setNotifOpen = useUIStore((s) => s.setNotifOpen)

  const openProfile = useUIStore((s) => s.openProfile)
  const selectNotification = (item: ReactionNotification) => {
    read.mutate(item)
    if (item.kind === "signup" && item.actorId) {
      openProfile(item.actorId)
      setNotifOpen(false)
    } else {
      setSelected(item)
    }
  }

  const emailTargetHandled = useRef(false)
  useEffect(() => {
    if (emailTargetHandled.current || !notifications.data) return
    const url = new URL(window.location.href)
    const target = url.searchParams.get("notification")
    if (!target) return
    emailTargetHandled.current = true
    const item = notifications.data.find((item) => item.id === target)
    if (item) {
      selectNotification(item)
    }
    url.searchParams.delete("notification")
    window.history.replaceState(null, "", url.pathname + url.search + url.hash)
  }, [notifications.data])

  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    panel.current?.focus()
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNotifOpen(false)
        previous?.focus()
      }
    }
    document.addEventListener("keydown", close)
    return () => document.removeEventListener("keydown", close)
  }, [setNotifOpen])

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) setNotifOpen(false)
      }}
      className="notifications-dropdown-backdrop"
    >
      <div
        ref={panel}
        id="notifications-dropdown"
        className="notifications-dropdown"
        role="dialog"
        aria-label="Notifications"
        tabIndex={-1}
      >
        <div className="notifications-dropdown-header">
          <strong>Notifications</strong>
          <button
            aria-label="Close notifications"
            onClick={() => setNotifOpen(false)}
          >
            ✕
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          <section aria-label="Notification activity">
            <div className="notification-activity-heading">
              <h2 style={{ fontSize: 16, margin: 0 }}>Recent activity</h2>
              <button type="button" disabled={clear.isPending || !notifications.data?.length}
                onClick={() => clear.mutate(notifications.data ?? [], {onSuccess: () => setSelected(null)})}>
                {clear.isPending ? 'Clearing…' : 'Clear activity'}
              </button>
            </div>
            {clear.isError && <p role="alert">Unable to clear notifications. Please try again.</p>}
            {notifications.isPending && (
              <p role="status">Loading notifications…</p>
            )}
            {notifications.isError && (
              <p role="alert">
                Unable to load notifications.{" "}
                <button onClick={() => notifications.refetch()}>Retry</button>
              </p>
            )}
            {conversations.isError && (
              <p role="alert">
                Unable to load message notifications.{" "}
                <button onClick={() => conversations.refetch()}>Retry</button>
              </p>
            )}
            {unreadMessages.map((conversation) => (
              <button
                key={conversation.id}
                className="reaction-notification"
                onClick={() => openMessagesWith(conversation.otherUser.id)}
              >
                <span aria-hidden="true">💬</span>
                <span>
                  <strong>{conversation.otherUser.name}</strong>
                  <span className="notification-preview">
                    {conversation.unreadCount} unread{" "}
                    {conversation.unreadCount === 1 ? "message" : "messages"}
                  </span>
                  {conversation.lastMessage && (
                    <time dateTime={conversation.lastMessage.createdAt}>
                      {new Date(
                        conversation.lastMessage.createdAt,
                      ).toLocaleString()}
                    </time>
                  )}
                </span>
                <span className="notification-unread" aria-label="Unread" />
              </button>
            ))}
            {notifications.data?.length === 0 &&
              conversations.isSuccess &&
              unreadMessages.length === 0 && (
                <p>
                  Tags, messages, comments, replies, and reactions will appear
                  here.
                </p>
              )}
            {notifications.data?.map((item) => (
              <div className="notification-dismiss-row" key={item.id}>
              <button
                className="reaction-notification"
                onClick={() => {
                  selectNotification(item)
                }}
              >
                <span aria-hidden="true">
                  {item.kind === "signup" ? "👤" : item.kind && item.kind !== "reaction"
                    ? item.kind === "mention"
                      ? "@"
                      : "💬"
                    : reactions[item.reaction ?? "amen"].split(" ")[0]}
                </span>
                <span>
                  <strong>{item.actorName}</strong>{" "}
                  {item.kind === "signup"
                    ? "signed up for FMCI Network"
                    : item.kind === "mention"
                    ? "tagged you in a post"
                    : item.kind === "wall_post"
                      ? "posted on your wall"
                      : item.kind === "wall_comment"
                        ? "commented on your wall"
                        : item.kind === "reply"
                          ? "replied to your comment"
                          : item.kind === "comment"
                            ? "commented on your post"
                            : `reacted with ${reactions[item.reaction ?? "amen"].split(" ")[1]} to your ${
                                item.commentId ? "comment" : "post"
                              }`}
                  .
                  <span className="notification-preview">
                    {item.preview.slice(0, 140)}
                  </span>
                  <time dateTime={item.createdAt}>
                    {new Date(item.createdAt).toLocaleString()}
                  </time>
                </span>
                {!item.readAt && (
                  <span className="notification-unread" aria-label="Unread" />
                )}
              </button>
              <button type="button" className="notification-dismiss" aria-label={`Dismiss notification from ${item.actorName}`}
                disabled={clear.isPending}
                onClick={() => clear.mutate([item], {onSuccess: () => { if(selected?.id === item.id) setSelected(null) }})}>×</button>
              </div>
            ))}
            {read.isError && (
              <p role="alert">
                Unable to mark notification read. Please try again.
              </p>
            )}
            {selected?.post && (
              <div style={{ margin: "16px 0" }}>
                <button onClick={() => setSelected(null)}>Close post</button>
                <PostCard
                  key={selected.id + selected.createdAt}
                  post={
                    notifications.data?.find((item) => item.id === selected.id)
                      ?.post ?? selected.post
                  }
                  initialCommentId={selected.commentId}
                />
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
