export const STORY_MAX_BYTES = 500_000;
// Read dimensions before decoding to reject decompression bombs. Only static
// JPEG is accepted, regardless of an uploader's extension or Content-Type.
export function jpegDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length > STORY_MAX_BYTES || bytes.length < 4 || bytes[0] !== 255 || bytes[1] !== 216) return null;
  let p = 2;
  while (p + 3 < bytes.length) {
    if (bytes[p++] !== 255) return null;
    while (bytes[p] === 255) p++;
    const marker = bytes[p++];
    if (marker === 217 || marker === 218) return null;
    const length = (bytes[p] << 8) | bytes[p + 1];
    if (length < 2 || p + length > bytes.length) return null;
    if ([192,193,194].includes(marker)) {
      if (length < 8) return null;
      const height = (bytes[p + 3] << 8) | bytes[p + 4];
      const width = (bytes[p + 5] << 8) | bytes[p + 6];
      return width > 0 && height > 0 && width <= 1920 && height <= 1920 && width * height <= 3_686_400 ? { width, height } : null;
    }
    p += length;
  }
  return null;
}

// Remove EXIF, comments and auxiliary application metadata without an expensive
// second JPEG encode. Preserve JFIF/Adobe headers needed for colour decoding.
export function stripJpegMetadata(bytes: Uint8Array): Uint8Array {
  const parts = [bytes.slice(0,2)];
  let p=2;
  while (p+3 < bytes.length) {
    const start=p;
    if (bytes[p++] !== 255) throw new Error('Invalid JPEG marker');
    while (bytes[p] === 255) p++;
    const marker=bytes[p++];
    if (marker===218 || marker===217) { parts.push(bytes.slice(start)); break; }
    const length=(bytes[p]<<8)|bytes[p+1];
    if (length<2 || p+length>bytes.length) throw new Error('Invalid JPEG segment');
    if (!(marker===254 || (marker>=225 && marker<=239 && marker!==238))) parts.push(bytes.slice(start,p+length));
    p+=length;
  }
  const result=new Uint8Array(parts.reduce((n,part)=>n+part.length,0)); let offset=0;
  for (const part of parts) { result.set(part,offset); offset+=part.length; }
  return result;
}
