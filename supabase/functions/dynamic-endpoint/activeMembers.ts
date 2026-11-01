export function visibleActiveMembers(
  users: any[],
  callerId: string,
  blocks: Record<string, string[]>,
  now = Date.now(),
) {
  const cutoff = now - 5 * 60_000
  return users
    .filter((user) => {
      const meta = user.user_metadata ?? {}
      const activeAt = Date.parse(meta.lastActiveAt ?? "")
      return (
        user.id !== callerId &&
        !user.is_anonymous &&
        !!user.confirmed_at &&
        meta.onboarding_complete !== false &&
        meta.status !== "suspended" &&
        (!user.banned_until || Date.parse(user.banned_until) <= now) &&
        !(blocks[callerId] ?? []).includes(user.id) &&
        !(blocks[user.id] ?? []).includes(callerId) &&
        Number.isFinite(activeAt) &&
        activeAt > cutoff &&
        activeAt <= now
      )
    })
    .sort(
      (a, b) =>
        Date.parse(b.user_metadata.lastActiveAt) -
        Date.parse(a.user_metadata.lastActiveAt),
    )
    .map((user) => ({
      id: user.id,
      name: user.user_metadata.full_name ?? user.user_metadata.name ?? "",
      avatarUrl:
        user.user_metadata.avatar_url ?? user.user_metadata.avatarUrl ?? "",
      title: user.user_metadata.title ?? "",
      church: user.user_metadata.church ?? "",
      lastActiveAt: user.user_metadata.lastActiveAt,
    }))
}
