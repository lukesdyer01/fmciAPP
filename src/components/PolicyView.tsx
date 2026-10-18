import policies from '../content/policies.json'

export type PolicyKind = keyof typeof policies
export default function PolicyView({ kind }: { kind: PolicyKind }) {
  const policy = policies[kind]
  return <article style={{ maxWidth: '760px', margin: '0 auto', color: 'var(--color-text-1)' }}>
    <h1 style={{ fontSize: '26px', margin: '0 0 12px' }}>{policy.title}</h1>
    <p style={{ color: 'var(--color-text-3)', fontSize: '13px' }}>Updated {policy.updated}</p>
    <div style={{ padding: '24px', background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '12px' }}>
      {policy.sections.map(section => <section key={section.title} style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '19px', margin: '0 0 10px' }}>{section.title}</h2>
        {section.paragraphs.map(paragraph => <p key={paragraph} style={{ fontSize: '15px', lineHeight: 1.7 }}>{paragraph}</p>)}
      </section>)}
      <p><a href="mailto:luke@dyerplex.com">Contact Luke Dyer — luke@dyerplex.com</a></p>
      <nav style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}><a href="/privacy/">Privacy</a><a href="/terms/">Community rules</a><a href="/support/">Support</a></nav>
    </div>
  </article>
}
