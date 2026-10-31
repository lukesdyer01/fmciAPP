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
}: {
  value: Reaction | null
  onChange: (value: Reaction | null) => void
  disabled?: boolean
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
  const selected = choices.find((c) => c.type === value)
  return (
    <div ref={control} className="reaction-control">
      <button
        disabled={disabled}
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
        {selected?.icon ?? "✝️"} {selected?.label ?? "Amen"}
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
          {choices.map((c) => (
            <button
              key={c.type}
              disabled={disabled}
              aria-pressed={value === c.type}
              onClick={() => {
                onChange(value === c.type ? null : c.type)
                setOpen(false)
              }}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
