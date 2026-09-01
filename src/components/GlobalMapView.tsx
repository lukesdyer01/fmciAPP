import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { api } from '../api-client/server'
import { useUIStore } from '../store/ui'

// Vite bundles Leaflet's default marker images at hashed URLs that its own
// CSS doesn't know about — point the default icon at CDN-hosted images
// instead of fighting the bundler over asset paths.
const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

interface MinistryLocation {
  id: string
  name: string
  type: string
  location: string
  address?: string
  img: string
  verified: boolean
  lat: number | null
  lng: number | null
}

export default function GlobalMapView() {
  const [ministries, setMinistries] = useState<MinistryLocation[]>([])
  const [loading, setLoading] = useState(true)
  const setActiveView = useUIStore(s => s.setActiveView)

  useEffect(() => {
    api<MinistryLocation[]>('/orgs/locations').then(setMinistries).catch(() => setMinistries([])).finally(() => setLoading(false))
  }, [])

  const pinned = ministries.filter(m => m.lat != null && m.lng != null)
  const unpinned = ministries.filter(m => m.lat == null || m.lng == null)

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 800, color: 'var(--color-navy)', fontFamily: 'var(--font-sans)' }}>Global Map</h1>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-2)' }}>Every ministry in the FMCI network, by location</p>
      </div>

      {loading && (
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-2)', fontSize: '14px' }}>Loading ministries…</div>
      )}

      {!loading && (
        <div style={{
          height: '520px', borderRadius: '14px', overflow: 'hidden',
          border: '1px solid var(--color-border)', marginBottom: '16px',
        }}>
          <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {pinned.map(m => (
              <Marker key={m.id} position={[m.lat as number, m.lng as number]} icon={markerIcon}>
                <Popup>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    {m.img
                      ? <img src={m.img} alt="" style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover' }} />
                      : <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#1a2a4a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}>🏛</div>
                    }
                    <strong style={{ fontSize: '13px' }}>{m.name}</strong>
                    {m.verified && <span style={{ fontSize: '11px', color: '#047857' }}>✓</span>}
                  </div>
                  <div style={{ fontSize: '12px', color: '#555', marginBottom: '8px' }}>{m.location}</div>
                  <button
                    onClick={() => setActiveView('orgs')}
                    style={{
                      fontSize: '12px', fontWeight: 700, padding: '5px 12px', borderRadius: '6px',
                      border: 'none', backgroundColor: '#1a2a4a', color: '#fff', cursor: 'pointer',
                    }}
                  >View Ministries →</button>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {!loading && ministries.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 24px', backgroundColor: 'var(--color-card)', borderRadius: '12px', border: '1px solid var(--color-border)', color: 'var(--color-text-2)', fontSize: '14px' }}>
          No ministries to show yet.
        </div>
      )}

      {!loading && unpinned.length > 0 && (
        <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '16px 20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' }}>
            📍 Couldn't be placed on the map ({unpinned.length})
          </div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-2)', lineHeight: 1.7 }}>
            {unpinned.map((m, i) => (
              <span key={m.id}>
                <strong style={{ color: 'var(--color-text-1)' }}>{m.name}</strong>{m.location ? ` (${m.location})` : ' (no location set)'}
                {i < unpinned.length - 1 ? ', ' : ''}
              </span>
            ))}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-3)', marginTop: '8px' }}>
            Add a more specific location or full address in the ministry's profile to place it on the map.
          </div>
        </div>
      )}
    </div>
  )
}
