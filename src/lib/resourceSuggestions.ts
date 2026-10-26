export function selectResourceSuggestions<T extends { id: string; recommended: boolean }>(resources: T[], dismissed: ReadonlySet<string> = new Set()): T[] {
  return resources.filter(resource => !dismissed.has(resource.id))
    .sort((a, b) => Number(b.recommended) - Number(a.recommended)).slice(0, 8)
}

export function feedCarouselPosition(itemCount: number, preferredPosition: number) {
  return Math.min(itemCount, preferredPosition)
}

export function resourcePlaceholder(type: string) {
  return ({ Book: '📖', Video: '▶', Podcast: '🎙', Course: '🎓', Article: '📄' } as Record<string, string>)[type] ?? '📚'
}
