import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'

// A plain <a target="_blank"> just navigates the app's single WebView away
// with no way back inside a Capacitor shell. Opens in an in-app browser
// sheet natively; falls back to a normal new-tab open on the web.
export function openExternal(url: string) {
  if (!url) return
  if (Capacitor.isNativePlatform()) {
    Browser.open({ url })
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}
