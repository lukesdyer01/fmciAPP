import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api-client/server'
import { useAuth } from '../providers/AuthProvider'
import { useUIStore } from '../store/ui'
import { useOpenProfile } from './ProfileView'
import { memberInitials, rankPeopleSuggestions, type SuggestedMember } from '../lib/peopleSuggestions'
import './PeopleYouMayKnow.css'

export default function PeopleYouMayKnow() {
  const { currentUser } = useAuth()
  const profile = useUIStore(s => s.userProfile)
  const setActiveView = useUIStore(s => s.setActiveView)
  const openProfile = useOpenProfile()
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set())
  const { data } = useQuery({
    queryKey: ['people-suggestions', currentUser?.id],
    queryFn: () => api<SuggestedMember[]>('/members'),
    enabled: Boolean(currentUser),
  })
  const members = rankPeopleSuggestions(data ?? [], profile, currentUser?.id)
    .filter(member => !dismissed.has(member.id)).slice(0, 8)

  if (!members.length) return null

  return (
    <section className="people-suggestions" aria-labelledby="people-suggestions-title">
      <header className="people-suggestions-header">
        <h2 id="people-suggestions-title">People You May Know</h2>
        <button type="button" onClick={() => setActiveView('directory')}>See all</button>
      </header>
      <ul className="people-suggestions-track" aria-label="Suggested members" tabIndex={0}>
        {members.map(member => (
          <li className="people-suggestion-card" key={member.id}>
            <SuggestionPhoto key={member.avatarUrl} member={member} />
            <button type="button" className="people-suggestion-dismiss" aria-label={`Hide ${member.name || 'member'} suggestion`}
              onClick={() => setDismissed(previous => new Set([...previous, member.id]))}>×</button>
            <div className="people-suggestion-details">
              <div className="people-suggestion-name" title={member.name}>{member.name || 'FMCI Member'}</div>
              <button type="button" className="people-suggestion-profile" onClick={() => openProfile(member.id)}
                aria-label={`View Profile: ${member.name || 'FMCI Member'}`}>View Profile</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function SuggestionPhoto({ member }: { member: SuggestedMember }) {
  const [failed, setFailed] = useState(false)
  return member.avatarUrl && !failed
    ? <img className="people-suggestion-photo" src={member.avatarUrl} alt="" loading="lazy" onError={() => setFailed(true)} />
    : <div className="people-suggestion-photo people-suggestion-initials" aria-hidden="true">{memberInitials(member.name)}</div>
}
