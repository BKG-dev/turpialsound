'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, Bot, Loader2, Send, ShieldCheck, Sparkles, X } from 'lucide-react'

type AssistantRole = 'user' | 'assistant'

type AssistantMessage = {
  id: string
  role: AssistantRole
  content: string
  kind?: 'answer' | 'refusal'
}

type AssistantStatus = 'idle' | 'loading' | 'error' | 'rate-limit' | 'refusal'

type MarketplaceAssistantProps = {
  compact?: boolean
  onClose?: () => void
}

const QUICK_QUESTIONS = [
  'Como compro?',
  'Como vendo?',
  'Que puedo vender aqui?',
  'Puedo vender servicios de audio?',
  'Venden instrumentos?',
  'Como busco por ciudad?',
  'Cuando cobra el vendedor?',
  'Que metodos de pago aceptan?',
]

const STARTER_MESSAGES: AssistantMessage[] = [
  {
    id: 'assistant_welcome',
    role: 'assistant',
    content:
      'Hola. Puedo ayudarte con el funcionamiento publico del marketplace: comprar, vender, que se puede publicar, reportar pagos, estados visibles y dudas sobre busqueda o alcance.',
  },
]

function statusCopy(status: AssistantStatus): string | null {
  if (status === 'loading') return 'Escribiendo...'
  if (status === 'error') return 'No pude responder en este momento. Intenta de nuevo.'
  if (status === 'rate-limit') return 'Llegaste al limite temporal de mensajes. Intenta mas tarde.'
  if (status === 'refusal') return 'Solo puedo responder sobre informacion publica del marketplace.'
  return null
}

export function MarketplaceAssistant({ compact = false, onClose }: MarketplaceAssistantProps) {
  const [messages, setMessages] = useState<AssistantMessage[]>(STARTER_MESSAGES)
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<AssistantStatus>('idle')
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const apiMessages = useMemo(
    () =>
      messages
        .filter((message) => message.role === 'user' || message.role === 'assistant')
        .slice(-6)
        .map((message) => ({ role: message.role, content: message.content })),
    [messages],
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, status])

  async function sendQuestion(rawQuestion: string) {
    const question = rawQuestion.trim()
    if (!question || status === 'loading') return

    const userMessage: AssistantMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: question,
    }

    setMessages((current) => [...current, userMessage])
    setInput('')
    setStatus('loading')

    try {
      const response = await fetch('/api/marketplace/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...apiMessages, { role: 'user', content: question }],
        }),
      })

      const payload = (await response.json().catch(() => null)) as {
        reply?: string
        error?: string
        code?: string
        kind?: 'answer' | 'refusal'
      } | null

      if (response.status === 429) {
        setStatus('rate-limit')
        setMessages((current) => [
          ...current,
          {
            id: `assistant_rate_${Date.now()}`,
            role: 'assistant',
            content: payload?.error ?? 'Llegaste al limite temporal de mensajes. Intenta mas tarde.',
          },
        ])
        return
      }

      if (!response.ok) {
        setStatus('error')
        setMessages((current) => [
          ...current,
          {
            id: `assistant_error_${Date.now()}`,
            role: 'assistant',
            content: payload?.error ?? 'No pude responder en este momento. Intenta de nuevo.',
          },
        ])
        return
      }

      const assistantMessage: AssistantMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: payload?.reply ?? 'Puedo ayudarte con el funcionamiento general del marketplace.',
        kind: payload?.kind,
      }

      setMessages((current) => [...current, assistantMessage])
      setStatus(payload?.kind === 'refusal' ? 'refusal' : 'idle')
    } catch {
      setStatus('error')
      setMessages((current) => [
        ...current,
        {
          id: `assistant_network_${Date.now()}`,
          role: 'assistant',
          content: 'No pude conectar con el asistente. Intenta de nuevo mas tarde.',
        },
      ])
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendQuestion(input)
  }

  const currentStatus = statusCopy(status)

  return (
    <div
      className={[
        'grid rounded-2xl',
        compact
          ? 'h-[min(88vh,760px)] gap-3 overflow-hidden p-3 sm:h-[min(90vh,760px)] sm:p-4'
          : 'gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)] lg:items-stretch',
      ].join(' ')}
      style={{
        background: 'var(--mp-card)',
        border: '1px solid var(--mp-border)',
        boxShadow: 'var(--mp-card-shadow)',
      }}
    >
      <div className={compact ? 'hidden' : 'flex min-h-0 flex-col justify-between gap-6'}>
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: 'rgba(0,174,239,0.12)', border: '1px solid rgba(0,174,239,0.24)' }}
            >
              <Bot size={18} className="text-[#00aeef]" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-widest" style={{ color: 'var(--mp-text-faint)' }}>
                Asistente publico
              </p>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--mp-text)' }}>
                Pregunta como usar el marketplace
              </h3>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--mp-text-muted)' }}>
                Informacion publica sobre compras, ventas y uso del marketplace.
              </p>
            </div>
          </div>
          <p className="max-w-xl text-sm leading-relaxed" style={{ color: 'var(--mp-text-muted)' }}>
            Responde sobre compras, ventas, pago reportado, estados publicos, metodos visibles,
            cobro del vendedor en terminos generales y disputas. No accede a cuentas, pagos reales
            ni informacion privada.
          </p>
        </div>

        <div className="grid gap-2">
          <div className="flex items-start gap-2 rounded-xl p-3" style={{ background: 'var(--mp-card-subtle)', border: '1px solid var(--mp-border)' }}>
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[#4ade80]" />
            <p className="text-xs leading-relaxed" style={{ color: 'var(--mp-text-muted)' }}>
              Usa solo una base publica curada y rechaza datos internos, secretos, datos bancarios privados y detalles operativos sensibles.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_QUESTIONS.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => void sendQuestion(question)}
                disabled={status === 'loading'}
                className="rounded-full px-3 py-1.5 text-xs font-medium transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  background: 'rgba(0,174,239,0.1)',
                  border: '1px solid rgba(0,174,239,0.2)',
                  color: '#00aeef',
                }}
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        className={compact ? 'flex h-full min-h-0 flex-col overflow-hidden rounded-2xl' : 'flex min-h-[420px] flex-col rounded-2xl'}
        style={{ background: 'var(--mp-panel-solid)', border: '1px solid var(--mp-border)' }}
      >
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: 'var(--mp-border)' }}>
          <div className="flex min-w-0 items-center gap-2">
            <Sparkles size={15} className="shrink-0 text-[#ffc107]" />
            <p className="truncate text-sm font-semibold" style={{ color: 'var(--mp-text)' }}>
              Turpial Marketplace Assistant
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide" style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80' }}>
              Publico
            </span>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full transition hover:-translate-y-0.5"
                style={{
                  background: 'var(--mp-card-subtle)',
                  border: '1px solid var(--mp-border)',
                  color: 'var(--mp-text-muted)',
                }}
                aria-label="Cerrar asistente"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {compact && (
          <div className="flex flex-wrap gap-2 border-b px-4 py-3" style={{ borderColor: 'var(--mp-border)' }}>
            {QUICK_QUESTIONS.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => void sendQuestion(question)}
                disabled={status === 'loading'}
                className="rounded-full px-3 py-1.5 text-xs font-medium transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  background: 'rgba(0,174,239,0.1)',
                  border: '1px solid rgba(0,174,239,0.2)',
                  color: '#00aeef',
                }}
              >
                {question}
              </button>
            ))}
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 pb-5">
            {messages.map((message) => {
              const isUser = message.role === 'user'
              return (
                <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="max-w-[88%] whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-2xl px-4 py-3 text-sm leading-relaxed"
                    style={
                      isUser
                        ? { background: 'rgba(0,174,239,0.16)', color: 'var(--mp-text)', border: '1px solid rgba(0,174,239,0.24)' }
                        : {
                            background: message.kind === 'refusal' ? 'rgba(255,193,7,0.1)' : 'var(--mp-card-subtle)',
                            color: 'var(--mp-text-muted)',
                            border: message.kind === 'refusal' ? '1px solid rgba(255,193,7,0.22)' : '1px solid var(--mp-border)',
                          }
                    }
                  >
                    {message.content}
                  </div>
                </div>
              )
            })}
            {status === 'loading' && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm" style={{ background: 'var(--mp-card-subtle)', border: '1px solid var(--mp-border)', color: 'var(--mp-text-muted)' }}>
                  <Loader2 size={15} className="animate-spin text-[#00aeef]" />
                  Escribiendo...
                </div>
              </div>
            )}
            <div ref={bottomRef} aria-hidden="true" />
          </div>
        </div>

        {currentStatus && status !== 'loading' && (
          <div className="flex items-center gap-2 border-t px-4 py-2 text-xs" style={{ borderColor: 'var(--mp-border)', color: 'var(--mp-text-faint)' }}>
            <AlertCircle size={13} className={status === 'error' || status === 'rate-limit' ? 'text-[#ffc107]' : 'text-[#00aeef]'} />
            {currentStatus}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2 border-t p-3" style={{ borderColor: 'var(--mp-border)' }}>
          <input
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value.slice(0, 700))}
            placeholder="Pregunta sobre comprar, vender o reportar un pago..."
            className="min-w-0 flex-1 rounded-xl px-3 py-2 text-sm outline-none"
            style={{
              background: 'var(--mp-input-bg)',
              border: '1px solid var(--mp-border)',
              color: 'var(--mp-text)',
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || status === 'loading'}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: '#00aeef', color: '#020617' }}
            aria-label="Enviar pregunta"
          >
            {status === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
      </div>
    </div>
  )
}
