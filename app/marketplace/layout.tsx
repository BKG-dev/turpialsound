import type { ReactNode } from 'react'
import { MarketplaceThemeProvider } from '@/components/marketplace/MarketplaceTheme'

export default function MarketplaceLayout({ children }: { children: ReactNode }) {
  return (
    <MarketplaceThemeProvider className="mp-route-shell min-h-screen">
      {children}
    </MarketplaceThemeProvider>
  )
}
