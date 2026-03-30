import type { Metadata } from 'next'
import { Inter, Michroma } from 'next/font/google'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { WhatsAppButton } from '@/components/ui/WhatsAppButton'
import { rootMetadata } from '@/lib/metadata'
import { buildOrganizationSchema } from '@/lib/schema'
import '@/styles/globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const michroma = Michroma({
  subsets: ['latin'],
  variable: '--font-michroma',
  display: 'swap',
  weight: '400',
})

export const metadata: Metadata = rootMetadata

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const orgSchema = buildOrganizationSchema()

  return (
    <html lang="es" className={`${inter.variable} ${michroma.variable}`}>
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
        <SiteFooter />
        <WhatsAppButton />
      </body>
    </html>
  )
}
