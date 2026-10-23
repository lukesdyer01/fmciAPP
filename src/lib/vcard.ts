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

interface EmbeddedPhoto {
  type: string
  base64: string
}

async function getEmbeddedPhoto(url: string): Promise<EmbeddedPhoto | null> {
  if (!url) return null
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 5000)
  try {
    const response = await fetch(url, { mode: 'cors', signal: controller.signal })
    if (!response.ok) return null
    const source = await response.blob()
    if (!source.type.startsWith('image/') || source.size > 8 * 1024 * 1024) return null

    // Decode through a Blob URL and HTMLImageElement rather than
    // createImageBitmap: some WKWebView versions display the avatar correctly
    // but don't implement createImageBitmap, which would omit the embedded photo.
    const sourceUrl = URL.createObjectURL(source)
    let image: HTMLImageElement
    try {
      image = new Image()
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve()
        image.onerror = () => reject(new Error('Could not decode the profile photo'))
        image.src = sourceUrl
      })
    } finally {
      URL.revokeObjectURL(sourceUrl)
    }

    // Resizing keeps the contact file small while retaining enough detail for
    // the thumbnail used by contacts apps.
    const scale = Math.min(1, 320 / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) return null
    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    const jpeg = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.82))
    if (!jpeg) return null
    const bytes = new Uint8Array(await jpeg.arrayBuffer())
    let binary = ''
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
    }
    return { type: 'JPEG', base64: btoa(binary) }
  } catch {
    return null
  } finally {
    window.clearTimeout(timeout)
  }
}

function foldVCardLine(line: string): string {
  const output: string[] = []
  let current = ''
  let byteLimit = 75
  for (const character of line) {
    if (current && new TextEncoder().encode(current + character).length > byteLimit) {
      output.push(current)
      current = character
      byteLimit = 74 // Continuation lines start with one whitespace byte.
    } else {
      current += character
    }
  }
  output.push(current)
  return output.join('\r\n ')
}

function createVCard(contact: VCardContact, photo: EmbeddedPhoto | null): string {
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
  if (photo) lines.push(`PHOTO;ENCODING=b;TYPE=${photo.type}:${photo.base64}`)
  else if (contact.avatarUrl) lines.push(`PHOTO;VALUE=URI:${vCardEscape(contact.avatarUrl)}`)
  const notes = [
    contact.bio,
    contact.ministryRoles.length ? `Fivefold roles: ${contact.ministryRoles.join(', ')}` : '',
    contact.additionalRoles.length ? `Additional roles: ${contact.additionalRoles.join(', ')}` : '',
  ].filter(Boolean)
  if (notes.length) lines.push(`NOTE:${vCardEscape(notes.join('\n\n'))}`)
  lines.push('END:VCARD')
  return `${lines.map(foldVCardLine).join('\r\n')}\r\n`
}

export async function downloadVCard(contact: VCardContact) {
  const photo = await getEmbeddedPhoto(contact.avatarUrl)
  const safeName = (contact.name || 'fmci-member')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '')
  const blob = new Blob([createVCard(contact, photo)], { type: 'text/vcard;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${safeName || 'fmci-member'}.vcf`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
