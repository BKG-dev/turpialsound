'use client'

import { useState } from 'react'

const ACCENT = '#00aeef'
const BG = '#111111'
const CARD = 'rgba(255,255,255,0.03)'
const BORDER = 'rgba(255,255,255,0.06)'
const TEXT = '#f2f2f2'
const MUTED = '#9a9a9a'
const GREEN = '#10b981'
const YELLOW = '#f59e0b'
const RED = '#ef4444'
const BLUE = '#3b82f6'

const statusColor: Record<string, string> = {
  ACTIVE: GREEN, PENDING_PAYMENT: YELLOW, PAYMENT_RECEIVED: YELLOW,
  VALIDATING: BLUE, IN_ESCROW: BLUE, DELIVERY_CONFIRMED: BLUE,
  RELEASED: GREEN, COMPLETED: GREEN, DISPUTED: RED, SOLD_OUT: MUTED,
  DRAFT: MUTED,
}

const statusLabel: Record<string, string> = {
  ACTIVE: 'Activa', PENDING_PAYMENT: 'Pago Pendiente', PAYMENT_RECEIVED: 'Pago Recibido',
  VALIDATING: 'Validando', IN_ESCROW: 'En Escrow', DELIVERY_CONFIRMED: 'Entrega Confirmada',
  RELEASED: 'Liberado', COMPLETED: 'Completado', DISPUTED: 'Disputa', SOLD_OUT: 'Vendido',
  DRAFT: 'Borrador',
}

function Dot({ status }: { status: string }) {
  const c = statusColor[status] || MUTED
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: c, marginRight: 8, flexShrink: 0 }} />
}

function Badge({ label, color }: { label: string; color: string }) {
  return <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: color + '18', color, border: `1px solid ${color}30`, fontWeight: 600, flexShrink: 0 }}>{label}</span>
}

type Listing = { id: string; title: string; status: string; price: string | number; slug: string; inventory?: number | null; city?: string | null; state?: string | null }
type Transaction = { id: string; status: string; amount: string | number; currency: string; listing?: { title?: string } | null; buyer?: { displayName?: string } | null; seller?: { displayName?: string } | null; createdAt: string }
type Thread = { id: string; listing?: { title?: string; slug?: string } | null; lastMessage?: { content?: string } | null; unreadCount?: number }

export default function UserDashboardPreviewClient({
  profile, purchases, sales, threads, myListings,
}: {
  profile: any; purchases: Transaction[]; sales: Transaction[]; threads: Thread[]; myListings: Listing[]
}) {
  const [tab, setTab] = useState('listings')

  const activeCount = myListings.filter(l => l.status === 'ACTIVE').length
  const escrowCount = purchases.filter(t => t.status === 'IN_ESCROW').length
  const saleCount = sales.length + purchases.length

  const tabs = [
    { key: 'listings', label: 'Publicaciones', count: myListings.length },
    { key: 'purchases', label: 'Compras', count: purchases.length },
    { key: 'sales', label: 'Ventas', count: sales.length },
    { key: 'chats', label: 'Chats', count: threads.filter(t => (t.unreadCount || 0) > 0).length },
  ]

  return (
    <div style={{ minHeight: '100vh', background: BG, color: TEXT, fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Top bar */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{profile?.displayName || 'Usuario'}</h1>
          <p style={{ fontSize: 12, color: MUTED, margin: '2px 0 0' }}>UX Preview — Dashboard Opcion 1 (Clean Minimal)</p>
        </div>
        <a href="/ux-preview" style={{ color: ACCENT, fontSize: 13 }}>Volver</a>
      </div>

      <div style={{ padding: '24px 20px', maxWidth: 960, margin: '0 auto' }}>
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 24 }}>
          {[
            { label: 'Activas', value: String(activeCount), color: GREEN },
            { label: 'En Escrow', value: String(escrowCount), color: BLUE },
            { label: 'Transacciones', value: String(saleCount), color: ACCENT },
            { label: 'Chats no leidos', value: String(threads.filter(t => (t.unreadCount || 0) > 0).length), color: YELLOW },
          ].map(kpi => (
            <div key={kpi.label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>{kpi.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: `1px solid ${BORDER}`, paddingBottom: 8 }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                padding: '7px 16px', borderRadius: 8, border: 'none',
                background: tab === t.key ? ACCENT + '15' : 'transparent',
                color: tab === t.key ? ACCENT : MUTED, fontSize: 13, fontWeight: tab === t.key ? 600 : 400,
                cursor: 'pointer', transition: 'all 150ms', display: 'flex', alignItems: 'center', gap: 6,
              }}>
              {t.label}
              {t.count > 0 && <span style={{ background: ACCENT + '25', padding: '1px 7px', borderRadius: 8, fontSize: 11 }}>{t.count}</span>}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === 'listings' && (
          <div>
            {myListings.length === 0 ? (
              <p style={{ color: MUTED, fontSize: 14, textAlign: 'center', padding: 40 }}>No tienes publicaciones aun.</p>
            ) : (
              myListings.map(l => (
                <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${BORDER}` }}>
                  <Dot status={l.status} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: TEXT }}>{l.title}</div>
                    <div style={{ fontSize: 11, color: MUTED }}>{l.city && l.state ? `${l.city}, ${l.state}` : 'Sin ubicacion'} &middot; Stock: {l.inventory ?? '--'}</div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: TEXT }}>${Number(l.price).toFixed(0)}</div>
                  <Badge label={statusLabel[l.status] || l.status} color={statusColor[l.status] || MUTED} />
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'purchases' && (
          <div>
            {purchases.length === 0 ? (
              <p style={{ color: MUTED, fontSize: 14, textAlign: 'center', padding: 40 }}>No tienes compras aun.</p>
            ) : (
              purchases.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${BORDER}` }}>
                  <Dot status={t.status} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: TEXT }}>{t.listing?.title || 'Publicacion'}</div>
                    <div style={{ fontSize: 11, color: MUTED }}>Vendedor: {t.seller?.displayName || '--'} &middot; {new Date(t.createdAt).toLocaleDateString('es-VE')}</div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: TEXT }}>${Number(t.amount).toFixed(0)}</div>
                  <Badge label={statusLabel[t.status] || t.status} color={statusColor[t.status] || MUTED} />
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'sales' && (
          <div>
            {sales.length === 0 ? (
              <p style={{ color: MUTED, fontSize: 14, textAlign: 'center', padding: 40 }}>No tienes ventas aun.</p>
            ) : (
              sales.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${BORDER}` }}>
                  <Dot status={t.status} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: TEXT }}>{t.listing?.title || 'Publicacion'}</div>
                    <div style={{ fontSize: 11, color: MUTED }}>Comprador: {t.buyer?.displayName || '--'} &middot; {new Date(t.createdAt).toLocaleDateString('es-VE')}</div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: TEXT }}>${Number(t.amount).toFixed(0)}</div>
                  <Badge label={statusLabel[t.status] || t.status} color={statusColor[t.status] || MUTED} />
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'chats' && (
          <div>
            {threads.length === 0 ? (
              <p style={{ color: MUTED, fontSize: 14, textAlign: 'center', padding: 40 }}>No tienes chats aun.</p>
            ) : (
              threads.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${BORDER}` }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: (t.unreadCount || 0) > 0 ? ACCENT : MUTED, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: TEXT }}>{t.listing?.title || 'Chat'}</div>
                    <div style={{ fontSize: 11, color: MUTED }}>{t.lastMessage?.content?.slice(0, 60) || 'Sin mensajes'}</div>
                  </div>
                  {(t.unreadCount || 0) > 0 && <Badge label={String(t.unreadCount)} color={ACCENT} />}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
