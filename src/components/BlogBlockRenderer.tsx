import type { BlogBlock } from './BlockEditor'

export default function BlogBlockRenderer({ blocks }: { blocks: BlogBlock[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {blocks.map((block, i) => {
        if (block.type === 'heading') {
          return <h2 key={i} style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--color-text-1)', fontFamily: 'var(--font-serif)' }}>{block.text}</h2>
        }
        if (block.type === 'paragraph') {
          return <p key={i} style={{ margin: 0, fontSize: '15px', lineHeight: 1.7, color: 'var(--color-text-1)', whiteSpace: 'pre-wrap' }}>{block.text}</p>
        }
        if (block.type === 'quote') {
          return (
            <div key={i} style={{
              margin: 0, padding: '4px 4px 4px 16px', borderLeft: '3px solid var(--color-gold)',
              fontSize: '16px', fontStyle: 'italic', lineHeight: 1.6, color: 'var(--color-text-2)',
            }}>{block.text}</div>
          )
        }
        if (block.type === 'image') {
          return block.url ? (
            <figure key={i} style={{ margin: 0 }}>
              <img src={block.url} alt={block.caption ?? ''} style={{ width: '100%', borderRadius: '10px', display: 'block' }} />
              {block.caption && (
                <figcaption style={{ marginTop: '6px', fontSize: '12px', color: 'var(--color-text-3)', textAlign: 'center' }}>{block.caption}</figcaption>
              )}
            </figure>
          ) : null
        }
        return null
      })}
    </div>
  )
}
