// First-line text filtering complements human review and member reporting.
// It deliberately does not treat ordinary theological vocabulary as profanity.
const prohibited = /\b(?:child\s+por[nm]|kill\s*yourself|i\s+will\s+kill\s+you|i(?:'|’)ll\s+kill\s+you|rape\s+you|n[i1]gg[e3]r|faggot|fuck(?:ing|er|s)?|pornhub)\b/i
const textFields = new Set(['content', 'body', 'text', 'title', 'description', 'bio', 'name', 'full_name'])
export function contentSafetyIssue(value: unknown, field = '', depth = 0): boolean {
  if (depth > 20) return true
  if (typeof value === 'string') {
    if (!textFields.has(field)) return false
    const text = value.normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
    return prohibited.test(text)
  }
  if (Array.isArray(value)) return value.some(item => contentSafetyIssue(item, field, depth + 1))
  if (value && typeof value === 'object') return Object.entries(value).some(([key, item]) => contentSafetyIssue(item, key, depth + 1))
  return false
}
