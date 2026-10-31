import { useEffect, useRef, useState } from "react"
import { useOpenProfile } from "./ProfileView"
import type { FeedComment, CommentReaction } from "../api-client/comments"
const commentReactions = [{type:"amen",icon:"✝️",label:"Amen"},{type:"pray",icon:"🙏",label:"Pray"},{type:"heart",icon:"❤️",label:"Love"},{type:"praise",icon:"🙌",label:"Praise"}] as const
const emojis = [
  "😀",
  "😂",
  "🥰",
  "🙏",
  "❤️",
  "👏",
  "🎉",
  "✨",
  "🙌",
  "👍",
  "😢",
  "🔥",
]
export default function CommentThread({
  comments,
  highlightedCommentId,
  onSubmit,
  onDelete,
  submitting,
  currentUserId,
  isAdmin,
  onReport,
  onReact,
  autoFocus = false,
  onNavigate,
}: {
  comments: FeedComment[]
  highlightedCommentId?: string | null
  onSubmit: (text: string, parentId?: string | null) => void | Promise<unknown>
  onDelete: (id: string) => void | Promise<unknown>
  submitting: boolean
  currentUserId?: string
  isAdmin: boolean
  onReport?: (comment: FeedComment) => void
  onReact?: (
    comment: FeedComment,
    reaction: CommentReaction | null,
  ) => Promise<unknown>
  autoFocus?: boolean
  onNavigate?: () => void
}) {
  const [text, setText] = useState(""),
    [reply, setReply] = useState<FeedComment | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [emoji, setEmoji] = useState(false),
    [limit, setLimit] = useState(20),
    [expanded, setExpanded] = useState<Set<string>>(new Set()),
    [newest, setNewest] = useState(false),
    [reacting, setReacting] = useState<string | null>(null),
    [replyLimits, setReplyLimits] = useState<Record<string, number>>({})
  const input = useRef<HTMLTextAreaElement>(null),
    openProfile = useOpenProfile()
  useEffect(()=>{
    if(!highlightedCommentId)return
    const target=comments.find(cm=>cm.id===highlightedCommentId)
    if(target?.parentId)setExpanded(old=>new Set([...old,target.parentId!]))
    setLimit(comments.length)
    setReplyLimits(old=>({...old,...Object.fromEntries(comments.filter(cm=>!cm.parentId).map(cm=>[cm.id,comments.length]))}))
  },[highlightedCommentId,comments])
  useEffect(()=>{if(highlightedCommentId)highlight.current?.scrollIntoView({block:"center"})},[highlightedCommentId,expanded,limit])
  const highlight=useRef<HTMLDivElement>(null)
  async function submit() {
    if (!text.trim() || busy || submitting) return
    setBusy(true)
    setError("")
    try {
      await onSubmit(text.trim(), reply?.id)
      setText("")
      setReply(null)
      setEmoji(false)
    } catch {
      setError("Unable to post. Your draft is saved here; try again.")
    } finally {
      setBusy(false)
    }
  }
  const ids = new Set(comments.map((c) => c.id))
  const roots = comments
    .filter((c) => !onReact || !c.parentId || !ids.has(c.parentId))
    .sort(
      (a, b) =>
        (newest ? -1 : 1) * (Date.parse(a.createdAt) - Date.parse(b.createdAt)),
    )
  function renderComment(cm: FeedComment) {
    return (
      <div ref={cm.id===highlightedCommentId?highlight:undefined} className="thread-comment" key={cm.id} style={cm.id===highlightedCommentId?{outline:"2px solid var(--color-gold)",borderRadius:12}:undefined}>
        <button
          className="comment-avatar"
          aria-label={`View ${cm.authorName}'s profile`}
          onClick={() => {
            onNavigate?.()
            openProfile(cm.authorId)
          }}
        >
          {cm.authorAvatarUrl ? (
            <img src={cm.authorAvatarUrl} alt="" />
          ) : (
            (cm.authorName || "?").slice(0, 2)
          )}
        </button>
        <div className="comment-detail">
          <div className="comment-bubble">
            <button
              className="comment-name"
              onClick={() => {
                onNavigate?.()
                openProfile(cm.authorId)
              }}
            >
              {cm.authorName}
            </button>
            {cm.replyToId &&
              cm.replyToId !== cm.parentId &&
              comments.find((c) => c.id === cm.replyToId) && (
                <small>
                  Replying to{" "}
                  {comments.find((c) => c.id === cm.replyToId)?.authorName}
                </small>
              )}
            <p>{cm.text}</p>
          </div>
          <div className="comment-tools">
            <time dateTime={cm.createdAt}>
              {new Date(cm.createdAt).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </time>
            {onReact && (
              <>
                <div className="comment-reaction-icons" role="group" aria-label="Comment reactions">
                  {commentReactions.map(choice=><button key={choice.type} type="button" title={choice.label} aria-label={choice.label} aria-pressed={cm.myReaction===choice.type} disabled={reacting!==null} onClick={()=>{
                    setError("");setReacting(cm.id)
                    void onReact(cm,cm.myReaction===choice.type?null:choice.type).catch(()=>setError("Unable to save reaction. Please try again.")).finally(()=>setReacting(null))
                  }}><span aria-hidden="true">{choice.icon}</span></button>)}
                </div>
                <button
                  onClick={() => {
                    setReply(cm)
                    input.current?.focus()
                  }}
                >
                  Reply
                </button>
              </>
            )}
            {onReport && cm.authorId !== currentUserId && (
              <button aria-label="Report comment" onClick={() => onReport(cm)}>
                Report
              </button>
            )}
            {currentUserId && (cm.authorId === currentUserId || isAdmin) && (
              <button
                aria-label="Delete comment"
                onClick={() => {
                  setError("")
                  Promise.resolve(onDelete(cm.id)).catch(() =>
                    setError("Unable to delete comment. Please try again."),
                  )
                }}
              >
                Delete
              </button>
            )}
          </div>
          {cm.reactions && Object.values(cm.reactions).some(Boolean) && (
            <div className="comment-totals">
              {cm.reactions.amen > 0 && `✝️ ${cm.reactions.amen} `}
              {cm.reactions.pray > 0 && `🙏 ${cm.reactions.pray} `}
              {cm.reactions.heart > 0 && `❤️ ${cm.reactions.heart} `}
              {(cm.reactions.praise ?? 0) > 0 && `🙌 ${cm.reactions.praise}`}
            </div>
          )}
        </div>
      </div>
    )
  }
  return (
    <div className="comment-thread">
      <div className="thread-scroll">
        {onReact && (
          <label className="thread-sort">
            Comments{" "}
            <select
              value={newest ? "new" : "old"}
              onChange={(e) => {
                setNewest(e.target.value === "new")
                setLimit(20)
              }}
            >
              <option value="old">Oldest first</option>
              <option value="new">Newest first</option>
            </select>
          </label>
        )}
        {!comments.length && (
          <p className="thread-empty">Be the first to comment.</p>
        )}
        {roots.slice(0, limit).map((cm) => {
          const replies = onReact
            ? comments.filter((r) => r.parentId === cm.id)
            : []
          return (
            <div key={cm.id}>
              {renderComment(cm)}
              {replies.length > 0 && (
                <div className="thread-replies">
                  <button
                    className="thread-reveal"
                    aria-expanded={expanded.has(cm.id)}
                    onClick={() =>
                      setExpanded((old) => {
                        const next = new Set(old)
                        next.has(cm.id) ? next.delete(cm.id) : next.add(cm.id)
                        return next
                      })
                    }
                  >
                    {expanded.has(cm.id) ? "Hide" : `View ${replies.length}`}{" "}
                    replies
                  </button>
                  {expanded.has(cm.id) && (
                    <>
                      {replies
                        .slice(0, replyLimits[cm.id] ?? 3)
                        .map(renderComment)}
                      {replies.length > (replyLimits[cm.id] ?? 3) && (
                        <button
                          className="thread-reveal"
                          onClick={() =>
                            setReplyLimits((old) => ({
                              ...old,
                              [cm.id]: (old[cm.id] ?? 3) + 10,
                            }))
                          }
                        >
                          View more replies
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {roots.length > limit && (
          <button
            className="thread-reveal"
            onClick={() => setLimit(limit + 20)}
          >
            View more comments
          </button>
        )}
      </div>
      <div className="thread-compose">
        {reply && (
          <div className="reply-banner">
            Replying to {reply.authorName}
            <button
              disabled={busy}
              aria-label="Cancel reply"
              onClick={() => setReply(null)}
            >
              ✕
            </button>
          </div>
        )}
        {error && <p role="alert">{error}</p>}
        {emoji && (
          <div className="comment-emojis" aria-label="Choose emoji">
            {emojis.map((e) => (
              <button
                key={e}
                disabled={busy}
                onClick={() => {
                  const field = input.current,
                    start = field?.selectionStart ?? text.length,
                    end = field?.selectionEnd ?? start
                  setText(text.slice(0, start) + e + text.slice(end))
                  requestAnimationFrame(() => {
                    field?.focus()
                    field?.setSelectionRange(start + e.length, start + e.length)
                  })
                }}
              >
                {e}
              </button>
            ))}
          </div>
        )}
        <div className="comment-composer">
          <textarea
            ref={input}
            autoFocus={autoFocus}
            aria-label={reply ? "Write a reply" : "Write a comment"}
            placeholder={reply ? "Write a reply…" : "Write a comment…"}
            maxLength={4000}
            rows={2}
            value={text}
            disabled={busy || submitting}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                void submit()
              }
            }}
          />
          <button
            disabled={busy}
            aria-label="Choose emoji"
            aria-expanded={emoji}
            onClick={() => setEmoji(!emoji)}
          >
            ☺
          </button>
          <button
            disabled={!text.trim() || busy || submitting}
            onClick={() => void submit()}
          >
            {busy || submitting ? "Posting…" : "Post"}
          </button>
        </div>
      </div>
    </div>
  )
}
