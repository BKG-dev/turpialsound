'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from 'react'

const ACCENT = '#00aeef'; const BG = '#111111'; const CARD = 'rgba(255,255,255,0.03)'
const BORDER = 'rgba(255,255,255,0.06)'; const TEXT = '#f2f2f2'; const MUTED = '#9a9a9a'
const GREEN = '#10b981'; const YELLOW = '#f59e0b'; const RED = '#ef4444'; const BLUE = '#3b82f6'

function _Dot({ color: _c }: { color: string }) { return null }

function Badge({ label, color }: { label: string; color: string }) {
  return <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: color + '18', color, border: `1px solid ${color}30`, fontWeight: 600 }}>{label}</span>
}

type TabKey = 'payments' | 'payouts' | 'users' | 'transactions' | 'listings' | 'messages'

interface TabConfig { key: TabKey; label: string; endpoint: string }

const TABS: TabConfig[] = [
  { key: 'payments', label: 'Pagos', endpoint: '/api/admin/export-payouts?format=json' },
  { key: 'payouts', label: 'Liquidaciones', endpoint: '/api/admin/export-payouts?format=json' },
  { key: 'users', label: 'Usuarios', endpoint: '/api/admin/export-payouts?format=json' },
  { key: 'transactions', label: 'Transacciones', endpoint: '/api/admin/export-payouts?format=json' },
  { key: 'listings', label: 'Publicaciones', endpoint: '/api/admin/export-payouts?format=json' },
  { key: 'messages', label: 'Mensajes', endpoint: '/api/admin/export-payouts?format=json' },
]

const STATUS_COLOR: Record<string, string> = {
  PENDING: YELLOW, COMPLETED: GREEN, FAILED: RED, RELEASED: GREEN,
  IN_ESCROW: BLUE, PENDING_PAYMENT: YELLOW, DISPUTED: RED,
  ACTIVE: GREEN, DRAFT: MUTED, SOLD_OUT: MUTED,
}

type Payout = { payoutId: string; amount: string | number; status: string; completedAt?: string; seller?: { name?: string; email?: string }; transactions?: any[] }

export default function AdminDashboardPreviewClient({ userId: _u }: { userId: string }) {
  const [tab, setTab] = useState<TabKey>('payments')
  const [data, setData] = useState<Payout[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true); setError('')
    fetch(TABS.find(t => t.key === tab)!.endpoint)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setData([]) }
        else { setData(d.payouts || d.data || []) }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [tab])

  const totalAmount = data.reduce((sum: number, p: Payout) => sum + Number(p.amount || 0), 0)
  const activeCount = data.filter(p => p.status === 'PENDING').length
  const completedCount = data.filter(p => p.status === 'COMPLETED').length

  return (
    <div style={{ minHeight: '100vh', background: BG, color: TEXT, fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Admin Dashboard</h1>
          <p style={{ fontSize: 12, color: MUTED, margin: '2px 0 0' }}>UX Preview — Opcion 3 (Full Viewport List)</p>
        </div>
        <a href="/ux-preview" style={{ color: ACCENT, fontSize: 13 }}>Volver</a>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left panel: KPIs + tabs */}
        <div style={{ width: 200, flexShrink: 0, padding: '14px 12px', borderRight: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'auto' }}>
          {/* KPIs */}
          {[{ label: 'Total', value: `$${totalAmount.toFixed(0)}`, color: ACCENT },
            { label: 'Pendientes', value: String(activeCount), color: YELLOW },
            { label: 'Completados', value: String(completedCount), color: GREEN },
          ].map(kpi => (
            <div key={kpi.label} style={{ background: CARD, borderRadius: 10, padding: '8px 10px' }}>
              <div style={{ fontSize: 10, color: MUTED }}>{kpi.label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            </div>
          ))}

          {/* Tabs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{
                  padding: '8px 12px', borderRadius: 8, border: 'none', textAlign: 'left',
                  background: tab === t.key ? ACCENT + '15' : 'transparent',
                  color: tab === t.key ? ACCENT : MUTED, fontSize: 13, fontWeight: tab === t.key ? 600 : 400,
                  cursor: 'pointer', transition: 'all 150ms',
                }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: data table */}
        <div style={{ flex: 1, padding: '12px 16px', overflow: 'auto' }}>
          {loading && <p style={{ color: MUTED, textAlign: 'center', padding: 40 }}>Cargando...</p>}
          {error && <p style={{ color: RED, fontSize: 14, textAlign: 'center', padding: 40 }}>{error}</p>}
          {!loading && !error && data.length === 0 && (
            <p style={{ color: MUTED, fontSize: 14, textAlign: 'center', padding: 40 }}>No hay datos para esta vista.</p>
          )}
          {!loading && !error && data.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}`, position: 'sticky', top: 0, background: BG }}>
                  <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, color: MUTED, fontWeight: 500 }}>ID</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, color: MUTED, fontWeight: 500 }}>Vendedor</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 11, color: MUTED, fontWeight: 500 }}>Monto</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, color: MUTED, fontWeight: 500 }}>Estado</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, color: MUTED, fontWeight: 500 }}>Fecha</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, color: MUTED, fontWeight: 500 }}>TXs</th>
                </tr>
              </thead>
              <tbody>
                {data.map((p: Payout, i: number) => (
                  <tr key={p.payoutId || i}
                    style={{ borderBottom: `1px solid ${BORDER}`, cursor: 'pointer', transition: 'background 150ms' }}
                    onMouseEnter={e => (e.currentTarget.style.background = CARD)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '8px 10px', color: MUTED, fontSize: 12 }}>{String(p.payoutId).slice(0, 10)}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <div style={{ color: TEXT, fontWeight: 500 }}>{p.seller?.name || '--'}</div>
                      <div style={{ fontSize: 11, color: MUTED }}>{p.seller?.email || ''}</div>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: GREEN }}>${Number(p.amount || 0).toFixed(0)}</td>
                    <td style={{ padding: '8px 10px' }}><Badge label={p.status} color={STATUS_COLOR[p.status] || MUTED} /></td>
                    <td style={{ padding: '8px 10px', color: MUTED, fontSize: 12 }}>{p.completedAt ? new Date(p.completedAt).toLocaleDateString('es-VE') : '--'}</td>
                    <td style={{ padding: '8px 10px', color: MUTED, fontSize: 12 }}>{p.transactions?.length || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
