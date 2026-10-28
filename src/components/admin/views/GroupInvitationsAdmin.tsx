import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "../../../api-client/server"
type Invite = {
  token_hash: string
  label: string
  expires_at: string
  signup_count: number
  revoked_at: string | null
}
export default function GroupInvitationsAdmin() {
  const qc = useQueryClient(),
    query = useQuery({
      queryKey: ["group-invitations"],
      queryFn: () => api<Invite[]>("/admin/invitations/open"),
    })
  const revoke = useMutation({
    mutationFn: (hash: string) =>
      api(`/admin/invitations/open/${hash}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group-invitations"] }),
  })
  return (
    <section style={{ marginTop: 24 }}>
      <h3>Group invitation activity</h3>
      <p>
        Signup counts start when tracking is enabled. Revocation stops new
        registrations and keeps existing accounts.
      </p>
      {query.isPending && <p>Loading invitations…</p>}
      {query.isError && (
        <p role="alert">
          Unable to load invitations.{" "}
          <button onClick={() => query.refetch()}>Retry</button>
        </p>
      )}
      {revoke.isError && (
        <p role="alert">Unable to revoke invitation. Please retry.</p>
      )}
      {query.data?.map((row) => (
        <div
          key={row.token_hash}
          style={{ padding: "14px 0", borderBottom: "1px solid #596477" }}
        >
          <strong>{row.label}</strong>
          <p>
            {row.signup_count} signups · Expires{" "}
            {new Date(row.expires_at).toLocaleString()}
          </p>
          {row.revoked_at ? (
            <span>Revoked</span>
          ) : new Date(row.expires_at).getTime() < Date.now() ? (
            <span>Expired</span>
          ) : (
            <button
              disabled={revoke.isPending}
              onClick={() => revoke.mutate(row.token_hash)}
            >
              Revoke invitation
            </button>
          )}
        </div>
      ))}
    </section>
  )
}
