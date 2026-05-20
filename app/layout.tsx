import type { Metadata, Viewport } from 'next'
import { Michroma } from 'next/font/google'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { FooterRouter } from '@/components/layout/FooterRouter'
import { WhatsAppButton } from '@/components/ui/WhatsAppButton'
import { rootMetadata } from '@/lib/metadata'
import { buildOrganizationSchema } from '@/lib/schema'
import '@/styles/globals.css'

const michroma = Michroma({
  subsets: ['latin'],
  variable: '--font-michroma',
  display: 'swap',
  weight: '400',
})

export const metadata: Metadata = rootMetadata

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const orgSchema = buildOrganizationSchema()

  return (
    <html lang="es" className={michroma.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
      </head>
      <body>
        <SiteHeader />
        <main id="main-content" className="pt-16">
          {children}
        </main>
        <FooterRouter />
        <WhatsAppButton />
      </body>
    </html>
  )
}
