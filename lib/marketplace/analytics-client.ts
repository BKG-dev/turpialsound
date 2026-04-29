'use client'

import type { MarketplaceAnalyticsEventType } from '@/lib/marketplace/analytics'

type TrackMarketplaceClientEventInput = {
  eventType: MarketplaceAnalyticsEventType
  listingId?: string
  transactionId?: string
  metadataJson?: Record<string, string | number | boolean>
}

const SESSION_STORAGE_KEY = 'mp_analytics_session_id'

function getSessionId() {
  try {
    const existing = window.localStorage.getItem(SESSION_STORAGE_KEY)
    if (existing) return existing
    const next = crypto.randomUUID()
    window.localStorage.setItem(SESSION_STORAGE_KEY, next)
    return next
  } catch {
    return undefined
  }
}

function getDeviceLabel() {
  if (typeof navigator === 'undefined') return 'unknown'
  const width = typeof window !== 'undefined' ? window.innerWidth : 0
  const form = width > 0 && width < 768 ? 'mobile' : 'desktop'
  return `${form}:${navigator.platform || 'web'}`
}

export function trackMarketplaceClientEvent(input: TrackMarketplaceClientEventInput) {
  if (typeof window === 'undefined') return

  const payload = {
    eventType: input.eventType,
    listingId: input.listingId,
    transactionId: input.transactionId,
    sessionId: getSessionId(),
    path: window.location.pathname,
    referrer: document.referrer || undefined,
    device: getDeviceLabel(),
    metadataJson: input.metadataJson,
  }

  const body = JSON.stringify(payload)
  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' })
    navigator.sendBeacon('/api/marketplace/analytics/event', blob)
    return
  }

  fetch('/api/marketplace/analytics/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {})
}
