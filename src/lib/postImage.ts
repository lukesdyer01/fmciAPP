const MAX_OUTPUT_BYTES = 500_000
const MAX_INPUT_BYTES = 20 * 1024 * 1024
const MAX_ANIMATED_BYTES = 1_000_000

/** Re-encode still photos before upload. Canvas strips camera metadata. */
export async function optimizePostImage(file: File): Promise<{ blob: Blob; extension: string }> {
  if (!file.size || file.size > MAX_INPUT_BYTES) throw new Error('Choose an image under 20 MB.')
  const header = new TextDecoder('latin1').decode(await file.slice(0, 65536).arrayBuffer())
  const gif = header.startsWith('GIF87a') || header.startsWith('GIF89a')
  const animatedWebp = header.startsWith('RIFF') && header.slice(8, 12) === 'WEBP' && (header.includes('ANIM') || header.includes('ANMF'))
  if (gif || animatedWebp) {
    if (file.size > MAX_ANIMATED_BYTES) throw new Error('Choose an animation under 1 MB, or share it as a still photo.')
    return { blob: new Blob([file], { type: gif ? 'image/gif' : 'image/webp' }), extension: gif ? 'gif' : 'webp' }
  }
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    try { await image.decode() } catch { throw new Error('Unable to read this image. Try a JPEG, PNG, or WebP photo.') }
    const { naturalWidth: width, naturalHeight: height } = image
    if (!width || !height || width * height > 50_000_000) throw new Error('This photo is too large. Choose a smaller photo.')
    let scale = Math.min(1, 1920 / Math.max(width, height))
    for (let round = 0; round < 5; round++, scale *= 0.8) {
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(width * scale))
      canvas.height = Math.max(1, Math.round(height * scale))
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Unable to prepare this photo. Please try again.')
      context.fillStyle = '#fff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      for (const quality of [0.85, 0.72, 0.6]) {
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
        if (blob?.type === 'image/jpeg' && blob.size > 0 && blob.size <= MAX_OUTPUT_BYTES) return { blob, extension: 'jpg' }
      }
    }
    throw new Error('Unable to compress this photo enough. Please choose a smaller photo.')
  } finally {
    URL.revokeObjectURL(url)
  }
}
