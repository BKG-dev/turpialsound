'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

type AdminTheme = 'dark' | 'light'

type AdminThemeContextValue = {
  theme: AdminTheme
  toggleTheme: () => void
}

const STORAGE_KEY = 'turpial-admin-theme'

const AdminThemeContext = createContext<AdminThemeContextValue | null>(null)

function getStoredTheme(): AdminTheme | null {
  if (typeof window === 'undefined') return null
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'dark' || stored === 'light') return stored
  return null
}

function getSystemTheme(): AdminTheme {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function applyThemeClass(theme: AdminTheme) {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export function AdminThemeProvider({ children, className }: { children: ReactNode; className?: string }) {
  const [theme, setTheme] = useState<AdminTheme>('dark')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const stored = getStoredTheme()
    const resolved = stored ?? getSystemTheme()
    setTheme(resolved)
    applyThemeClass(resolved)
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    window.localStorage.setItem(STORAGE_KEY, theme)
    applyThemeClass(theme)
  }, [ready, theme])

  const toggleTheme = () => {
    setTheme(current => (current === 'dark' ? 'light' : 'dark'))
  }

  return (
    <AdminThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className={cn('admin-theme-root', className)}>
        {children}
      </div>
    </AdminThemeContext.Provider>
  )
}

export function AdminThemeToggle({ className, compact = false }: { className?: string; compact?: boolean }) {
  const context = useContext(AdminThemeContext)
  const theme = context?.theme ?? 'dark'
  const toggleTheme = context?.toggleTheme ?? (() => {})
  const isDark = theme === 'dark'
  const label = isDark ? 'Modo claro' : 'Modo oscuro'
  const CurrentIcon = isDark ? Moon : Sun

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={isDark}
      aria-label={`Cambiar a ${label.toLowerCase()}`}
      className={cn('mp-theme-toggle', compact && 'mp-theme-toggle--compact', className)}
      data-admin-theme-current={theme}
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
