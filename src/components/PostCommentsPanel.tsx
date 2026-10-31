import { useEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
export default function PostCommentsPanel({
  children,
  onClose,
  count,
}: {
  children: ReactNode
  onClose: () => void
  count: number
}) {
  const panel = useRef<HTMLDivElement>(null)
  const returnFocus = useRef(document.activeElement as HTMLElement | null)
  const [viewport, setViewport] = useState({
    top: 0,
    height: window.innerHeight,
  })
  useEffect(() => {
    const previous = returnFocus.current,
      overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const update = () =>
      setViewport({
        top: window.visualViewport?.offsetTop ?? 0,
        height: window.visualViewport?.height ?? window.innerHeight,
      })
    update()
    window.visualViewport?.addEventListener("resize", update)
    window.visualViewport?.addEventListener("scroll", update)
    if (!panel.current?.contains(document.activeElement)) panel.current?.focus()
    return () => {
      document.body.style.overflow = overflow
      window.visualViewport?.removeEventListener("resize", update)
      window.visualViewport?.removeEventListener("scroll", update)
      previous?.focus()
    }
  }, [])
  return createPortal(
    <div
      className="comments-backdrop"
      style={{ top: viewport.top, height: viewport.height }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panel}
        className="comments-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Post comments"
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose()
          if (e.key === "Tab") {
            const nodes = panel.current?.querySelectorAll<HTMLElement>(
              "button:not(:disabled),textarea:not(:disabled),select",
            )
            if (!nodes?.length) return
            const first = nodes[0],
              last = nodes[nodes.length - 1]
            if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
              e.preventDefault()
              last.focus()
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault()
              first.focus()
            }
          }
        }}
      >
        <header>
          <strong>Comments · {count}</strong>
          <button aria-label="Close comments" onClick={onClose}>
            ✕
          </button>
        </header>
        {children}
      </div>
    </div>,
    document.body,
  )
}
