import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api-client/server'
import { useAuth } from '../providers/AuthProvider'
import { useUIStore } from '../store/ui'
import { openExternal } from '../lib/openExternal'
import { selectResourceSuggestions, resourcePlaceholder } from '../lib/resourceSuggestions'
import type { Resource } from './ResourcesView'
import './PeopleYouMayKnow.css'
import './RecommendedResources.css'

export default function RecommendedResources() {
  const { currentUser } = useAuth()
  const setActiveView = useUIStore(s => s.setActiveView)
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set())
  const { data } = useQuery({
    queryKey: ['resource-suggestions', currentUser?.id],
    queryFn: () => api<Resource[]>('/resources'),
    enabled: Boolean(currentUser),
  })
  const resources = selectResourceSuggestions(data ?? [], dismissed)
  if (!resources.length) return null

  return (
    <section className="people-suggestions recommended-resources" aria-labelledby="recommended-resources-title">
      <header className="people-suggestions-header">
        <h2 id="recommended-resources-title">Recommended Resources</h2>
        <button type="button" onClick={() => setActiveView('resources')}>See all</button>
      </header>
      <ul className="people-suggestions-track" aria-label="Recommended resources" tabIndex={0}>
        {resources.map(resource => (
          <li className="people-suggestion-card resource-suggestion-card" key={resource.id}>
            <ResourceCover key={resource.img} resource={resource} />
            <button type="button" className="people-suggestion-dismiss" aria-label={`Hide ${resource.title} recommendation`}
              onClick={() => setDismissed(previous => new Set([...previous, resource.id]))}>×</button>
            <div className="people-suggestion-details resource-suggestion-details">
              <div className="resource-suggestion-type">{resource.type}</div>
              <div className="resource-suggestion-title" title={resource.title}>{resource.title}</div>
              <div className="resource-suggestion-author" title={resource.author}>{resource.author || '\u00a0'}</div>
              <button type="button" className="people-suggestion-profile"
                aria-label={`${resource.url ? 'More Info' : 'View Library'}: ${resource.title}`}
                onClick={() => resource.url ? openExternal(resource.url) : setActiveView('resources')}>
                {resource.url ? 'More Info ↗' : 'View Library'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function ResourceCover({ resource }: { resource: Resource }) {
  const [failed, setFailed] = useState(false)
  return resource.img && !failed
    ? <img className="people-suggestion-photo resource-suggestion-cover" src={resource.img} alt="" loading="lazy" onError={() => setFailed(true)} />
    : <div className="people-suggestion-photo people-suggestion-initials" aria-hidden="true">{resourcePlaceholder(resource.type)}</div>
}
