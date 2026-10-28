export type TimelineItem = {
  kind: "post" | "event" | "blogPost"
  id: string
  createdAt: string
  pinned: boolean
  value: any
}
export function paginateFeed(
  items: TimelineItem[],
  options: { cursor?: string; limit?: string; orgId?: string; hashtag?: string },
) {
  const limit = options.limit === undefined ? 20 : Number(options.limit)
  if (!Number.isInteger(limit) || limit < 1 || limit > 50)
    throw new Error("Invalid page size")
  let cursor: { snapshot: number; key: string } | null = null
  if (options.cursor) {
    try {
      cursor = JSON.parse(atob(options.cursor))
    } catch {
      throw new Error("Invalid cursor")
    }
    if (
      !cursor ||
      !Number.isFinite(cursor.snapshot) ||
      typeof cursor.key !== "string"
    )
      throw new Error("Invalid cursor")
  }
  const snapshot = cursor?.snapshot ?? Date.now()
  const time = (i: TimelineItem) =>
    Number.isFinite(Date.parse(i.createdAt)) ? Date.parse(i.createdAt) : 0
  const key = (i: TimelineItem) =>
    `${
      i.pinned ? "1" : "0"
    }:${String(time(i)).padStart(16, "0")}:${i.kind}:${i.id}`
  const tag = options.hashtag?.replace(/^#/, "").toLowerCase()
  const filtered = items.filter(
    (i) =>
      time(i) <= snapshot &&
      (!options.orgId || i.value.orgId === options.orgId) &&
      (!tag ||
        String(i.value.content ?? i.value.body ?? i.value.title ?? "")
          .toLowerCase()
          .includes(`#${tag}`)),
  )
  filtered.sort((a, b) => (key(a) < key(b) ? 1 : key(a) > key(b) ? -1 : 0))
  const remaining = cursor
    ? filtered.filter((i) => key(i) < cursor!.key)
    : filtered
  const page = remaining.slice(0, limit)
  return {
    items: page,
    nextCursor:
      remaining.length > limit
        ? btoa(JSON.stringify({ snapshot, key: key(page[page.length - 1]) }))
        : null,
  }
}
