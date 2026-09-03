import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../providers/AuthProvider'

export type BlogBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'image'; url: string; caption?: string }
  | { type: 'quote'; text: string }

const BLOCK_TYPES: { type: BlogBlock['type']; label: string; icon: string }[] = [
  { type: 'paragraph', label: 'Paragraph', icon: '¶' },
  { type: 'heading', label: 'Heading', icon: 'H' },
  { type: 'image', label: 'Image', icon: '🖼️' },
  { type: 'quote', label: 'Quote', icon: '❝' },
]

function emptyBlock(type: BlogBlock['type']): BlogBlock {
  if (type === 'image') return { type: 'image', url: '', caption: '' }
  return { type, text: '' }
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '9px 12px',
  border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '14px',
  fontFamily: 'var(--font-sans)', color: 'var(--color-text-1)', backgroundColor: 'var(--color-card)', outline: 'none',
}

function ImageBlockFields({ block, onChange }: { block: Extract<BlogBlock, { type: 'image' }>; onChange: (b: BlogBlock) => void }) {
  const { currentUser } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!currentUser) return
    setUploading(true); setError('')
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${currentUser.id}/blog-${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, {
        upsert: true, contentType: file.type || 'image/jpeg',
      })
      if (uploadErr) throw uploadErr
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      onChange({ ...block, url: data.publicUrl })
    } catch (e: any) {
      setError(e.message ?? 'Failed to upload image.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      {block.url ? (
        <div style={{ position: 'relative', marginBottom: '8px' }}>
          <img src={block.url} alt="" style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', borderRadius: '8px', display: 'block' }} />
          <button onClick={() => fileRef.current?.click()} style={{
            position: 'absolute', bottom: '8px', right: '8px', padding: '6px 12px', borderRadius: '6px',
            border: 'none', backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '12px', fontWeight: 700,
            cursor: 'pointer', fontFamily: 'var(--font-sans)',
          }}>Change</button>
        </div>
      ) : (
        <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{
          width: '100%', padding: '14px', borderRadius: '8px', border: '1px dashed var(--color-border)',
          backgroundColor: 'var(--color-card)', color: 'var(--color-text-2)', fontSize: '13px', fontWeight: 600,
          cursor: uploading ? 'default' : 'pointer', fontFamily: 'var(--font-sans)', marginBottom: '8px',
        }}>{uploading ? 'Uploading…' : '📷 Upload image'}</button>
      )}
      {error && <div style={{ fontSize: '12px', color: 'var(--color-red)', marginBottom: '8px' }}>{error}</div>}
      <input
        value={block.caption ?? ''}
        onChange={e => onChange({ ...block, caption: e.target.value })}
        placeholder="Caption (optional)"
        style={inputStyle}
      />
    </div>
  )
}

export default function BlockEditor({ blocks, onChange }: { blocks: BlogBlock[]; onChange: (blocks: BlogBlock[]) => void }) {
  function updateBlock(i: number, block: BlogBlock) {
    onChange(blocks.map((b, idx) => idx === i ? block : b))
  }
  function moveBlock(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= blocks.length) return
    const next = [...blocks]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  function removeBlock(i: number) {
    onChange(blocks.filter((_, idx) => idx !== i))
  }
  function addBlock(type: BlogBlock['type']) {
    onChange([...blocks, emptyBlock(type)])
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {blocks.map((block, i) => {
          const meta = BLOCK_TYPES.find(t => t.type === block.type)!
          return (
            <div key={i} style={{
              border: '1px solid var(--color-border)', borderRadius: '10px', padding: '10px 12px',
              backgroundColor: 'var(--color-surface)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {meta.icon} {meta.label}
                </span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => moveBlock(i, -1)} disabled={i === 0} title="Move up" style={iconBtnStyle(i === 0)}>↑</button>
                  <button onClick={() => moveBlock(i, 1)} disabled={i === blocks.length - 1} title="Move down" style={iconBtnStyle(i === blocks.length - 1)}>↓</button>
                  <button onClick={() => removeBlock(i)} title="Remove block" style={iconBtnStyle(false, true)}>✕</button>
                </div>
              </div>
              {block.type === 'paragraph' && (
                <textarea value={block.text} onChange={e => updateBlock(i, { ...block, text: e.target.value })}
                  placeholder="Write a paragraph…" rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
              )}
              {block.type === 'heading' && (
                <input value={block.text} onChange={e => updateBlock(i, { ...block, text: e.target.value })}
                  placeholder="Section heading" style={{ ...inputStyle, fontWeight: 700, fontSize: '16px' }} />
              )}
              {block.type === 'quote' && (
                <textarea value={block.text} onChange={e => updateBlock(i, { ...block, text: e.target.value })}
                  placeholder="A quote worth pulling out…" rows={2} style={{ ...inputStyle, resize: 'vertical', fontStyle: 'italic' }} />
              )}
              {block.type === 'image' && <ImageBlockFields block={block} onChange={b => updateBlock(i, b)} />}
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
        {BLOCK_TYPES.map(t => (
          <button key={t.type} onClick={() => addBlock(t.type)} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '7px 14px', borderRadius: '20px', border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-card)', color: 'var(--color-text-2)',
            fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)',
          }}>
            <span>{t.icon}</span> + {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function iconBtnStyle(disabled: boolean, danger = false): React.CSSProperties {
  return {
    width: '24px', height: '24px', borderRadius: '6px', border: 'none',
    backgroundColor: 'transparent', color: disabled ? 'var(--color-border)' : danger ? 'var(--color-red)' : 'var(--color-text-2)',
    fontSize: '13px', cursor: disabled ? 'default' : 'pointer', fontFamily: 'var(--font-sans)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
}
