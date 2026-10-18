import { test } from 'node:test'
import assert from 'node:assert/strict'
import { jpegDimensions, stripJpegMetadata, STORY_MAX_BYTES } from '../supabase/functions/dynamic-endpoint/storyValidation.ts'
function header(width, height) { return new Uint8Array([255,216,255,224,0,4,0,0,255,192,0,8,8,height >> 8,height & 255,width >> 8,width & 255,3,255,217]) }
test('bounds JPEG dimensions before allocating decoded pixels', () => {
 assert.deepEqual(jpegDimensions(header(1080,1920)),{width:1080,height:1920})
 assert.equal(jpegDimensions(header(1921,1080)),null)
 assert.equal(jpegDimensions(header(65535,65535)),null)
 assert.equal(jpegDimensions(header(0,100)),null)
})
test('rejects spoofed media, malformed segments and oversized uploads', () => {
 for (const bytes of [new TextEncoder().encode('GIF89a'),new Uint8Array([255,216,255,224,255,255]),new Uint8Array([255,216,255,192,0,1]),new Uint8Array(STORY_MAX_BYTES+1)]) assert.equal(jpegDimensions(bytes),null)
})

test('removes EXIF and comments while retaining required image headers and scan bytes', () => {
 const bytes = new Uint8Array([255,216,255,224,0,4,1,2,255,225,0,4,8,9,255,254,0,4,7,6,255,218,0,2,3,4,255,217])
 assert.deepEqual([...stripJpegMetadata(bytes)],[255,216,255,224,0,4,1,2,255,218,0,2,3,4,255,217])
})
