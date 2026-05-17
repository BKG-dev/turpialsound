import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import WhatsappReservaTokenLabClient from './WhatsappReservaTokenLabClient'

type SearchParamValue = string | string[] | undefined

interface PageProps {
  searchParams?:
    | Promise<{
        secret?: SearchParamValue
      }>
    | {
        secret?: SearchParamValue
      }
}

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
}

function getSingleValue(value: SearchParamValue): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) return value[0].trim()
  return null
}

export default async function WhatsappReservaTokenLabPage({ searchParams }: PageProps) {
  const enabled = process.env.WHATSAPP_LAB_ENABLED?.trim().toLowerCase() === 'true'
  if (!enabled) notFound()

  const configuredSecret = process.env.WHATSAPP_LAB_SECRET?.trim() ?? ''
  const params = (await searchParams) ?? {}
  const requestSecret = getSingleValue(params.secret)
  if (!configuredSecret || requestSecret !== configuredSecret) notFound()

  return <WhatsappReservaTokenLabClient secret={configuredSecret} />
}
