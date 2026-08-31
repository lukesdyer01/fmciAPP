import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type ColorScheme = 'light' | 'dark'

interface ThemeContextValue {
  colorScheme: ColorScheme
  toggleColorScheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  colorScheme: 'light',
  toggleColorScheme: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [colorScheme, setColorScheme] = useState<ColorScheme>(() => {
    const stored = localStorage.getItem('ic-color-scheme')
    if (stored === 'dark' || stored === 'light') return stored
    return 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', colorScheme)
    localStorage.setItem('ic-color-scheme', colorScheme)
  }, [colorScheme])

  const toggleColorScheme = () =>
    setColorScheme(s => (s === 'light' ? 'dark' : 'light'))

  return (
    <ThemeContext.Provider value={{ colorScheme, toggleColorScheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useColorScheme() {
  return useContext(ThemeContext)
}
