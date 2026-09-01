import { useState, useEffect } from 'react'
import Badge, { type BadgeVariant } from './Badge'
import VerifiedBadge from './VerifiedBadge'
import { api } from '../api-client/server'
import { useOpenProfile } from './ProfileView'
import { useUIStore } from '../store/ui'

interface Member {
  id: string
  name: string
  title: string
  church: string
  location: string
  avatarUrl: string
  badges: BadgeVariant[]
  callings: string[]
  ministryRoles: string[]
}

const FILTERS = ['All Members', 'Leadership', 'Pastors', 'Apostolic Council', 'Overseers', 'Missionaries', 'Intercessors']
const REGIONS = ['All Regions', 'North America', 'West Africa', 'East Africa', 'Europe', 'Asia', 'Latin America', 'Caribbean']

export default function DirectoryView() {
  const openProfile = useOpenProfile()
  const openMessagesWith = useUIStore(s => s.openMessagesWith)
  const [filter, setFilter] = useState('All Members')
  const [region, setRegion] = useState('All Regions')
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api<Member[]>('/members')
      .then(setMembers)
      .catch(() => setMembers([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = members.filter(m =>
    search === '' ||
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.church.toLowerCase().includes(search.toLowerCase()) ||
    m.callings.some(c => c.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'var(--color-card)', borderRadius: '12px',
        border: '1px solid var(--color-border)', padding: '20px 24px', marginBottom: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 800, color: 'var(--color-navy)', fontFamily: 'var(--font-serif)' }}>Member Directory</h1>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-2)' }}>Verified FMCI members, leaders, and ministry partners worldwide</p>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['grid', 'list'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--color-border)',
                cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600,
                backgroundColor: view === v ? 'var(--color-navy)' : 'transparent',
                color: view === v ? '#fff' : 'var(--color-text-2)',
                transition: 'all 0.15s',
              }}>{v === 'grid' ? '⊞ Grid' : '≡ List'}</button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', color: 'var(--color-text-3)' }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, church, calling, or location…"
            style={{
              width: '100%', padding: '11px 16px 11px 42px', borderRadius: '10px',
              border: '1.5px solid var(--color-border)', fontSize: '14px',
              fontFamily: 'var(--font-sans)', outline: 'none', boxSizing: 'border-box',
              color: 'var(--color-text-1)', backgroundColor: 'var(--color-surface)',
            }}
            onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--color-gold)' }}
            onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--color-border)' }}
          />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select value={region} onChange={e => setRegion(e.target.value)} style={{
            padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--color-border)',
            fontSize: '13px', fontFamily: 'var(--font-sans)', backgroundColor: '#fff',
            color: 'var(--color-text-1)', cursor: 'pointer', outline: 'none',
          }}>
            {REGIONS.map(r => <option key={r}>{r}</option>)}
          </select>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '6px 14px', borderRadius: '20px',
                border: `1.5px solid ${filter === f ? 'var(--color-navy)' : 'var(--color-border)'}`,
                backgroundColor: filter === f ? 'var(--color-navy)' : 'transparent',
                color: filter === f ? '#fff' : 'var(--color-text-2)',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
              }}>{f}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Results count */}
      <div style={{ fontSize: '13px', color: 'var(--color-text-2)', marginBottom: '12px', paddingLeft: '4px' }}>
        Showing <strong>{filtered.length}</strong> verified members
      </div>

      {loading && (
        <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--color-text-2)', fontSize: '14px' }}>
          Loading members…
        </div>
      )}
      {!loading && filtered.length === 0 && (
        <div style={{
          backgroundColor: 'var(--color-card)', borderRadius: '12px',
          border: '1px solid var(--color-border)', padding: '60px 24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '36px', marginBottom: '14px' }}>👤</div>
          <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--color-text-1)', marginBottom: '6px' }}>
            {search ? 'No members match your search' : 'No members yet'}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--color-text-2)', lineHeight: 1.6 }}>
            {search ? 'Try a different name, church, or calling.' : 'Verified members will appear here once they join the network.'}
          </div>
        </div>
      )}

      {/* Grid */}
      {filtered.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: view === 'grid' ? 'repeat(auto-fill, minmax(240px, 1fr))' : '1fr',
          gap: '12px',
        }}>
          {filtered.map((member, i) => (
            view === 'grid'
              ? <MemberCard key={i} member={member} onOpen={openProfile} onMessage={openMessagesWith} />
              : <MemberRow key={i} member={member} onOpen={openProfile} onMessage={openMessagesWith} />
          ))}
        </div>
      )}
    </div>
  )
}

function MemberCard({ member, onOpen, onMessage }: { member: Member; onOpen: (id: string) => void; onMessage: (id: string) => void }) {
  return (
    <div onClick={() => onOpen(member.id)} style={{
      backgroundColor: 'var(--color-card)', borderRadius: '12px',
      border: '1px solid var(--color-border)', overflow: 'hidden',
      cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}
    >
      <div style={{ height: '48px', background: 'linear-gradient(135deg, var(--color-navy) 0%, var(--color-navy-light) 100%)' }} />
      <div style={{ padding: '0 16px 16px', marginTop: '-24px' }}>
        {member.avatarUrl
          ? <img src={member.avatarUrl} alt={member.name} style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover', border: '3px solid #fff', display: 'block', marginBottom: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }} />
          : <div style={{ width: '48px', height: '48px', borderRadius: '12px', border: '3px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px', backgroundColor: 'var(--color-navy)', color: '#fff', fontWeight: 800, fontSize: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>{(member.name || '?').slice(0, 2).toUpperCase()}</div>
        }
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 800, fontSize: '14px', color: 'var(--color-text-1)', marginBottom: '2px' }}>
          {member.name}
          {member.badges.includes('verified') && <VerifiedBadge size={13} />}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--color-text-2)', marginBottom: '2px' }}>{member.title}</div>
        <div style={{ fontSize: '11px', color: 'var(--color-text-3)', marginBottom: '8px' }}>{member.church} · {member.location}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '10px' }}>
          {member.badges.filter(b => b !== 'verified').map((b, j) => <Badge key={j} variant={b} size="sm" />)}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
          {member.ministryRoles.map(r => (
            <span key={r} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', backgroundColor: 'var(--color-gold-bg)', color: 'var(--color-gold)', fontWeight: 700 }}>{r}</span>
          ))}
          {member.callings.map((c, j) => (
            <span key={j} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-2)', fontWeight: 500 }}>{c}</span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={e => { e.stopPropagation(); onOpen(member.id) }} style={{
            flex: 1, padding: '7px', borderRadius: '8px', border: 'none',
            backgroundColor: 'var(--color-navy)', color: '#fff',
            fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)',
          }}>View Profile</button>
          <button onClick={e => { e.stopPropagation(); onMessage(member.id) }} style={{
            flex: 1, padding: '7px', borderRadius: '8px', border: '1px solid var(--color-border)',
            background: 'none', color: 'var(--color-text-1)',
            fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)',
          }}>Message</button>
        </div>
      </div>
    </div>
  )
}

function MemberRow({ member, onOpen, onMessage }: { member: Member; onOpen: (id: string) => void; onMessage: (id: string) => void }) {
  return (
    <div onClick={() => onOpen(member.id)} style={{
      backgroundColor: 'var(--color-card)', borderRadius: '12px',
      border: '1px solid var(--color-border)', padding: '16px 20px',
      display: 'flex', alignItems: 'center', gap: '16px',
      cursor: 'pointer', transition: 'background 0.15s',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--color-hover)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--color-card)' }}
    >
      {member.avatarUrl
        ? <img src={member.avatarUrl} alt={member.name} style={{ width: '52px', height: '52px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }} />
        : <div style={{ width: '52px', height: '52px', borderRadius: '12px', flexShrink: 0, backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '18px' }}>{(member.name || '?').slice(0, 2).toUpperCase()}</div>
      }
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 800, fontSize: '15px', color: 'var(--color-text-1)', marginBottom: '2px' }}>
          {member.name}
          {member.badges.includes('verified') && <VerifiedBadge size={14} />}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--color-text-2)', marginBottom: '4px' }}>{member.title} · {member.church} · {member.location}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {member.badges.filter(b => b !== 'verified').map((b, j) => <Badge key={j} variant={b} size="sm" />)}
          {member.ministryRoles.map(r => (
            <span key={r} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', backgroundColor: 'var(--color-gold-bg)', color: 'var(--color-gold)', fontWeight: 700 }}>{r}</span>
          ))}
          {member.callings.map((c, j) => (
            <span key={j} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-2)', fontWeight: 500 }}>{c}</span>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <button onClick={e => { e.stopPropagation(); onOpen(member.id) }} style={{
          padding: '8px 16px', borderRadius: '8px', border: 'none',
          backgroundColor: 'var(--color-navy)', color: '#fff',
          fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)',
        }}>View Profile</button>
        <button onClick={e => { e.stopPropagation(); onMessage(member.id) }} style={{
          padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--color-border)',
          background: 'none', color: 'var(--color-text-1)',
          fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)',
        }}>Message</button>
      </div>
    </div>
  )
}
