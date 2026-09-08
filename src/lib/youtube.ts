// YouTube link handling, shared by the composer (which detects a link as it is
// typed), PostCard (which embeds one found in a post's text) and the resource
// library. Was duplicated verbatim in two components before.

// Every shape a YouTube link arrives in: a normal watch URL, a youtu.be share
// link, an /embed or /shorts path, and /live for streams. `v=` is matched
// anywhere in the query string rather than only first, since links copied from
// the app often carry other parameters ahead of it.
const YOUTUBE_URL = /(?:youtube\.com\/(?:embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})|youtube\.com\/watch\?(?:[^\s]*&)?v=([a-zA-Z0-9_-]{11})/

export function extractYouTubeId(url: string): string | null {
  const m = url.match(YOUTUBE_URL)
  if (!m) return null
  return m[1] ?? m[2] ?? null
}

// The whole matched link, so a post whose entire body is a YouTube URL can drop
// the now-redundant text and show just the player.
export function findYouTubeLink(text: string): { id: string; url: string } | null {
  const m = text.match(new RegExp(`https?://\\S*(?:${YOUTUBE_URL.source})\\S*`))
  if (!m) return null
  const id = extractYouTubeId(m[0])
  return id ? { id, url: m[0] } : null
}
