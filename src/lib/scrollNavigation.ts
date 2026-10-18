export interface ScrollNavigationState {
  y: number
  direction: number
  distance: number
  hidden: boolean
}
export function scrollPosition(y: number, maximum: number): number {
  return Math.max(0, Math.min(y, Math.max(0, maximum)))
}
export function advanceScrollNavigation(state: ScrollNavigationState, rawY: number, maximum: number): ScrollNavigationState {
  const y = scrollPosition(rawY, maximum)
  if (y <= 24) return { y, direction: 0, distance: 0, hidden: false }
  const delta = y - state.y
  if (!delta) return state
  const direction = Math.sign(delta)
  const distance = direction === state.direction ? state.distance + Math.abs(delta) : Math.abs(delta)
  const crossed = distance >= (direction > 0 ? 16 : 8)
  return { y, direction, distance: crossed ? 0 : distance, hidden: crossed ? direction > 0 : state.hidden }
}
