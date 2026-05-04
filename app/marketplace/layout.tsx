import type { ReactNode } from 'react'
import { MarketplaceThemeProvider } from '@/components/marketplace/MarketplaceTheme'
import { MarketplaceAssistantFab } from '@/components/marketplace/MarketplaceAssistantFab'
import { MarketplaceSessionProvider } from '@/components/marketplace/MarketplaceAuthBar'

export default function MarketplaceLayout({ children }: { children: ReactNode }) {
  return (
    <MarketplaceThemeProvider className="mp-route-shell min-h-screen">
      <MarketplaceSessionProvider>
        <MarketplaceAssistantFab>
          {children}
        </MarketplaceAssistantFab>
      </MarketplaceSessionProvider>
    </MarketplaceThemeProvider>
  )
}
