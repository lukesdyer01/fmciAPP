import { useState } from "react"
import { useActiveMembers, type ActiveMember } from "../api-client/presence"
function OnlineAvatar({ member }: { member: ActiveMember }) {
  const [failed, setFailed] = useState(false)
  return (
    <span className="online-member-avatar">
      {member.avatarUrl && !failed ? (
        <img src={member.avatarUrl} alt="" onError={() => setFailed(true)} />
      ) : (
        <span className="online-member-initials">
          {member.name
            .trim()
            .split(/\s+/)
            .map((part) => part[0])
            .slice(0, 2)
            .join("")
            .toUpperCase() || "?"}
        </span>
      )}
      <span className="online-member-dot" aria-hidden="true" />
    </span>
  )
}
export default function OnlineMembersRow({
  onSelect,
  busy,
}: {
  onSelect: (id: string) => void
  busy: boolean
}) {
  const members = useActiveMembers()
  const online = (members.data ?? []).filter(
    (member) => Date.parse(member.lastActiveAt) > Date.now() - 5 * 60_000,
  )
  return (
    <section
      className="messages-online"
      aria-label="Active members"
      title="Active in the last 5 minutes. Updates every 30 seconds."
    >
      <h2>Active now</h2>
      {members.isPending ? (
        <div className="online-members-loading" role="status">
          Loading active members…
        </div>
      ) : members.isError ? (
        <p className="online-members-status">
          Active members unavailable.{" "}
          <button onClick={() => members.refetch()}>Retry</button>
        </p>
      ) : !online.length ? (
        <p className="online-members-status">
          No other members active right now.
        </p>
      ) : (
        <ul className="online-members-row">
          {online.map((member) => (
            <li key={member.id}>
              <button
                type="button"
                disabled={busy}
                onClick={() => onSelect(member.id)}
                aria-label={`Message ${member.name || "member"}, recently active`}
                title={`${member.name || "Member"} · Active in the last 5 minutes`}
              >
                <OnlineAvatar key={member.avatarUrl} member={member} />
                <span className="online-member-name">
                  {member.name.split(/\s+/)[0] || "Member"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
