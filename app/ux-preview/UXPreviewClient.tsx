'use client'

import { useState } from 'react'

type Variant = 'variant1' | 'variant2' | 'variant3'
type View = 'dashboard' | 'modal'

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
  active: GREEN,
  pending: YELLOW,
  escrow: BLUE,
  completed: GREEN,
  dispute: RED,
  released: GREEN,
  sold: MUTED,
}

const mockListings = [
  { title: 'Guitarra Electrica Fender', price: '$450', status: 'active', sales: 3, stock: 2, date: '14 May' },
  { title: 'Amplificador Marshall', price: '$280', status: 'pending', sales: 1, stock: 4, date: '13 May' },
  { title: 'Teclado Yamaha PSR', price: '$320', status: 'escrow', sales: 2, stock: 1, date: '12 May' },
  { title: 'Microfono Shure SM58', price: '$85', status: 'sold', sales: 5, stock: 0, date: '10 May' },
]

const mockTrans = [
  { id: 'TX-001', item: 'Guitarra Fender', buyer: 'compradorIA', amount: '$450', status: 'escrow', step: 3 },
  { id: 'TX-002', item: 'Amplificador Marshall', buyer: 'user_test', amount: '$280', status: 'pending', step: 1 },
  { id: 'TX-003', item: 'Teclado Yamaha', buyer: 'musico_ve', amount: '$320', status: 'completed', step: 5 },
]

function Dot({ status }: { status: string }) {
  const c = statusColor[status] || MUTED
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: c, marginRight: 6 }} />
}

function Badge({ label, color }: { label: string; color: string }) {
  return <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: color + '20', color, border: `1px solid ${color}40`, fontWeight: 600 }}>{label}</span>
}

// ─── DASHBOARD VARIANT 1: Clean Minimal ───
function DashboardV1() {
  return (
    <div style={{ padding: '24px 20px', maxWidth: 960, margin: '0 auto' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: TEXT, marginBottom: 4 }}>Dashboard</h2>
      <p style={{ fontSize: 13, color: MUTED, marginBottom: 24 }}>Tus publicaciones y transacciones</p>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[{ label: 'Activas', value: '3', color: GREEN }, { label: 'En Escrow', value: '1', color: BLUE }, { label: 'Ventas', value: '11', color: ACCENT }, { label: 'Ganancias', value: '$1,420', color: GREEN }].map(kpi => (
          <div key={kpi.label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, color: MUTED, marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Listings */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: TEXT, marginBottom: 12 }}>Publicaciones</h3>
        {mockListings.map(l => (
          <div key={l.title} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${BORDER}` }}>
            <Dot status={l.status} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: TEXT }}>{l.title}</div>
              <div style={{ fontSize: 12, color: MUTED }}>{l.stock} disponible &middot; {l.sales} ventas</div>
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: TEXT }}>{l.price}</div>
            <Badge label={l.status} color={statusColor[l.status]} />
          </div>
        ))}
      </div>

      {/* Transactions */}
      <h3 style={{ fontSize: 15, fontWeight: 600, color: TEXT, marginBottom: 12 }}>Transacciones</h3>
      {mockTrans.map(t => (
        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${BORDER}` }}>
          <Dot status={t.status} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, color: TEXT }}>{t.item}</div>
            <div style={{ fontSize: 12, color: MUTED }}>{t.id} &middot; {t.buyer}</div>
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: TEXT }}>{t.amount}</div>
          <div style={{ display: 'flex', gap: 3 }}>
            {[1, 2, 3, 4, 5].map(s => (
              <div key={s} style={{ width: 16, height: 4, borderRadius: 2, background: s <= t.step ? statusColor[t.status] : 'rgba(255,255,255,0.08)' }} />
            ))}
          </div>
          <Badge label={t.status} color={statusColor[t.status]} />
        </div>
      ))}
    </div>
  )
}

// ─── DASHBOARD VARIANT 2: Card Grid ───
function DashboardV2() {
  return (
    <div style={{ padding: '24px 20px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: TEXT, marginBottom: 4 }}>Dashboard</h2>
          <p style={{ fontSize: 13, color: MUTED }}>Resumen de tu actividad</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['Activas', 'Vendidas', 'Escrow'].map(t => (
            <button key={t} style={{ background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '6px 14px', color: MUTED, fontSize: 12, cursor: 'pointer' }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Card grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 32 }}>
        {mockListings.map(l => (
          <div key={l.title} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18, transition: 'border-color 200ms', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = ACCENT + '60')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: TEXT }}>{l.title}</div>
              <Badge label={l.status} color={statusColor[l.status]} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: TEXT, marginBottom: 8 }}>{l.price}</div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: MUTED }}>
              <span>{l.stock} disponible</span>
              <span>{l.sales} ventas</span>
              <span>{l.date}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Transactions compact */}
      <h3 style={{ fontSize: 15, fontWeight: 600, color: TEXT, marginBottom: 12 }}>Transacciones recientes</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {mockTrans.map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10 }}>
            <Dot status={t.status} />
            <div style={{ flex: 1, fontSize: 14, color: TEXT }}>{t.item} <span style={{ color: MUTED, fontSize: 12 }}>&middot; {t.buyer}</span></div>
            <div style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{t.amount}</div>
            <Badge label={t.status} color={statusColor[t.status]} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── DASHBOARD VARIANT 3: List View + Full Viewport ───
function DashboardV3() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: '100%' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: `1px solid ${BORDER}`, background: 'rgba(0,0,0,0.3)', flexShrink: 0 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT }}>Dashboard</h2>
        <div style={{ display: 'flex', gap: 6 }}>
          {['Publicaciones', 'Transacciones', 'Chats'].map(t => (
            <button key={t} style={{ background: t === 'Publicaciones' ? ACCENT + '20' : 'transparent', border: 'none', borderRadius: 6, padding: '6px 12px', color: t === 'Publicaciones' ? ACCENT : MUTED, fontSize: 12, cursor: 'pointer' }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Content area — no scroll */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left panel: KPIs */}
        <div style={{ width: 200, flexShrink: 0, padding: '16px 14px', borderRight: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[{ label: 'Activas', value: '3', color: GREEN }, { label: 'Escrow', value: '$450', color: BLUE }, { label: 'Ventas', value: '11', color: ACCENT }, { label: 'Ganancias', value: '$1,420', color: GREEN }].map(kpi => (
            <div key={kpi.label} style={{ background: CARD, borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, color: MUTED }}>{kpi.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            </div>
          ))}
        </div>

        {/* Right: listings table */}
        <div style={{ flex: 1, padding: '12px 16px', overflow: 'auto', maxHeight: 'calc(100vh - 48px)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {['', 'Publicacion', 'Precio', 'Disp.', 'Ventas', 'Estado'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: MUTED, fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockListings.map(l => (
                <tr key={l.title} style={{ borderBottom: `1px solid ${BORDER}`, cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = CARD)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '8px 12px' }}><Dot status={l.status} /></td>
                  <td style={{ padding: '8px 12px', fontSize: 14, color: TEXT }}>{l.title}</td>
                  <td style={{ padding: '8px 12px', fontSize: 14, fontWeight: 600, color: TEXT }}>{l.price}</td>
                  <td style={{ padding: '8px 12px', fontSize: 13, color: l.stock === 0 ? RED : TEXT }}>{l.stock}</td>
                  <td style={{ padding: '8px 12px', fontSize: 13, color: MUTED }}>{l.sales}</td>
                  <td style={{ padding: '8px 12px' }}><Badge label={l.status} color={statusColor[l.status]} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── MODAL MOCKUP: Transaction Status Semaphore ───
function ModalSemaphore() {
  const steps = ['Pedido', 'Pago', 'Escrow', 'Entrega', 'Cerrado']
  const currentStep = 3 // Escrow

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: TEXT }}>Estado de la Operacion — Semáforo</h3>

      {/* Semaphore bar */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          {steps.map((step, i) => {
            const done = i < currentStep
            const active = i === currentStep
            const c = done ? GREEN : active ? BLUE : 'rgba(255,255,255,0.08)'
            return (
              <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', fontWeight: 700 }}>
                  {done ? '✓' : i + 1}
                </div>
                <div style={{ fontSize: 11, color: active ? TEXT : MUTED, fontWeight: active ? 600 : 400, textAlign: 'center' }}>{step}</div>
              </div>
            )
          })}
        </div>
        {/* Progress bar */}
        <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', position: 'relative' }}>
          <div style={{ height: 4, borderRadius: 2, background: BLUE, width: `${(currentStep / (steps.length - 1)) * 100}%`, transition: 'width 300ms' }} />
        </div>
      </div>

      {/* Info row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[
          { label: 'Comprador', value: 'compradorIA' },
          { label: 'Vendedor', value: 'sellerIA' },
          { label: 'Monto', value: '$450 USD' },
          { label: 'Comision', value: '$22.50 (5%)' },
        ].map(i => (
          <div key={i.label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, color: MUTED }}>{i.label}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{i.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function UXPreviewClient() {
  const [variant, setVariant] = useState<Variant>('variant1')
  const [view, setView] = useState<View>('dashboard')

  const variants: Record<Variant, { label: string; desc: string; comp: React.ReactNode }> = {
    variant1: { label: 'Opción 1 — Clean Minimal', desc: 'Estructura actual optimizada. KPIs arriba, lista con dots de estado, badges. Mismo layout, mejor espaciado.', comp: <DashboardV1 /> },
    variant2: { label: 'Opción 2 — Card Grid', desc: 'Tarjetas horizontales con estado, precio grande, metadatos compactos. Ideal para explorar listings visualmente.', comp: <DashboardV2 /> },
    variant3: { label: 'Opción 3 — Full Viewport List', desc: 'Panel izquierdo KPIs + tabla derecha. Aprovecha ancho completo. Sin scroll horizontal.', comp: <DashboardV3 /> },
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, color: TEXT, fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>UX Preview — Turpial Sound</h1>
          <p style={{ fontSize: 12, color: MUTED, margin: '4px 0 0' }}>Mockups aislados. Sin cambios en código actual.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setView('dashboard')} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${view === 'dashboard' ? ACCENT : BORDER}`, background: view === 'dashboard' ? ACCENT + '15' : 'transparent', color: view === 'dashboard' ? ACCENT : MUTED, fontSize: 12, cursor: 'pointer' }}>Dashboard</button>
          <button onClick={() => setView('modal')} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${view === 'modal' ? ACCENT : BORDER}`, background: view === 'modal' ? ACCENT + '15' : 'transparent', color: view === 'modal' ? ACCENT : MUTED, fontSize: 12, cursor: 'pointer' }}>Modal Semáforo</button>
        </div>
      </div>

      {/* Dashboard variants */}
      {view === 'dashboard' && (
        <div style={{ borderBottom: `1px solid ${BORDER}`, padding: '10px 20px', display: 'flex', gap: 8, flexWrap: 'wrap', background: 'rgba(0,0,0,0.2)' }}>
          {(Object.keys(variants) as Variant[]).map(k => (
            <button key={k} onClick={() => setVariant(k)}
              style={{
                padding: '8px 16px', borderRadius: 10, border: `1px solid ${variant === k ? ACCENT : BORDER}`,
                background: variant === k ? ACCENT + '12' : 'transparent', color: variant === k ? ACCENT : MUTED,
                fontSize: 13, fontWeight: variant === k ? 600 : 400, cursor: 'pointer', transition: 'all 200ms',
              }}>
              {variants[k].label}
            </button>
          ))}
        </div>
      )}

      {/* Active variant */}
      {view === 'dashboard' && (
        <>
          <div style={{ padding: '8px 20px', fontSize: 12, color: MUTED, background: ACCENT + '08' }}>{variants[variant].desc}</div>
          {variants[variant].comp}
        </>
      )}

      {/* Modal semaphore preview */}
      {view === 'modal' && (
        <div style={{ maxWidth: 520, margin: '40px auto', padding: '0 20px' }}>
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24 }}>
            <ModalSemaphore />
            <div style={{ marginTop: 24, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={{ padding: '8px 20px', borderRadius: 10, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button style={{ padding: '8px 20px', borderRadius: 10, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Confirmar entrega</button>
            </div>
          </div>
          <p style={{ fontSize: 12, color: MUTED, marginTop: 12, textAlign: 'center' }}>Esquema semáforo: ✓ completado = verde, ● activo = azul, ○ pendiente = gris. Progreso visual.</p>
        </div>
      )}

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${BORDER}`, padding: '12px 20px', fontSize: 11, color: MUTED, textAlign: 'center', marginTop: 'auto' }}>
        UX Preview v1 &middot; Turpial Sound Marketplace &middot; {new Date().toISOString().slice(0, 16)}
      </div>
    </div>
  )
}
