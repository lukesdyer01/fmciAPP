import { useEffect, useRef, useState } from "react"
export type Reaction = "amen" | "pray" | "heart"
const choices = [
  { type: "amen", icon: "✝️", label: "Amen" },
  { type: "pray", icon: "🙏", label: "Praying" },
  { type: "heart", icon: "❤️", label: "Bless" },
] as const
export default function ReactionPicker({
  value,
  onChange,
  disabled = false,
  count,
  compact = false,
  allowPraise = false,
}: {
  value: Reaction | "praise" | null
  onChange: (value: Reaction | "praise" | null) => void
  disabled?: boolean
  count?: number
  compact?: boolean
  allowPraise?: boolean
}) {
  const [open, setOpen] = useState(false)
  const control=useRef<HTMLDivElement>(null),toggle=useRef<HTMLButtonElement>(null)
  useEffect(()=>{if(!open)return;const close=(event:PointerEvent)=>{if(!control.current?.contains(event.target as Node))setOpen(false)};document.addEventListener("pointerdown",close);return()=>document.removeEventListener("pointerdown",close)},[open])
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    held = useRef(false)
  function cancelHold() {
    if (timer.current) clearTimeout(timer.current)
  }
  useEffect(() => () => cancelHold(), [])
  const available = allowPraise ? [...choices, { type: "praise" as const, icon: "🙌", label: "Praise" }] : choices
  const selected = available.find((c) => c.type === value)
  return (
    <div ref={control} className="reaction-control">
      <button
        disabled={disabled}
        aria-label={selected ? `Remove ${selected.label} reaction` : "React with Amen"}
        title={selected?.label ?? "Amen · hold for more reactions"}
        aria-pressed={!!value}
        onPointerDown={() => {
          held.current = false
          timer.current = setTimeout(() => {
            held.current = true
            setOpen(true)
          }, 500)
        }}
        onPointerUp={cancelHold}
        onPointerCancel={cancelHold}
        onPointerMove={cancelHold}
        onClick={() => {
          if (!held.current) onChange(value ? null : "amen")
          held.current = false
        }}
      >
        <span className="reaction-main-icon" aria-hidden="true">{selected?.icon ?? "👍"}</span> {compact ? (count ?? selected?.label ?? "Amen") : (selected?.label ?? "Amen")}
      </button>
      <button
        disabled={disabled}
        ref={toggle}
        aria-label="Choose reaction"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        ⌄
      </button>
      {open && (
        <div
          className="reaction-options"
          role="group"
          aria-label="Reactions"
          onKeyDown={(e) => {
            if (e.key === "Escape") {e.stopPropagation();setOpen(false);toggle.current?.focus()}
          }}
        >
          {available.map((c) => (
            <button
              key={c.type}
              disabled={disabled}
              aria-label={c.label}
              title={c.label}
              aria-pressed={value === c.type}
              onClick={() => {
                onChange(value === c.type ? null : c.type)
                setOpen(false)
              }}
            >
              <span aria-hidden="true">{c.icon}</span><small>{c.label}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
