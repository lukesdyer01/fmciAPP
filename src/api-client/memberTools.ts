import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "./server"
import { useAuth } from "../providers/AuthProvider"
export type SavedItem = {
  kind: "post" | "resource"
  item_id: string
  created_at: string
}
export function useSavedItems() {
  const { currentUser } = useAuth()
  return useQuery({
    queryKey: ["saved-items", currentUser?.id],
    queryFn: () => api<SavedItem[]>("/me/saved"),
    enabled: !!currentUser,
  })
}
export function useSaveItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      kind,
      id,
      saved,
    }: {
      kind: "post" | "resource"
      id: string
      saved: boolean
    }) =>
      api(`/me/saved/${kind}/${encodeURIComponent(id)}`, {
        method: saved ? "DELETE" : "PUT",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-items"] }),
  })
}
