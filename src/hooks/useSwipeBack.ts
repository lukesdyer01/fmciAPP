// iOS edge-swipe-to-go-back. The left-edge swipe is muscle memory for iPhone
// users — this restores it for the app's pushState-driven detail views
// (profile, ministry, event, blog article) without a router dependency.
//
// Only a horizontal drag that starts within ~24px of the left edge and moves
// right past 80px counts; everything else (vertical scrolling, swipes that
// start mid-screen) is left untouched.

import { useEffect, useRef } from 'react'

const EDGE_ZONE = 24
const TRIGGER_DISTANCE = 80

export function useSwipeBack(onBack: () => void) {
  const startX = useRef(0)
  const tracking = useRef(false)
  const onBackRef = useRef(onBack)
  onBackRef.current = onBack

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      const t = e.touches[0]
      if (t.clientX <= EDGE_ZONE) {
        startX.current = t.clientX
        tracking.current = true
      }
    }
    function onTouchMove(e: TouchEvent) {
      if (!tracking.current) return
      const dx = e.touches[0].clientX - startX.current
      if (dx > TRIGGER_DISTANCE) {
        tracking.current = false
        onBackRef.current()
      }
    }
    function onTouchEnd() {
      tracking.current = false
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [])
}