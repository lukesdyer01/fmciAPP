export type BadgeVariant =
  | 'verified'
  | 'apostolic'
  | 'leadership'
  | 'pastor'
  | 'overseer'
  | 'admin'
  | 'pending'
  | 'church'
  | 'ministry'

const CONFIG: Record<BadgeVariant, { label: string; bg: string; color: string; icon: string }> = {
  verified:    { label: 'Verified Member',         bg: '#EFF6FF', color: '#1D4ED8', icon: '✓' },
  apostolic:   { label: 'Apostolic Council',       bg: '#F5F3FF', color: '#6D28D9', icon: '✦' },
  leadership:  { label: 'FMCI Leadership',         bg: '#FBF5E6', color: '#92700A', icon: '★' },
  pastor:      { label: 'Verified Pastor',         bg: '#ECFDF5', color: '#047857', icon: '✝' },
  overseer:    { label: 'Regional Overseer',       bg: '#FFF7ED', color: '#C2410C', icon: '◈' },
  admin:       { label: 'FMCI Admin',              bg: '#FEF2F2', color: '#991B1B', icon: '⬡' },
  pending:     { label: 'Pending Verification',    bg: '#F9FAFB', color: '#6B7280', icon: '○' },
  church:      { label: 'Verified Church',         bg: '#EFF6FF', color: '#1D4ED8', icon: '⛪' },
  ministry:    { label: 'Verified Ministry',       bg: '#F5F3FF', color: '#6D28D9', icon: '✦' },
}

interface Props {
  variant: BadgeVariant
  size?: 'sm' | 'md'
  showLabel?: boolean
}

export default function Badge({ variant, size = 'sm', showLabel = true }: Props) {
  const c = CONFIG[variant]
  const isSmall = size === 'sm'

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: isSmall ? '2px 7px' : '4px 10px',
      borderRadius: '20px',
      backgroundColor: c.bg,
      color: c.color,
      fontSize: isSmall ? '11px' : '12px',
      fontWeight: 700,
      letterSpacing: '0.1px',
      whiteSpace: 'nowrap',
      border: `1px solid ${c.color}22`,
    }}>
      <span style={{ fontSize: isSmall ? '10px' : '11px' }}>{c.icon}</span>
      {showLabel && c.label}
    </span>
  )
}
