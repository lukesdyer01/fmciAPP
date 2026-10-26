export interface MessageNotificationTarget { userId: string; messageId: string | null }

export function readMessageNotificationUrl(value: string, baseUrl: string): MessageNotificationTarget | null {
  try {
    const base = new URL(baseUrl)
    const url = new URL(value, base)
    if (url.protocol !== base.protocol || url.host !== base.host || url.pathname !== '/') return null
    const userId = url.searchParams.get('messageFrom')
    const messageId = url.searchParams.get('message')
    if (!userId || !/^[a-zA-Z0-9_-]{1,128}$/.test(userId)) return null
    if (messageId && !/^[a-zA-Z0-9_-]{1,128}$/.test(messageId)) return null
    return { userId, messageId }
  } catch { return null }
}
