import { useEffect, useRef, useState } from 'react'
import { advanceScrollNavigation, scrollPosition, type ScrollNavigationState } from '../lib/scrollNavigation'

export function useAutoHideNavigation(routeKey: string, disabled: boolean) {
  const navRef = useRef<HTMLElement>(null)
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 767px)')
    const roots = [document.getElementById('root'), document.body, document.documentElement].filter((node): node is HTMLElement => !!node)
    let scroller = roots.find(node => node.scrollTop > 0) ?? document.scrollingElement as HTMLElement ?? document.documentElement
    const maximum = () => Math.max(0, scroller.scrollHeight - scroller.clientHeight)
    const position = () => scrollPosition(scroller.scrollTop, maximum())
    let state: ScrollNavigationState = { y: position(), direction: 0, distance: 0, hidden: false }
    let frame = 0
    let keyboard = false
    let settling = true
    // Detail views restore their saved page position in a parent effect.
    // Let that restoration finish before measuring user scroll direction.
    let settleFrame = requestAnimationFrame(() => {
      settleFrame = requestAnimationFrame(() => {
        state = { y: position(), direction: 0, distance: 0, hidden: false }
        settling = false
      })
    })
    setHidden(false)
    const reset = () => {
      state = { y: position(), direction: 0, distance: 0, hidden: false }
      setHidden(false)
    }
    const update = () => {
      frame = 0
      // Modal/drawer scrolling never controls page navigation. A Story locks
      // the body directly; other full-screen panels are covered by disabled.
      if (settling || disabled || !mobile.matches || document.body.style.overflow === 'hidden') {
        state = { ...state, y: position(), direction: 0, distance: 0 }
        return
      }
      if (keyboard && navRef.current?.contains(document.activeElement)) { reset(); return }
      state = advanceScrollNavigation(state, scroller.scrollTop, maximum())
      setHidden(state.hidden)
    }
    const onScroll = (event: Event) => {
      // The app's overflow containment can make #root/body the page scroller.
      // Capture their events, while excluding nested lists and modal panels.
      if (event.target === document || event.target === window) scroller = document.scrollingElement as HTMLElement ?? document.documentElement
      else if (roots.includes(event.target as HTMLElement)) scroller = event.target as HTMLElement
      else return
      if (!frame) frame = requestAnimationFrame(update)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab' || e.key.startsWith('Arrow')) {
        keyboard = true
        // Reveal before keyboard users move focus into the navigation.
        reset()
      }
    }
    const onPointer = () => { keyboard = false }
    const onFocus = () => { if (keyboard && navRef.current?.contains(document.activeElement)) reset() }
    window.addEventListener('scroll', onScroll, { passive: true, capture: true })
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointer, { passive: true })
    window.addEventListener('focusin', onFocus)
    window.addEventListener('resize', reset, { passive: true })
    mobile.addEventListener('change', reset)
    return () => {
      cancelAnimationFrame(frame)
      cancelAnimationFrame(settleFrame)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('focusin', onFocus)
      window.removeEventListener('resize', reset)
      mobile.removeEventListener('change', reset)
    }
  }, [routeKey, disabled])
  return { hidden, navRef }
}
