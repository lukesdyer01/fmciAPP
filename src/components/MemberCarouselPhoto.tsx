import { useState } from 'react'
import { memberInitials } from '../lib/peopleSuggestions'
export default function MemberCarouselPhoto({ member }: { member: { name: string; avatarUrl: string } }) {
  const [failed, setFailed] = useState(false)
  return member.avatarUrl && !failed
    ? <img className="people-suggestion-photo" src={member.avatarUrl} alt="" loading="lazy" onError={() => setFailed(true)} />
    : <div className="people-suggestion-photo people-suggestion-initials" aria-hidden="true">{memberInitials(member.name)}</div>
}
