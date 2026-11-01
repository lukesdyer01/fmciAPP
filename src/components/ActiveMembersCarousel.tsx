import { useActiveMembers } from '../api-client/presence'
import { useOpenProfile } from './ProfileView'
import MemberCarouselPhoto from './MemberCarouselPhoto'
import './PeopleYouMayKnow.css'

export default function ActiveMembersCarousel() {
  const members = useActiveMembers()
  const openProfile = useOpenProfile()
  const active = (members.data ?? []).filter(member => Date.parse(member.lastActiveAt) > Date.now() - 5 * 60_000)
  return <section className="people-suggestions active-members-carousel" aria-labelledby="active-members-carousel-title">
    <header className="people-suggestions-header">
      <h2 id="active-members-carousel-title">Active now</h2>
      <span className="active-carousel-description">Recently online</span>
    </header>
    {members.isPending ? <p className="active-carousel-status" role="status">Loading active members…</p>
      : members.isError ? <p className="active-carousel-status">Active members unavailable. <button onClick={() => members.refetch()}>Retry</button></p>
      : !active.length ? <p className="active-carousel-status">No other members active right now.</p>
      : <ul className="people-suggestions-track" aria-label="Recently active members" tabIndex={0}>
        {active.map(member => <li className="people-suggestion-card" key={member.id}>
          <MemberCarouselPhoto key={member.avatarUrl} member={member} />
          <span className="active-carousel-badge" title="Active in the last 5 minutes"><span aria-hidden="true" />Active now</span>
          <div className="people-suggestion-details">
            <div className="people-suggestion-name" title={member.name}>{member.name || 'FMCI Member'}</div>
            <button type="button" className="people-suggestion-profile" onClick={() => openProfile(member.id)} aria-label={`View Profile: ${member.name || 'FMCI Member'}`}>View Profile</button>
          </div>
        </li>)}
      </ul>}
  </section>
}
