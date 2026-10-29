import { useNetworkSettings } from '../api-client/features'
import { useSavedItems, useSaveItem } from "../api-client/memberTools"
export default function SaveItemButton({
  kind,
  id,
}: {
  kind: "post" | "resource"
  id: string
}) {
  const { data: settings } = useNetworkSettings()
  const visible = kind !== "post" || settings?.savedPostsEnabled === 1
  const items = useSavedItems(visible),
    save = useSaveItem()
  const saved = !!items.data?.some((i) => i.kind === kind && i.item_id === id)
  if (!visible) return null
  return (
    <span>
      <button
        type="button"
        disabled={!items.data || save.isPending}
        aria-pressed={saved}
        onClick={() => save.mutate({ kind, id, saved })}
        style={{
          padding: "7px 12px",
          border: "1px solid var(--color-border)",
          borderRadius: 8,
          background: "var(--color-surface)",
          color: "var(--color-text-1)",
          cursor: "pointer",
        }}
      >
        {saved ? "🔖 Saved" : "+ Save"}
      </button>
      {(items.isError || save.isError) && (
        <span role="alert">
          {" "}
          Unable to save. <button onClick={() => items.refetch()}>Retry</button>
        </span>
      )}
    </span>
  )
}
