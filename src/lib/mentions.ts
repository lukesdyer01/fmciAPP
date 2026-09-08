// @-mention support, shared by the composer (which offers matches as you type)
// and PostCard (which renders the finished mention as a link to the profile).

export interface TaggedUser {
  id: string
  name: string
}

const MAX_QUERY = 32

/** The @… the caret is currently sitting inside, or null if it isn't in one. */
export function activeMention(text: string, caret: number): { query: string; start: number } | null {
  const before = text.slice(0, caret)
  const at = before.lastIndexOf('@')
  if (at === -1) return null
  // Must open a word, so an email address doesn't read as a mention.
  if (at > 0 && !/\s/.test(before[at - 1])) return null
  const query = before.slice(at + 1)
  // A newline ends it, and a second @ means this one was abandoned. The length
  // cap stops a whole paragraph after a stray @ being treated as a search.
  if (/[\n@]/.test(query) || query.length > MAX_QUERY) return null
  return { query, start: at }
}

/** Names can run to several words, so the query is matched loosely against them. */
export function matchesQuery(name: string, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (q === '') return true
  const n = name.toLowerCase()
  return n.includes(q) || q.split(/\s+/).every(part => n.includes(part))
}

/** Replaces the @query at `start` with the chosen name, ready to keep typing after. */
export function insertMention(text: string, start: number, caret: number, name: string): { text: string; caret: number } {
  const mention = `@${name} `
  return {
    text: text.slice(0, start) + mention + text.slice(caret),
    caret: start + mention.length,
  }
}

/**
 * Who is still mentioned in the text. Someone tagged and then deleted from what
 * was written shouldn't stay tagged on the post.
 */
export function mentionedUsers(text: string, tagged: TaggedUser[]): TaggedUser[] {
  return tagged.filter(t => text.includes(`@${t.name}`))
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export type Segment =
  | { kind: 'text'; text: string }
  | { kind: 'hashtag'; text: string; tag: string }
  | { kind: 'mention'; text: string; userId: string }

/**
 * Splits a line into plain text, #hashtags and @mentions. Only names the post
 * actually recorded as tagged become mentions, so an @ someone merely typed
 * stays plain text rather than pretending to link somewhere.
 */
export function segmentLine(line: string, tagged: TaggedUser[]): Segment[] {
  // Longest first, so "@John Smithson" wins over "@John Smith".
  const byLength = [...tagged].sort((a, b) => b.name.length - a.name.length)
  // `(?!)` can never match, keeping group 1 the mention and group 2 the hashtag
  // even when nobody is tagged — otherwise the numbering shifts and hashtags
  // start being read as mentions.
  const mentionAlt = byLength.map(t => escapeRegExp(`@${t.name}`)).join('|') || '(?!)'
  const pattern = new RegExp(`(${mentionAlt})|(#[\\p{L}\\d_]+)`, 'gu')

  const out: Segment[] = []
  let last = 0
  for (const m of line.matchAll(pattern)) {
    const i = m.index ?? 0
    if (i > last) out.push({ kind: 'text', text: line.slice(last, i) })
    if (m[1]) {
      const user = byLength.find(t => `@${t.name}` === m[1])
      out.push(user
        ? { kind: 'mention', text: m[1], userId: user.id }
        : { kind: 'text', text: m[1] })
    } else {
      const tag = m[2]!
      out.push(tag.length > 1
        ? { kind: 'hashtag', text: tag, tag: tag.slice(1).toLowerCase() }
        : { kind: 'text', text: tag })
    }
    last = i + m[0].length
  }
  if (last < line.length) out.push({ kind: 'text', text: line.slice(last) })
  return out
}
