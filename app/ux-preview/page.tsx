import type { Metadata } from 'next'
import UXPreviewClient from './UXPreviewClient'

export const metadata: Metadata = { title: 'UX Preview — Turpial Sound' }
export const dynamic = 'force-dynamic'

export default function UXPreviewPage() {
  return <UXPreviewClient />
}
