// Story originals never leave the device. Canvas also strips EXIF metadata.
export async function prepareStoryPhoto(file: File): Promise<Blob> {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 20_000_000) throw new Error('Choose a JPEG, PNG, or WebP photo under 20 MB. Convert unsupported photos to JPEG first.')
  const head = new Uint8Array(await file.arrayBuffer())
  const text = new TextDecoder('latin1').decode(head)
  if ((file.type === 'image/png' && text.includes('acTL')) || (file.type === 'image/webp' && (text.includes('ANIM') || text.includes('ANMF')))) throw new Error('Choose a still photo. Animated images are not supported.')
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    if (image.naturalWidth * image.naturalHeight > 50_000_000) throw new Error('This photo is too large. Choose a smaller photo.')
    let scale = Math.min(1, 1920 / Math.max(image.naturalWidth, image.naturalHeight))
    for (let round = 0; round < 5; round++, scale *= 0.8) {
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      for (const quality of [0.85, 0.7, 0.55]) {
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
        if (blob && blob.size <= 500_000) return blob
      }
    }
    throw new Error('Unable to compress this photo. Choose a smaller photo.')
  } finally { URL.revokeObjectURL(url) }
}
