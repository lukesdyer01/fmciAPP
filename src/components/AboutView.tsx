const FOCUS_AREAS = [
  { icon: '🕊', title: 'Apostolic-Prophetic Ministry', text: 'Raising up and developing apostolic-prophetic teams equipped to serve alongside local church leadership.' },
  { icon: '⛪', title: 'Local Church Advancement', text: "Helping local churches progress toward their God-given destiny through relational partnership rather than hierarchy." },
  { icon: '🌍', title: 'Community & Kingdom Transformation', text: 'Advancing the Kingdom of God in the community so that societal transformation is released, not just spoken about.' },
  { icon: '⚔️', title: 'Spiritual Warfare', text: "Standing against opposition to God's will in the culture, contending for what Scripture calls for, not against people." },
  { icon: '🍇', title: 'New Wineskins', text: 'Building relational, five-fold structures suited to how the 21st-century Church actually gathers and serves — not a rigid denominational model.' },
]

const REACH = [
  { n: '17+', label: 'Nations with relational connections' },
  { n: '6', label: 'Countries with apostolic linkages' },
  { n: 'Since 1980s', label: 'Serving local churches and leaders' },
]

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '14px', border: '1px solid var(--color-border)', padding: '24px' }}>
      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-gold)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>{eyebrow}</div>
      <h2 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: 800, color: 'var(--color-text-1)', fontFamily: 'var(--font-serif)' }}>{title}</h2>
      {children}
    </div>
  )
}

export default function AboutView() {
  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, var(--color-navy) 0%, var(--color-navy-mid) 100%)',
        borderRadius: '16px', padding: '32px 28px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '-30px', right: '-20px', fontSize: '140px', opacity: 0.06 }}>🏛</div>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-gold-light)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>About</div>
        <h1 style={{ margin: '0 0 10px', fontSize: '26px', fontWeight: 900, color: '#fff', fontFamily: 'var(--font-serif)', lineHeight: 1.25 }}>
          Federation of Ministers and Churches International
        </h1>
        <p style={{ margin: 0, fontSize: '15px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, maxWidth: '620px' }}>
          A relational network of five-fold ministries, local churches, chief musicians, intercessors, marketplace leaders, and compassion ministries — connected by calling, not hierarchy.
        </p>
      </div>

      {/* Reach stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        {REACH.map((r, i) => (
          <div key={i} style={{ backgroundColor: 'var(--color-card)', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '18px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--color-navy)', marginBottom: '4px' }}>{r.n}</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-2)', fontWeight: 600, lineHeight: 1.4 }}>{r.label}</div>
          </div>
        ))}
      </div>

      {/* Mission */}
      <Section eyebrow="Mission" title="Why FMCI Exists">
        <p style={{ margin: 0, fontSize: '15px', color: 'var(--color-text-1)', lineHeight: 1.75 }}>
          FMCI exists to raise up and deploy apostolic-prophetic teams that serve local church leaders synergistically — not as an outside authority, but as a relational partner in the work already in front of them. Through these partnerships, the local church progresses toward its God-given destiny, the Kingdom of God is advanced in the community, and societal transformation is released rather than merely discussed.
        </p>
      </Section>

      {/* Vision */}
      <Section eyebrow="Vision" title="What We're Contending For">
        <p style={{ margin: 0, fontSize: '15px', color: 'var(--color-text-1)', lineHeight: 1.75, fontStyle: 'italic' }}>
          "Extend the Kingdom of God in history through cultural transformation, according to the Dominion Mandate of Genesis 1:28 and the Great Commission of Matthew 28:19–20."
        </p>
      </Section>

      {/* Focus areas */}
      <Section eyebrow="Focus" title="Core Focus Areas">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {FOCUS_AREAS.map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
                backgroundColor: 'var(--color-gold-bg)', border: '1px solid var(--color-gold-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px',
              }}>{f.icon}</div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-1)', marginBottom: '2px' }}>{f.title}</div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-2)', lineHeight: 1.6 }}>{f.text}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Leadership */}
      <Section eyebrow="Leadership" title="Founding Apostle">
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '12px', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--color-navy) 0%, var(--color-navy-mid) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '18px',
          }}>JH</div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-1)' }}>Jim Hodges</div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-2)', lineHeight: 1.6 }}>
              Founding Apostle of FMCI, and author of <em>Battle for Earth: Globalism vs. Nationhood</em>.
            </div>
          </div>
        </div>
      </Section>

      <div style={{ textAlign: 'center', padding: '4px 0 16px', fontSize: '12px', color: 'var(--color-text-3)' }}>
        Content adapted from jimhodgesministries.com
      </div>
    </div>
  )
}
