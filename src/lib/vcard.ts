export interface VCardContact {
  name: string
  title: string
  church: string
  location: string
  avatarUrl: string
  bio: string
  website: string
  email: string
  phone: string
  ministryRoles: string[]
  additionalRoles: string[]
}

function vCardEscape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

function createVCard(contact: VCardContact): string {
  const fullName = contact.name.trim()
  const nameParts = fullName.split(/\s+/).filter(Boolean)
  const familyName = nameParts.length > 1 ? nameParts.pop()! : ''
  const givenName = nameParts.join(' ')
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${vCardEscape(familyName)};${vCardEscape(givenName)};;;`,
    `FN:${vCardEscape(fullName)}`,
  ]
  if (contact.title) lines.push(`TITLE:${vCardEscape(contact.title)}`)
  if (contact.church) lines.push(`ORG:${vCardEscape(contact.church)}`)
  if (contact.email) lines.push(`EMAIL;TYPE=INTERNET:${vCardEscape(contact.email)}`)
  if (contact.phone) lines.push(`TEL;TYPE=CELL,VOICE:${vCardEscape(contact.phone)}`)
  if (contact.website) lines.push(`URL:${vCardEscape(contact.website)}`)
  if (contact.location) lines.push(`LABEL;TYPE=WORK:${vCardEscape(contact.location)}`)
  if (contact.avatarUrl) lines.push(`PHOTO;VALUE=URI:${vCardEscape(contact.avatarUrl)}`)
  const notes = [
    contact.bio,
    contact.ministryRoles.length ? `Fivefold roles: ${contact.ministryRoles.join(', ')}` : '',
    contact.additionalRoles.length ? `Additional roles: ${contact.additionalRoles.join(', ')}` : '',
  ].filter(Boolean)
  if (notes.length) lines.push(`NOTE:${vCardEscape(notes.join('\n\n'))}`)
  lines.push('END:VCARD')
  return `${lines.join('\r\n')}\r\n`
}

export function downloadVCard(contact: VCardContact) {
  const safeName = (contact.name || 'fmci-member')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '')
  const blob = new Blob([createVCard(contact)], { type: 'text/vcard;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${safeName || 'fmci-member'}.vcf`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
