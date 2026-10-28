import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "../../../api-client/server"
type Feedback = {
  id: string
  kind: string
  message: string
  device: string
  app_version: string
  page: string
  status: string
  created_at: string
}
export default function BetaFeedbackAdmin() {
  const qc = useQueryClient(),
    query = useQuery({
      queryKey: ["admin-feedback"],
      queryFn: () => api<Feedback[]>("/admin/feedback"),
    })
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api(`/admin/feedback/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-feedback"] }),
  })
  return (
    <div>
      <h2>Beta feedback</h2>
      <p>Latest 200 reports and suggestions.</p>
      {query.isPending && <p>Loading feedback…</p>}
      {query.isError && (
        <p role="alert">
          Unable to load feedback.{" "}
          <button onClick={() => query.refetch()}>Retry</button>
        </p>
      )}
      {update.isError && <p role="alert">Unable to update status.</p>}
      {query.data?.length === 0 && <p>No feedback yet.</p>}
      {query.data?.map((row) => (
        <section
          key={row.id}
          style={{
            padding: 20,
            marginBottom: 16,
            border: "1px solid #596477",
            borderRadius: 10,
          }}
        >
          <h3>{row.kind === "bug" ? "Problem report" : "Suggestion"}</h3>
          <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {row.message}
          </p>
          <p>
            {new Date(row.created_at).toLocaleString()} · {row.app_version} ·{" "}
            {row.page}
          </p>
          <p style={{ overflowWrap: "anywhere" }}>{row.device}</p>
          <label>
            Status{" "}
            <select
              aria-label="Feedback status"
              value={row.status}
              disabled={update.isPending}
              onChange={(e) =>
                update.mutate({ id: row.id, status: e.target.value })
              }
            >
              {["new", "reviewed", "resolved"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </section>
      ))}
    </div>
  )
}
