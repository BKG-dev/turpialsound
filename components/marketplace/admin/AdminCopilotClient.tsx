'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Bot,
  Clock,
  Database,
  Eye,
  Loader2,
  Lock,
  Send,
  ShieldCheck,
  Tags,
  Users,
  Wallet,
} from 'lucide-react'
import Link from 'next/link'
import { MarketplaceThemeToggle } from '@/components/marketplace/MarketplaceTheme'

type CopilotRole = 'user' | 'assistant'

type CopilotMessage = {
  id: string
  role: CopilotRole
  content: string
  kind?: 'answer' | 'refusal'
  tool?: string
  infrastructureStatus?: InfrastructureStatusPayload | null
}

type CopilotStatus = 'idle' | 'loading' | 'error'

type InfrastructureMetric = {
  id: string
  label: string
  status: 'ok' | 'warning' | 'critical' | 'unknown'
  usedMb: number | null
  limitMb: number | null
  percent: number | null
  detail: string
}

type InfrastructureStatusPayload = {
  type: 'infrastructure_status'
  summary: string
  metrics: InfrastructureMetric[]
  counts: Array<{ label: string; value: string }>
  notes: string[]
}

const QUICK_PROMPTS = [
  { label: 'Usuarios registrados', prompt: 'Cuantos usuarios hay registrados?', icon: Users },
  { label: 'Ventas de hoy', prompt: 'Cuanto se ha vendido hoy?', icon: BarChart3 },
  { label: 'Pendientes por revisar', prompt: 'Cuantas operaciones tengo pendientes por revisar?', icon: Clock },
  { label: 'Fondos por liberar', prompt: 'Cuanto hay pendiente por liberar?', icon: Wallet },
  { label: 'Explicar KPIs', prompt: 'Explicame los KPIs del dashboard.', icon: ShieldCheck },
  { label: 'Categorias top', prompt: 'Que categorias se venden mas?', icon: Tags },
  { label: 'Listings activos', prompt: 'Que productos tienen mas actividad?', icon: Eye },
  { label: 'DB Status', prompt: 'Estado DB/Blob: conectividad, imagenes, uso, limites y trafico.', icon: Database },
]

const STARTER_MESSAGES: CopilotMessage[] = [
  {
    id: 'assistant_welcome',
    role: 'assistant',
    content:
      'Admin Copilot listo. Puedo consultar y resumir datos administrativos del marketplace en modo solo lectura.',
  },
]

function clampPercent(value: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value))
}

function statusTone(status: InfrastructureMetric['status']) {
  if (status === 'ok') return { label: 'OK', color: '#22c55e', background: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.24)' }
  if (status === 'warning') return { label: 'Warning', color: '#f59e0b', background: 'rgba(245,158,11,0.13)', border: 'rgba(245,158,11,0.28)' }
  if (status === 'critical') return { label: 'Critical', color: '#ef4444', background: 'rgba(239,68,68,0.13)', border: 'rgba(239,68,68,0.28)' }
  return { label: 'No instrumentado', color: 'var(--mp-text-faint)', background: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.22)' }
}

function formatMetricMb(value: number | null) {
  return typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(2)} MB` : 'No medido'
}

function InfrastructureStatusCard({ status }: { status: InfrastructureStatusPayload }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--mp-text-strong)' }}>DB Status</p>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--mp-text-muted)' }}>{status.summary}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {status.metrics.map(metric => {
          const tone = statusTone(metric.status)
          const percent = clampPercent(metric.percent)
          return (
            <div
              key={metric.id}
              className="rounded-lg p-3"
              style={{ background: 'var(--mp-card)', border: '1px solid var(--mp-border)' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold" style={{ color: 'var(--mp-text-strong)' }}>{metric.label}</p>
                  <p className="mt-1 text-[11px] leading-snug" style={{ color: 'var(--mp-text-faint)' }}>{metric.detail}</p>
                </div>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ color: tone.color, background: tone.background, border: `1px solid ${tone.border}` }}
                >
                  {tone.label}
                </span>
              </div>

              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between gap-2 text-[11px]" style={{ color: 'var(--mp-text-muted)' }}>
                  <span>{formatMetricMb(metric.usedMb)} / {formatMetricMb(metric.limitMb)}</span>
                  <span>{metric.percent === null ? 'N/A' : `${metric.percent.toFixed(2)}%`}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full" style={{ background: 'rgba(148,163,184,0.18)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${percent}%`, background: tone.color }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {status.counts.map(item => (
          <div
            key={item.label}
            className="rounded-lg px-3 py-2"
            style={{ background: 'var(--mp-card)', border: '1px solid var(--mp-border)' }}
          >
            <p className="text-[10px] uppercase tracking-normal" style={{ color: 'var(--mp-text-faint)' }}>{item.label}</p>
            <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--mp-text-strong)' }}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.16)' }}>
        {status.notes.map(note => (
          <p key={note} className="text-[11px] leading-relaxed" style={{ color: 'var(--mp-text-muted)' }}>{note}</p>
        ))}
      </div>
    </div>
  )
}

export function AdminCopilotClient() {
  const [messages, setMessages] = useState<CopilotMessage[]>(STARTER_MESSAGES)
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<CopilotStatus>('idle')
  const messageEndRef = useRef<HTMLDivElement>(null)

  const apiMessages = useMemo(
    () =>
      messages
        .filter(message => message.role === 'user' || message.role === 'assistant')
        .slice(-6)
        .map(message => ({ role: message.role, content: message.content })),
    [messages],
  )

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, status])

  async function sendQuestion(rawQuestion: string) {
    const question = rawQuestion.trim()
    if (!question || status === 'loading') return

    const userMessage: CopilotMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: question,
    }

    setMessages(current => [...current, userMessage])
    setInput('')
    setStatus('loading')

    try {
      const response = await fetch('/api/marketplace/admin/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...apiMessages, { role: 'user', content: question }],
        }),
      })

      const payload = (await response.json().catch(() => null)) as {
        reply?: string
        error?: string
        kind?: 'answer' | 'refusal'
        tool?: string
        infrastructureStatus?: InfrastructureStatusPayload | null
      } | null

      if (!response.ok) {
        setStatus('error')
        setMessages(current => [
          ...current,
          {
            id: `assistant_error_${Date.now()}`,
            role: 'assistant',
            content: payload?.error ?? 'No pude consultar el copilot administrativo en este momento.',
          },
        ])
        return
      }

      setMessages(current => [
        ...current,
        {
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          content: payload?.reply ?? 'No hay respuesta disponible.',
          kind: payload?.kind,
          tool: payload?.tool,
          infrastructureStatus: payload?.infrastructureStatus ?? null,
        },
      ])
      setStatus('idle')
    } catch {
      setStatus('error')
      setMessages(current => [
        ...current,
        {
          id: `assistant_network_${Date.now()}`,
          role: 'assistant',
          content: 'No pude conectar con el copilot administrativo.',
        },
      ])
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendQuestion(input)
  }

  return (
    <div className="mp-admin-surface h-[calc(100dvh-4rem)] min-h-0 overflow-hidden px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-5 sm:py-4 sm:pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto flex h-full min-h-0 max-w-6xl flex-col overflow-hidden">
        <header className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Bot size={16} style={{ color: '#00aeef' }} />
              <span className="text-[11px] uppercase tracking-widest" style={{ color: '#00aeef' }}>
                Admin Copilot - solo lectura
              </span>
            </div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--mp-text-strong)' }}>
              Copilot administrativo del marketplace
            </h1>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <MarketplaceThemeToggle compact />
            <Link
              href="/marketplace/admin"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-all hover:bg-white/5"
              style={{ color: 'var(--mp-text-faint)', border: '1px solid var(--mp-border)' }}
            >
              <ArrowLeft size={12} /> Admin
            </Link>
          </div>
        </header>

        <div className="mb-3 grid shrink-0 gap-2 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div
            className="rounded-xl px-3 py-2.5"
            style={{ background: 'var(--mp-card-subtle)', border: '1px solid var(--mp-border)' }}
          >
            <div className="flex items-start gap-3">
              <Lock size={16} className="mt-0.5 shrink-0" style={{ color: '#4ade80' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--mp-text-strong)' }}>
                  Privado y separado del asistente publico
                </p>
                <p className="mt-0.5 text-xs leading-relaxed" style={{ color: 'var(--mp-text-faint)' }}>
                  Consulta datos administrativos con herramientas controladas. No valida pagos, no cambia estados,
                  no libera fondos y no edita usuarios.
                </p>
              </div>
            </div>
          </div>

          <div
            className="rounded-xl px-3 py-2.5"
            style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)' }}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" style={{ color: '#fbbf24' }} />
              <p className="text-xs leading-relaxed" style={{ color: 'var(--mp-text-muted)' }}>
                Las cifras financieras son apoyo operativo. Verifica montos y estados contra el dashboard antes de
                cualquier decision administrativa.
              </p>
            </div>
          </div>
        </div>

        <main className="flex min-h-0 flex-1 flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_280px]">
          <section
            className="order-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl lg:order-none"
            style={{ background: 'var(--mp-card)', border: '1px solid var(--mp-border)', boxShadow: 'var(--mp-card-shadow)' }}
          >
            <div className="shrink-0 border-b px-4 py-3" style={{ borderColor: 'var(--mp-border)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--mp-text-strong)' }}>
                Consulta administrativa
              </p>
              <p className="mt-0.5 text-[11px]" style={{ color: 'var(--mp-text-faint)' }}>
                Contexto efimero por sesion. No guardes credenciales ni datos sensibles en el chat.
              </p>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4">
              {messages.map(message => {
                const isUser = message.role === 'user'
                return (
                  <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`${message.infrastructureStatus ? 'w-full max-w-[720px]' : 'max-w-[90%] whitespace-pre-wrap'} break-words [overflow-wrap:anywhere] rounded-xl px-4 py-3 text-sm leading-relaxed`}
                      style={
                        isUser
                          ? { background: 'rgba(0,174,239,0.15)', color: 'var(--mp-text-strong)', border: '1px solid rgba(0,174,239,0.24)' }
                          : {
                              background: message.kind === 'refusal' ? 'rgba(251,191,36,0.08)' : 'var(--mp-card-subtle)',
                              color: 'var(--mp-text-muted)',
                              border: message.kind === 'refusal' ? '1px solid rgba(251,191,36,0.22)' : '1px solid var(--mp-border)',
                            }
                      }
                    >
                      {message.tool && (
                        <p className="mb-2 text-[10px] uppercase tracking-widest" style={{ color: 'var(--mp-text-faint)' }}>
                          Fuente: {message.tool}
                        </p>
                      )}
                      {message.infrastructureStatus ? (
                        <InfrastructureStatusCard status={message.infrastructureStatus} />
                      ) : (
                        message.content
                      )}
                    </div>
                  </div>
                )
              })}

              {status === 'loading' && (
                <div className="flex justify-start">
                  <div
                    className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
                    style={{ background: 'var(--mp-card-subtle)', border: '1px solid var(--mp-border)', color: 'var(--mp-text-muted)' }}
                  >
                    <Loader2 size={15} className="animate-spin" style={{ color: '#00aeef' }} />
                    Consultando datos read-only...
                  </div>
                </div>
              )}
              <div ref={messageEndRef} aria-hidden="true" />
            </div>

            {status === 'error' && (
              <div className="border-t px-4 py-2 text-xs" style={{ borderColor: 'var(--mp-border)', color: '#fbbf24' }}>
                Hubo un problema consultando el copilot. Reintenta o revisa el dashboard.
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="z-10 flex shrink-0 gap-2 border-t p-3"
              style={{ borderColor: 'var(--mp-border)', background: 'var(--mp-panel-solid)' }}
            >
              <input
                value={input}
                onChange={event => setInput(event.target.value.slice(0, 900))}
                placeholder="Pregunta por usuarios, operaciones, ventas o un ID visible..."
                className="min-w-0 flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                style={{
                  background: 'var(--mp-input)',
                  border: '1px solid var(--mp-input-border)',
                  color: 'var(--mp-text-strong)',
                }}
              />
              <button
                type="submit"
                disabled={!input.trim() || status === 'loading'}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: '#00aeef', color: '#020617' }}
                aria-label="Enviar pregunta"
              >
                {status === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </form>
          </section>

          <aside className="order-1 grid max-h-24 shrink-0 grid-cols-2 gap-2 overflow-y-auto overscroll-contain sm:grid-cols-3 lg:order-none lg:max-h-none lg:min-h-0 lg:grid-cols-1 lg:content-start">
            {QUICK_PROMPTS.map(item => {
              const Icon = item.icon
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => void sendQuestion(item.prompt)}
                  disabled={status === 'loading'}
                  className="flex w-full items-center gap-2 rounded-xl p-2.5 text-left transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 sm:gap-3 sm:p-3"
                  style={{ background: 'var(--mp-card-subtle)', border: '1px solid var(--mp-border)' }}
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: 'rgba(0,174,239,0.1)', color: '#00aeef' }}
                  >
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0 text-xs font-medium sm:text-sm" style={{ color: 'var(--mp-text-strong)' }}>
                    {item.label}
                  </span>
                </button>
              )
            })}
          </aside>
        </main>
      </div>
    </div>
  )
}
