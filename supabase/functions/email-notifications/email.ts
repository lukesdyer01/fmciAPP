export const descriptions: Record<string, string> = {
  test: "Your FMCI Network email setup is working.",
  mention: "Someone tagged you in a post.",
  wall_post: "Someone posted on your wall.",
  wall_comment: "Someone commented on your wall.",
  comment: "Someone commented on your post.",
  reply: "Someone replied to your comment.",
  direct: "You have an unread direct message.",
  group: "You have an unread group message.",
}
export function notificationEmail(
  kind: string,
  destination: string,
  unsubscribe: string,
) {
  const description =
    descriptions[kind] ?? "You have new activity on FMCI Network."
  const html = `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:Arial,sans-serif;color:#222"><div style="max-width:560px;margin:32px auto;padding:32px;background:white;border-radius:12px"><h1 style="font-size:22px">FMCI Network</h1><p>${description}</p><p>Open FMCI Network to view it securely.</p><p style="margin:28px 0"><a href="${destination}" style="background:#172b4d;color:white;padding:12px 20px;border-radius:8px;text-decoration:none">View notification</a></p><p style="font-size:12px;color:#555">Manage email preferences in your profile menu under Settings, or <a href="${unsubscribe}">unsubscribe from notification emails</a>.</p></div></body></html>`
  return {
    subject: `FMCI Network — ${description}`,
    html,
    text: `${description}\n\nView it securely: ${destination}\n\nManage email preferences: https://fmci.network/settings\nUnsubscribe: ${unsubscribe}`,
  }
}
export function retryState(attempts: number, ageMs: number) {
  // Resend idempotency keys expire after 24 hours. Never retry beyond that window.
  return attempts >= 8 || ageMs >= 23 * 3600000 ? "failed" : "pending"
}
export function preferenceFor(kind: string) {
  return kind === "direct" || kind === "group"
    ? "messages"
    : kind === "mention"
      ? "mentions"
      : kind === "reply"
        ? "replies"
        : "wall"
}
