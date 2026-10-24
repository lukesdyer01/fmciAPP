export interface Invitation {
  email?: string
  token: string
  expiresAt: string
}

export function invitationLink(invitation: Pick<Invitation, 'email' | 'token'>): string {
  // A fragment keeps the invitation secret out of server requests and referrers.
  const params = new URLSearchParams({ invite: invitation.token })
  if (invitation.email) params.set('email', invitation.email)
  return `https://fmci.network/#${params}`
}

export function readInvitationLink(hash: string): Pick<Invitation, 'email' | 'token'> | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const token = params.get('invite')?.trim()
  const email = params.get('email')?.trim()
  if (!token) return null
  return { token, ...(email ? { email } : {}) }
}
