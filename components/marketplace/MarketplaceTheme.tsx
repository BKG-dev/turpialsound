'use client'

import { createContext, useContext, useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

type MarketplaceTheme = 'dark' | 'light'

type MarketplaceThemeContextValue = {
  theme: MarketplaceTheme
  setTheme: Dispatch<SetStateAction<MarketplaceTheme>>
  toggleTheme: () => void
}

const STORAGE_KEY = 'turpial-marketplace-theme'
const THEME_BOOTSTRAP_SCRIPT = `
try {
  var key = 'turpial-marketplace-theme';
  var stored = window.localStorage.getItem(key);
  var theme = stored === 'dark' || stored === 'light'
    ? stored
    : (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  var root = document.currentScript && document.currentScript.parentElement;
  if (root) root.setAttribute('data-marketplace-theme', theme);
} catch (error) {}
`

const MarketplaceThemeContext = createContext<MarketplaceThemeContextValue | null>(null)

function getPreferredTheme(): MarketplaceTheme {
  if (typeof window === 'undefined') return 'dark'

  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'dark' || stored === 'light') return stored

  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function MarketplaceThemeProvider({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const [theme, setTheme] = useState<MarketplaceTheme>('dark')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setTheme(getPreferredTheme())
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    window.localStorage.setItem(STORAGE_KEY, theme)
  }, [ready, theme])

  const toggleTheme = () => {
    setTheme(current => (current === 'dark' ? 'light' : 'dark'))
  }

  return (
    <MarketplaceThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      <div
        className={cn('mp-theme-root', className)}
        data-marketplace-theme={theme}
        suppressHydrationWarning
      >
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
        {children}
      </div>
    </MarketplaceThemeContext.Provider>
  )
}

export function MarketplaceThemeToggle({
  className,
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  const context = useContext(MarketplaceThemeContext)
  const theme = context?.theme ?? 'dark'
  const toggleTheme = context?.toggleTheme ?? (() => {})
  const isDark = theme === 'dark'
  const targetTheme: MarketplaceTheme = isDark ? 'light' : 'dark'
  const label = targetTheme === 'dark' ? 'Modo oscuro' : 'Modo claro'
  const CurrentIcon = isDark ? Moon : Sun

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={isDark}
      aria-label={`Cambiar a ${label.toLowerCase()}`}
      className={cn('mp-theme-toggle', compact && 'mp-theme-toggle--compact', className)}
      data-marketplace-theme-current={theme}
    >
      <span className="mp-theme-toggle__track" aria-hidden="true">
        <span className="mp-theme-toggle__icon mp-theme-toggle__icon--light">
          <Sun size={11} />
        </span>
        <span className="mp-theme-toggle__icon mp-theme-toggle__icon--dark">
          <Moon size={11} />
        </span>
        <span className="mp-theme-toggle__thumb">
          <CurrentIcon size={12} />
        </span>
      </span>
      <span className="mp-theme-toggle__label">{label}</span>
    </button>
  )
}
