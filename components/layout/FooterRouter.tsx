'use client'

import { usePathname } from 'next/navigation'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { MarketplaceFooter } from '@/components/layout/MarketplaceFooter'

export function FooterRouter() {
  const pathname = usePathname()
  const isMarketplace = pathname?.startsWith('/marketplace')

  if (isMarketplace) return <MarketplaceFooter />
  return <SiteFooter />
}
