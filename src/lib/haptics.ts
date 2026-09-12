// Haptic feedback wrapper. On native (Capacitor) builds this drives the
// Taptic Engine; on the web it's a no-op so the same code path runs everywhere.
// Every call is fire-and-forget and never throws — haptics are a garnish, not
// a dependency of the interaction they accompany.

import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

const native = Capacitor.isNativePlatform()

/** Light tap — tab switches, small confirmations. */
export function hapticSelection() {
  if (!native) return
  Haptics.selectionStart().catch(() => {})
  Haptics.selectionEnd().catch(() => {})
}

/** Light impact — reactions (Amen/Praying/Bless), sending a message. */
export function hapticImpact() {
  if (!native) return
  Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
}

/** Success — pull-to-refresh completing, a post publishing. */
export function hapticSuccess() {
  if (!native) return
  Haptics.notification({ type: NotificationType.Success }).catch(() => {})
}