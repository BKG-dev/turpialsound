import type { ReactNode } from 'react'
import { MarketplaceThemeProvider } from '@/components/marketplace/MarketplaceTheme'
import { MarketplaceAssistantFab } from '@/components/marketplace/MarketplaceAssistantFab'

export default function MarketplaceLayout({ children }: { children: ReactNode }) {
  return (
    <MarketplaceThemeProvider className="mp-route-shell min-h-screen">
      <MarketplaceAssistantFab>
        {children}
      </MarketplaceAssistantFab>
    </MarketplaceThemeProvider>
  )
}
