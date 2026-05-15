'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

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
  active: GREEN, pending: YELLOW, escrow: BLUE, completed: GREEN,
  dispute: RED, released: GREEN, sold: MUTED, draft: MUTED,
}

function Dot({ status }: { status: string }) {
  const c = statusColor[status] || MUTED
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: c, marginRight: 6, flexShrink: 0 }} />
}

function Badge({ label, color }: { label: string; color: string }) {
  return <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: color + '18', color, border: `1px solid ${color}30`, fontWeight: 600 }}>{label}</span>
}

function ModalShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#1a1a1a', border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, maxWidth: 440, margin: '0 auto' }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: TEXT, marginBottom: 18, marginTop: 0 }}>{title}</h3>
      {children}
    </div>
  )
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

// ─── DASHBOARD VARIANT 1: Clean Minimal ───
function DashboardV1() {
  return (
    <div style={{ padding: '24px 20px', maxWidth: 960, margin: '0 auto' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: TEXT, marginBottom: 4 }}>Dashboard</h2>
      <p style={{ fontSize: 13, color: MUTED, marginBottom: 24 }}>Tus publicaciones y transacciones</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[{ label: 'Activas', value: '3', color: GREEN }, { label: 'En Escrow', value: '1', color: BLUE }, { label: 'Ventas', value: '11', color: ACCENT }, { label: 'Ganancias', value: '$1,420', color: GREEN }].map(kpi => (
          <div key={kpi.label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, color: MUTED, marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

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

// ─── DASHBOARD VARIANT 3: Full Viewport List ───
function DashboardV3() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: `1px solid ${BORDER}`, background: 'rgba(0,0,0,0.3)', flexShrink: 0 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT }}>Dashboard</h2>
        <div style={{ display: 'flex', gap: 6 }}>
          {['Publicaciones', 'Transacciones', 'Chats'].map(t => (
            <button key={t} style={{ background: t === 'Publicaciones' ? ACCENT + '20' : 'transparent', border: 'none', borderRadius: 6, padding: '6px 12px', color: t === 'Publicaciones' ? ACCENT : MUTED, fontSize: 12, cursor: 'pointer' }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ width: 200, flexShrink: 0, padding: '16px 14px', borderRight: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[{ label: 'Activas', value: '3', color: GREEN }, { label: 'Escrow', value: '$450', color: BLUE }, { label: 'Ventas', value: '11', color: ACCENT }, { label: 'Ganancias', value: '$1,420', color: GREEN }].map(kpi => (
            <div key={kpi.label} style={{ background: CARD, borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, color: MUTED }}>{kpi.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            </div>
          ))}
        </div>

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

// ─── MODAL PREVIEWS ───

function SemaphoreSteps({ current }: { current: number }) {
  const steps = ['Pedido', 'Pago', 'Escrow', 'Entrega', 'Cerrado']
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        {steps.map((step, i) => {
          const done = i < current; const active = i === current
          const c = done ? GREEN : active ? BLUE : 'rgba(255,255,255,0.08)'
          return (
            <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', fontWeight: 700 }}>
                {done ? '✓' : i + 1}
              </div>
              <div style={{ fontSize: 10, color: active ? TEXT : MUTED, fontWeight: active ? 600 : 400, textAlign: 'center' }}>{step}</div>
            </div>
          )
        })}
      </div>
      <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', position: 'relative' }}>
        <div style={{ height: 4, borderRadius: 2, background: BLUE, width: `${(current / 4) * 100}%`, transition: 'width 300ms' }} />
      </div>
    </div>
  )
}

function ModalSemaphore() {
  const currentStep = 3
  return (
    <div>
      <SemaphoreSteps current={currentStep} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
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
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button style={{ padding: '8px 20px', borderRadius: 10, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
        <button style={{ padding: '8px 20px', borderRadius: 10, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Confirmar entrega</button>
      </div>
    </div>
  )
}

function ModalListingPublish() {
  return (
    <div>
      <p style={{ fontSize: 12, color: MUTED, marginBottom: 16 }}>Completa los datos de tu publicacion</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
        <input placeholder="Titulo de la publicacion" style={{ padding: '10px 14px', borderRadius: 10, border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.04)', color: TEXT, fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
        <textarea placeholder="Descripcion" rows={3} style={{ padding: '10px 14px', borderRadius: 10, border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.04)', color: TEXT, fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box', resize: 'vertical' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: MUTED, display: 'block', marginBottom: 4 }}>Precio (USD)</label>
            <input placeholder="0.00" style={{ padding: '10px 14px', borderRadius: 10, border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.04)', color: TEXT, fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: MUTED, display: 'block', marginBottom: 4 }}>Cantidad</label>
            <input type="number" defaultValue="1" style={{ padding: '10px 14px', borderRadius: 10, border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.04)', color: TEXT, fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <select style={{ padding: '10px 14px', borderRadius: 10, border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.04)', color: TEXT, fontSize: 14, outline: 'none', width: '100%' }}>
            <option value="">Estado</option><option>Distrito Capital</option><option>Miranda</option>
          </select>
          <select style={{ padding: '10px 14px', borderRadius: 10, border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.04)', color: TEXT, fontSize: 14, outline: 'none', width: '100%' }}>
            <option value="">Ciudad</option><option>Caracas</option>
          </select>
        </div>
      </div>
      <button style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: ACCENT, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
        Publicar
      </button>
    </div>
  )
}

function ModalAuth() {
  return (
    <div>
      <p style={{ fontSize: 12, color: MUTED, marginBottom: 16, textAlign: 'center' }}>Inicia sesion para comprar o vender en el marketplace</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        <input placeholder="Email o usuario" style={{ padding: '10px 14px', borderRadius: 10, border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.04)', color: TEXT, fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
        <input type="password" placeholder="Contrasena" style={{ padding: '10px 14px', borderRadius: 10, border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.04)', color: TEXT, fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
      </div>
      <button style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: ACCENT, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 10 }}>
        Iniciar sesion
      </button>
      <button style={{ width: '100%', padding: '10px', borderRadius: 10, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, fontSize: 14, cursor: 'pointer' }}>
        Registrarse
      </button>
    </div>
  )
}

function ModalCheckout() {
  const steps = ['Confirmar', 'Pagar', 'Recibir']
  const current = 1
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 20 }}>
        {steps.map((s, i) => {
          const done = i < current; const active = i === current
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? GREEN : active ? ACCENT : 'rgba(255,255,255,0.08)', color: done || active ? '#fff' : MUTED, fontWeight: 700 }}>{done ? '✓' : i + 1}</div>
              <span style={{ fontSize: 11, color: active ? TEXT : MUTED }}>{s}</span>
              {i < 2 && <div style={{ width: 24, height: 1, background: done ? GREEN : 'rgba(255,255,255,0.08)' }} />}
            </div>
          )
        })}
      </div>
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: TEXT, marginBottom: 6 }}>
          <span>Guitarra Fender</span><span>$450.00</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: MUTED, marginBottom: 6 }}>
          <span>Comision plataforma (5%)</span><span>-$22.50</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, color: GREEN, borderTop: `1px solid ${BORDER}`, paddingTop: 8, marginTop: 4 }}>
          <span>Total a pagar</span><span>$427.50</span>
        </div>
      </div>
      <div style={{ background: ACCENT + '10', border: `1px solid ${ACCENT}30`, borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 12, color: ACCENT, textAlign: 'center' }}>
        Pago Movil Mercantil &middot; V-13864619 &middot; 04141333305<br />
        <span style={{ fontSize: 10, color: MUTED }}>Al reportar el pago, los fondos quedan protegidos en Escrow</span>
      </div>
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="checkbox" defaultChecked style={{ accentColor: ACCENT }} />
        <span style={{ fontSize: 13, color: TEXT }}>He realizado el pago y confirmo la operacion</span>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button style={{ padding: '8px 20px', borderRadius: 10, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, fontSize: 13, cursor: 'pointer' }}>Volver</button>
        <button style={{ padding: '8px 20px', borderRadius: 10, border: 'none', background: GREEN, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Reportar pago</button>
      </div>
    </div>
  )
}

function ModalChat() {
  return (
    <div>
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 12, marginBottom: 12, maxHeight: 200, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '8px 12px', maxWidth: '80%', fontSize: 13, color: TEXT }}>Hola, me interesa la guitarra. Sigue disponible?</div>
        <div style={{ alignSelf: 'flex-end', background: ACCENT + '20', borderRadius: 10, padding: '8px 12px', maxWidth: '80%', fontSize: 13, color: TEXT }}>Si, disponible! Quieres coordinar la entrega?</div>
        <div style={{ alignSelf: 'center', fontSize: 10, color: MUTED }}>Hoy 14:30</div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input placeholder="Escribe un mensaje..." style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.04)', color: TEXT, fontSize: 14, outline: 'none' }} />
        <button style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: ACCENT, color: '#fff', fontSize: 14, cursor: 'pointer' }}>Enviar</button>
      </div>
    </div>
  )
}

function ModalCart() {
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {[1, 2].map(i => (
          <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ width: 44, height: 44, borderRadius: 8, background: CARD, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: TEXT }}>Producto #{i}</div>
              <div style={{ fontSize: 11, color: MUTED }}>Caracas, Distrito Capital</div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>$125</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 16, paddingTop: 8, borderTop: `1px solid ${BORDER}` }}>
        <span>Total</span><span>$250</span>
      </div>
      <button style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: ACCENT, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
        Ir a comprar
      </button>
    </div>
  )
}

// ─── MAIN UX PREVIEW ───

type Variant = 'variant1' | 'variant2' | 'variant3'
type View = 'dashboard' | 'modal'

export default function UXPreviewClient() {
  const [variant, setVariant] = useState<Variant>('variant1')
  const [view, setView] = useState<View>('dashboard')
  const [activeModal, setActiveModal] = useState('semaphore')

  const variants: Record<Variant, { label: string; desc: string; comp: React.ReactNode }> = {
    variant1: { label: 'Opcion 1 — Clean Minimal', desc: 'Estructura actual optimizada. KPIs arriba, lista con dots de estado, badges.', comp: <DashboardV1 /> },
    variant2: { label: 'Opcion 2 — Card Grid', desc: 'Tarjetas con precio grande, metadatos compactos. Ideal para explorar visualmente.', comp: <DashboardV2 /> },
    variant3: { label: 'Opcion 3 — Full Viewport List', desc: 'Panel KPIs izquierda + tabla derecha. Sin scroll horizontal.', comp: <DashboardV3 /> },
  }

  const modals: Record<string, { label: string; comp: React.ReactNode }> = {
    semaphore: { label: 'Estado Operacion', comp: <ModalSemaphore /> },
    publish: { label: 'Publicar Listing', comp: <ModalListingPublish /> },
    checkout: { label: 'Checkout / Pago', comp: <ModalCheckout /> },
    auth: { label: 'Login / Registro', comp: <ModalAuth /> },
    chat: { label: 'Chat', comp: <ModalChat /> },
    cart: { label: 'Carrito', comp: <ModalCart /> },
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, color: TEXT, fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>UX Preview — Turpial Sound</h1>
          <p style={{ fontSize: 12, color: MUTED, margin: '4px 0 0' }}>Mockups aislados. Sin cambios en codigo actual.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setView('dashboard')} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${view === 'dashboard' ? ACCENT : BORDER}`, background: view === 'dashboard' ? ACCENT + '15' : 'transparent', color: view === 'dashboard' ? ACCENT : MUTED, fontSize: 12, cursor: 'pointer' }}>Dashboards</button>
          <button onClick={() => setView('modal')} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${view === 'modal' ? ACCENT : BORDER}`, background: view === 'modal' ? ACCENT + '15' : 'transparent', color: view === 'modal' ? ACCENT : MUTED, fontSize: 12, cursor: 'pointer' }}>Modales</button>
        </div>
      </div>

      {/* Dashboard variants */}
      {view === 'dashboard' && (
        <>
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
          <div style={{ padding: '8px 20px', fontSize: 12, color: MUTED, background: ACCENT + '08' }}>{variants[variant].desc}</div>
          {variants[variant].comp}
        </>
      )}

      {/* Modal gallery */}
      {view === 'modal' && (
        <>
          <div style={{ borderBottom: `1px solid ${BORDER}`, padding: '10px 20px', display: 'flex', gap: 8, flexWrap: 'wrap', background: 'rgba(0,0,0,0.2)' }}>
            {Object.entries(modals).map(([key, m]) => (
              <button key={key} onClick={() => setActiveModal(key)}
                style={{
                  padding: '8px 16px', borderRadius: 10, border: `1px solid ${activeModal === key ? ACCENT : BORDER}`,
                  background: activeModal === key ? ACCENT + '12' : 'transparent', color: activeModal === key ? ACCENT : MUTED,
                  fontSize: 13, fontWeight: activeModal === key ? 600 : 400, cursor: 'pointer', transition: 'all 200ms',
                }}>
                {m.label}
              </button>
            ))}
          </div>
          <div style={{ padding: '40px 20px', maxWidth: 480, margin: '0 auto' }}>
            <ModalShell title={modals[activeModal].label}>
              {modals[activeModal].comp}
            </ModalShell>
            <p style={{ fontSize: 11, color: MUTED, marginTop: 12, textAlign: 'center' }}>
              Paleta Turpial original &middot; Contraste optimizado &middot; Tipografia Inter &middot; Sin scroll horizontal &middot; 44px touch targets
            </p>
          </div>
        </>
      )}

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${BORDER}`, padding: '12px 20px', fontSize: 11, color: MUTED, textAlign: 'center' }}>
        UX Preview v2 &middot; Turpial Sound Marketplace &middot; {new Date().toISOString().slice(0, 16)}
      </div>
    </div>
  )
}
