import { useActiveMembers } from '../api-client/presence'

// Mounted only for superadmins in the member-facing application shell.
export default function ActiveUsersBar() {
  const { data, isError } = useActiveMembers()
  return (
    <div className="active-users-bar" title="Users active in the last 5 minutes, including you. Updates every 30 seconds.">
      <span className="active-users-dot" aria-hidden="true" />
      <span role="status" aria-live="polite">
        {data ? `${data.length + 1} active ${data.length === 0 ? 'user' : 'users'}` : isError ? 'Active users unavailable' : 'Active users…'}
      </span>
    </div>
  )
}
