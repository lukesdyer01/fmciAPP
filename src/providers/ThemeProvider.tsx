import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type ColorScheme = 'light' | 'dark'
const USER_CHOICE_KEY = 'ic-color-scheme-user-choice'
const LEGACY_CHOICE_KEY = 'ic-color-scheme'

function nativeColorScheme(): ColorScheme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function initialColorScheme(): ColorScheme {
  const savedChoice = localStorage.getItem(USER_CHOICE_KEY)
  if (savedChoice === 'dark' || savedChoice === 'light') return savedChoice

  // Older versions wrote "light" on every visit, even when the user had
  // never chosen a theme. Preserve an old dark choice (the non-default), but
  // let the device preference replace the old implicit light default.
  const legacyChoice = localStorage.getItem(LEGACY_CHOICE_KEY)
  localStorage.removeItem(LEGACY_CHOICE_KEY)
  if (legacyChoice === 'dark') {
    localStorage.setItem(USER_CHOICE_KEY, 'dark')
    return 'dark'
  }
  return nativeColorScheme()
}

interface ThemeContextValue {
  colorScheme: ColorScheme
  toggleColorScheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  colorScheme: 'light',
  toggleColorScheme: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [colorScheme, setColorScheme] = useState<ColorScheme>(initialColorScheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', colorScheme)
  }, [colorScheme])

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!media) return
    const followSystem = () => {
      if (!localStorage.getItem(USER_CHOICE_KEY)) setColorScheme(media.matches ? 'dark' : 'light')
    }
    media.addEventListener?.('change', followSystem)
    return () => media.removeEventListener?.('change', followSystem)
  }, [])

  const toggleColorScheme = () => setColorScheme(current => {
    const next = current === 'light' ? 'dark' : 'light'
    localStorage.setItem(USER_CHOICE_KEY, next)
    return next
  })

  return (
    <ThemeContext.Provider value={{ colorScheme, toggleColorScheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useColorScheme() {
  return useContext(ThemeContext)
}
