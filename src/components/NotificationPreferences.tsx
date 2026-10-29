import { useNetworkSettings } from '../api-client/features'
import { useSupabaseRole } from '../contexts/SupabaseRoleContext'
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "../api-client/server"
import { useAuth } from "../providers/AuthProvider"
type Preferences = {
  group_messages: boolean
  messages: boolean
  ministry_events: boolean
  moderation: boolean
}
export default function NotificationPreferences() {
  const { data: settings } = useNetworkSettings()
  const { role } = useSupabaseRole()
  const { currentUser } = useAuth(),
    qc = useQueryClient(),
    key = ["notification-preferences", currentUser?.id]
  const query = useQuery({
    queryKey: key,
    queryFn: () => api<Preferences>("/me/notification-preferences"),
  })
  const save = useMutation({
    mutationFn: (value: Preferences) =>
      api<Preferences>("/me/notification-preferences", {
        method: "PUT",
        body: JSON.stringify(value),
      }),
    onSuccess: (data) => qc.setQueryData(key, data),
  })
  return (
    <section className="member-tool-section">
      <h2>Notification preferences</h2>
      <p>
        Choose which push notifications you receive. Your device must also allow
        notifications.
      </p>
      {query.isPending && <p role="status">Loading preferences…</p>}
      {query.isError && (
        <p role="alert">
          Unable to load preferences.{" "}
          <button onClick={() => query.refetch()}>Retry</button>
        </p>
      )}
      {query.data &&
        ([
          ["messages", "Direct messages"],
          ...(settings?.groupMessagesEnabled === 1 ? [["group_messages", "Group messages"]] : []),
          ["ministry_events", "New ministry events"],
          ...(["admin", "superadmin", "moderator"].includes(role)
            ? [["moderation", "Moderation reports"]]
            : []),
        ] as [keyof Preferences, string][]).map(([k, label]) => (
          <label key={k} style={{ display: "block", margin: "16px 0" }}>
            <input
              type="checkbox"
              checked={query.data[k]}
              disabled={save.isPending}
              onChange={(e) =>
                save.mutate({ ...query.data!, [k]: e.target.checked })
              }
            />{" "}
            {label}
          </label>
        ))}
      {save.isError && (
        <p role="alert">Unable to save your preferences. Please retry.</p>
      )}
      {save.isSuccess && <p role="status">Preferences saved.</p>}
      <p>Replies and reactions do not currently send push notifications.</p>
    </section>
  )
}
