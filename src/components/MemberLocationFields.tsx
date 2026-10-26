import { countries, subdivisions, type MemberLocation } from '../lib/memberLocation'
import type { CSSProperties } from 'react'

export default function MemberLocationFields({ value, onChange, dark = false }: { value: MemberLocation; onChange: (value: MemberLocation) => void; dark?: boolean }) {
  const regions = subdivisions(value.country)
  const control: CSSProperties = { width: '100%', minWidth: 0, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: dark ? '#26334b' : 'var(--color-surface)', color: dark ? '#fff' : 'var(--color-text-1)', font: 'inherit', fontSize: 14, colorScheme: dark ? 'dark' : undefined }
  const field = (label: string, child: React.ReactNode) => <label style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, color: dark ? '#c5c8ce' : 'var(--color-text-2)', fontSize: 12, fontWeight: 700 }}>{label}{child}</label>
  return <div style={{ display: 'grid', gap: 12 }}>
    {field('Country', <select autoComplete="country" value={value.country} onChange={e => onChange({ ...value, country: e.target.value, state: '' })} style={control}>
      <option value="">Select country</option>{countries.map(country => <option key={country.code} value={country.code}>{country.name}</option>)}
    </select>)}
    {field('City', <input autoComplete="address-level2" value={value.city} placeholder="City" onChange={e => onChange({ ...value, city: e.target.value })} style={control} />)}
    {field(value.country === 'US' ? 'State' : 'State / Province', regions.length ? <select autoComplete="address-level1" value={value.state} onChange={e => onChange({ ...value, state: e.target.value })} style={control}>
      <option value="">Select state / province</option>
      {value.state && !regions.some(region => region.code === value.state) && <option value={value.state}>{value.state}</option>}
      {regions.map(region => <option key={region.code} value={region.code}>{region.name}</option>)}
    </select> : <input autoComplete="address-level1" value={value.state} placeholder="State / Province (optional)" onChange={e => onChange({ ...value, state: e.target.value })} style={control} />)}
  </div>
}
