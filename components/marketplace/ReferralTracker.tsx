'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'

export function ReferralTracker() {
  const searchParams = useSearchParams()
  const ref = searchParams.get('ref')
  const ran = useRef(false)

  useEffect(() => {
    if (!ref || ran.current) return
    ran.current = true

    // Setear cookie mp_ref (30 dias)
    document.cookie = `mp_ref=${ref}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`

    // Trackear click (fire-and-forget)
    fetch(`/api/marketplace/track-referral-click?code=${encodeURIComponent(ref)}`).catch(() => {})
  }, [ref])

  return null
}
