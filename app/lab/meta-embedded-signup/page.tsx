import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import EmbeddedSignupLabClient from './EmbeddedSignupLabClient'

type SearchParamValue = string | string[] | undefined

interface MetaEmbeddedSignupLabPageProps {
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
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) {
    return value[0].trim()
  }

  return null
}

export default async function MetaEmbeddedSignupLabPage({
  searchParams,
}: MetaEmbeddedSignupLabPageProps) {
  const enabled = process.env.META_EMBEDDED_SIGNUP_LAB_ENABLED?.trim().toLowerCase() === 'true'
  if (!enabled) {
    notFound()
  }

  const configuredSecret = process.env.META_EMBEDDED_SIGNUP_LAB_SECRET?.trim() ?? ''
  const params = (await searchParams) ?? {}
  const requestSecret = getSingleValue(params.secret)

  // Fail closed: if there is no configured secret, do not expose the LAB.
  if (!configuredSecret || requestSecret !== configuredSecret) {
    notFound()
  }

  const appId = process.env.NEXT_PUBLIC_META_APP_ID?.trim() ?? ''
  const configId = process.env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID?.trim() ?? ''

  return <EmbeddedSignupLabClient appId={appId} configId={configId} />
}
