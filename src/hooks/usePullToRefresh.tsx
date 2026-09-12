// Pull-to-refresh for the feed and list views. Works in the browser and the
// Capacitor WebView alike (no native plugin needed): when the page is scrolled
// to the very top and the user drags down past a threshold, the callback runs
// and a branded spinner shows while it's in flight.

import { useEffect, useRef, useState } from 'react'
import { hapticSuccess } from '../lib/haptics'

const THRESHOLD = 64
const MAX_PULL = 110

export function usePullToRefresh(onRefresh: () => Promise<unknown> | void) {
  const [pulling, setPulling] = useState(false)
  const [distance, setDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(0)
  const tracking = useRef(false)
  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      // Only engage when the page is already at the top — pulling anywhere
      // else is just normal scrolling.
      if (window.scrollY > 0) return
      if (e.touches[0].clientY < 0) return
      startY.current = e.touches[0].clientY
      tracking.current = true
      setPulling(true)
    }
    function onTouchMove(e: TouchEvent) {
      if (!tracking.current || refreshing) return
      const dy = e.touches[0].clientY - startY.current
      if (dy <= 0) {
        setDistance(0)
        return
      }
      // Resistance: the indicator moves slower than the finger, like the
      // native UIRefreshControl.
      setDistance(Math.min(dy * 0.5, MAX_PULL))
    }
    async function onTouchEnd() {
      if (!tracking.current) return
      tracking.current = false
      setPulling(false)
      if (distance >= THRESHOLD) {
        setRefreshing(true)
        try {
          await onRefreshRef.current()
          hapticSuccess()
        } finally {
          setRefreshing(false)
          setDistance(0)
        }
      } else {
        setDistance(0)
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [refreshing, distance])

  return { refreshing, pulling, distance }
}

/** The visual indicator — a small navy spinner that rides the pull distance. */
export function RefreshIndicator({ refreshing, pulling, distance }: {
  refreshing: boolean
  pulling: boolean
  distance: number
}) {
  if (!refreshing && !pulling) return null
  const show = refreshing || distance > 8
  return (
    <div style={{
      position: 'fixed', top: 'calc(56px + var(--safe-top))', left: 0, right: 0,
      display: 'flex', justifyContent: 'center', pointerEvents: 'none',
      zIndex: 150, opacity: show ? 1 : 0,
      transform: `translateY(${refreshing ? 0 : distance - 40}px)`,
      transition: refreshing ? 'none' : 'transform 0.15s, opacity 0.15s',
    }}>
      <div style={{
        width: '34px', height: '34px', borderRadius: '50%',
        backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: '16px', height: '16px', borderRadius: '50%',
          border: '2px solid var(--color-border)',
          borderTopColor: 'var(--color-navy)',
          animation: refreshing ? 'fmci-spin 0.7s linear infinite' : 'none',
          transform: refreshing ? 'none' : `rotate(${Math.min(distance / THRESHOLD, 1) * 180}deg)`,
        }} />
      </div>
    </div>
  )
}