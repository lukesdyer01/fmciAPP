import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "../api-client/server"
import { useAuth } from "../providers/AuthProvider"
type Preferences = {
  enabled: boolean
  messages: boolean
  mentions: boolean
  wall: boolean
  replies: boolean
}
export default function EmailPreferences() {
  const { currentUser } = useAuth()
  const qc = useQueryClient()
  const key = ["email-preferences", currentUser?.id]
  const query = useQuery({
    queryKey: key,
    queryFn: () => api<Preferences>("/me/email-preferences"),
  })
  const save = useMutation({
    mutationFn: (value: Preferences) =>
      api<Preferences>("/me/email-preferences", {
        method: "PUT",
        body: JSON.stringify(value),
      }),
    onSuccess: (data) => qc.setQueryData(key, data),
  })
  return (
    <section className="member-tool-section">
      <h2>Email notifications</h2>
      <p>
        Receive email reminders for unread activity. We wait a few minutes so
        activity you already viewed won’t generate an email. Private message
        text stays in the app.
      </p>
      {query.isPending && <p role="status">Loading email preferences…</p>}
      {query.isError && (
        <p role="alert">
          Unable to load email preferences.{" "}
          <button onClick={() => query.refetch()}>Retry</button>
        </p>
      )}
      {query.data &&
        ([
          ["enabled", "Receive notification emails"],
          ["messages", "Unread direct and group messages"],
          ["mentions", "Tags in posts"],
          ["wall", "Posts and comments on my wall or posts"],
          ["replies", "Replies to my comments"],
        ] as [keyof Preferences, string][]).map(([field, label]) => (
          <label
            key={field}
            style={{
              display: "block",
              margin: "16px 0",
              opacity: field !== "enabled" && !query.data!.enabled ? 0.6 : 1,
            }}
          >
            <input
              type="checkbox"
              checked={query.data![field]}
              disabled={
                save.isPending || (field !== "enabled" && !query.data!.enabled)
              }
              onChange={(e) =>
                save.mutate({ ...query.data!, [field]: e.target.checked })
              }
            />{" "}
            {label}
          </label>
        ))}
      {save.isError && (
        <p role="alert">Unable to save email preferences. Please retry.</p>
      )}
      {save.isSuccess && <p role="status">Email preferences saved.</p>}
      <p>
        Every notification email includes an unsubscribe link. Turning email off
        does not affect in-app notifications or device push preferences.
      </p>
    </section>
  )
}
