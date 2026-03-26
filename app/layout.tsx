import type { Metadata } from 'next'
import { Inter, Syne } from 'next/font/google'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { rootMetadata } from '@/lib/metadata'
import { buildOrganizationSchema } from '@/lib/schema'
import '@/styles/globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
  weight: ['400', '600', '700', '800'],
})

export const metadata: Metadata = rootMetadata

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const orgSchema = buildOrganizationSchema()

  return (
    <html lang="es" className={`${inter.variable} ${syne.variable}`}>
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
      </body>
    </html>
  )
}
