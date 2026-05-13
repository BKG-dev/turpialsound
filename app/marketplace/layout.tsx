import type { ReactNode } from 'react'
import { MarketplaceThemeProvider } from '@/components/marketplace/MarketplaceTheme'
import { MarketplaceAssistantFab } from '@/components/marketplace/MarketplaceAssistantFab'
import { MarketplaceSessionProvider } from '@/components/marketplace/MarketplaceAuthBar'
import { CartProvider } from '@/lib/marketplace/cart-store'
import { CartDrawer } from '@/components/marketplace/CartDrawer'

export default function MarketplaceLayout({ children }: { children: ReactNode }) {
  return (
    <MarketplaceThemeProvider className="mp-route-shell min-h-screen">
      <MarketplaceSessionProvider>
        <CartProvider>
          <MarketplaceAssistantFab>
            {children}
          </MarketplaceAssistantFab>
          <CartDrawer />
        </CartProvider>
      </MarketplaceSessionProvider>
    </MarketplaceThemeProvider>
  )
}
