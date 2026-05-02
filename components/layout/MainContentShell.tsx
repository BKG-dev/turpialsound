'use client'

import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function MainContentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isMarketplaceRoute = pathname?.startsWith('/marketplace') ?? false

  return (
    <main
      id="main-content"
      className={cn(isMarketplaceRoute ? 'pt-0' : 'pt-16')}
    >
      {children}
    </main>
  )
}
