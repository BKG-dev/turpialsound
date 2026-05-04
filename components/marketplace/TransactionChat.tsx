'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Shield,
  CheckCircle2,
  Check,
  CheckCheck,
  Send,
  X,
  ChevronLeft,
  BadgeCheck,
  Star,
  Lock,
  Clock,
  CreditCard,
  TrendingDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MessageThread, Message, FormalQuote } from '@/types/marketplace'
import { MOCK_THREAD } from '@/content/marketplace'
import {
  sendMessage as sendMessageAction,
  getThreadMessages as getThreadMessagesAction,
  markMessagesRead as markMessagesReadAction,
} from '@/actions/marketplace/chat'

// ─── DB Message normalizer (real mode) ───────────────────────────────────────

interface DbMessage {
  id: string
  threadId: string
  senderId: string
  content: string
  createdAt: string | Date
  isRead: boolean
  sender: { id: string; displayName: string; avatarUrl?: string | null }
}

function normalizeDbMessage(m: DbMessage): Message {
  const name = m.sender?.displayName ?? 'Usuario'
  return {
    id: m.id,
    threadId: m.threadId,
    senderId: m.senderId,
    senderName: name,
    senderInitials: name.slice(0, 2).toUpperCase(),
    content: m.content,
    type: 'text',
    createdAt: typeof m.createdAt === 'string' ? m.createdAt : m.createdAt.toISOString(),
    read: m.isRead,
  }
}

function formatMarketplaceTime(value: string | Date) {
  return new Date(value).toLocaleTimeString('es-VE', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

// ─── Security Warning Banner ──────────────────────────────────────────────────

function SecurityBanner() {
  return (
    <div
      className="mx-4 my-2 rounded-xl p-4 flex gap-3"
      style={{
        background: 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(255,193,7,0.06) 100%)',
        border: '1px solid rgba(239,68,68,0.25)',
        boxShadow: '0 0 24px rgba(239,68,68,0.06), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <div className="flex-shrink-0 mt-0.5">
        <AlertTriangle size={16} className="text-[#ef4444]" style={{ filter: 'drop-shadow(0 0 6px rgba(239,68,68,0.5))' }} />
      </div>
      <div className="space-y-1">
        <p className="text-[11px] font-semibold text-[#ef4444] tracking-wide uppercase">
          Zona Protegida — Turpial Market
        </p>
        <p className="text-[11px] text-[#a0a0a0] leading-relaxed">
          Por tu seguridad, <span className="text-[#f2f2f2]">toda transacción debe realizarse exclusivamente aquí.</span>{' '}
          Compartir números de teléfono, direcciones físicas, correos electrónicos o enlaces externos resultará en el{' '}
          <span className="text-[#ef4444] font-medium">BANEO PERMANENTE de la cuenta</span> y la pérdida de toda protección de la operación.
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <Shield size={10} className="text-[#00aeef]" />
          <span className="text-[10px] text-[#b8b8b8]">Turpial Market protege tu dinero hasta confirmar la entrega.</span>
        </div>
      </div>
    </div>
  )
}

// ─── Quote Card ───────────────────────────────────────────────────────────────

function QuoteCard({ quote, isOwn, onPay }: {
  quote: FormalQuote
  isOwn: boolean
  onPay?: () => void
}) {
  const [paying, setPaying] = useState(false)
  const [paid, setPaid] = useState(quote.status === 'paid')

  async function handlePay() {
    setPaying(true)
    await new Promise(r => setTimeout(r, 1800))
    setPaying(false)
    setPaid(true)
  }

  return (
    <div
      className="rounded-xl overflow-hidden w-full max-w-sm"
      style={{
        background: 'var(--mp-card)',
        border: '1px solid rgba(0,174,239,0.2)',
        boxShadow: 'var(--mp-card-shadow), 0 0 48px rgba(0,174,239,0.06)',
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2 border-b"
        style={{ background: 'rgba(0,174,239,0.04)', borderColor: 'var(--mp-border)' }}>
        <Lock size={13} className="text-[#00aeef]" />
        <span className="text-[11px] font-semibold text-[#00aeef] tracking-wider uppercase">
          Cotización Formal
        </span>
        <span className="ml-auto text-[10px] text-[#9a9a9a]">#{quote.id.toUpperCase()}</span>
      </div>

      {/* Listing title */}
      <div className="px-4 pt-3 pb-2">
        <p className="text-xs text-[#a0a0a0] mb-1">Artículo</p>
        <p className="text-sm text-[#f2f2f2] font-medium leading-snug">{quote.listingTitle}</p>
        <p className="text-[11px] text-[#b8b8b8] mt-1">{quote.description}</p>
      </div>

      {/* Price breakdown */}
      <div className="mx-4 mb-3 rounded-lg overflow-hidden"
        style={{ border: '1px solid var(--mp-border)', background: 'var(--mp-card-subtle)' }}>
        {/* Buyer pays */}
        <div className="px-3 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard size={12} className="text-[#a0a0a0]" />
            <span className="text-xs text-[#a0a0a0]">Pagas tú</span>
          </div>
          <div className="text-right">
            <span className="text-base font-semibold text-gradient-gold">
              ${quote.buyerPays.toLocaleString()}
            </span>
            <span className="text-[10px] text-[#b8b8b8] ml-1">{quote.currency}</span>
          </div>
        </div>

        <div className="h-px" style={{ background: 'var(--mp-border)' }} />

        {/* Seller receives (only shown to seller side for demo) */}
        {!isOwn && (
          <>
            <div className="px-3 py-2 flex items-center justify-between bg-[rgba(0,0,0,0.2)]">
              <span className="text-[10px] text-[#b8b8b8]">Precio base</span>
              <span className="text-xs text-[#a0a0a0]">${quote.basePrice.toLocaleString()}</span>
            </div>
            <div className="px-3 py-2 flex items-center justify-between bg-[rgba(0,0,0,0.2)]">
              <div className="flex items-center gap-1">
                <TrendingDown size={10} className="text-[#ef4444]" />
                <span className="text-[10px] text-[#b8b8b8]">Comisión Turpial ({(quote.commissionRate * 100).toFixed(0)}%)</span>
              </div>
              <span className="text-xs text-[#ef4444]">− ${quote.commissionAmount.toLocaleString()}</span>
            </div>
            <div className="h-px" style={{ background: 'var(--mp-border)' }} />
            <div className="px-3 py-2.5 flex items-center justify-between">
              <span className="text-xs font-medium text-[#f2f2f2]">Vendedor recibe</span>
              <span className="text-sm font-semibold text-[#4ade80]">
                ${quote.sellerReceives.toLocaleString()} {quote.currency}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Expiry */}
      <div className="px-4 pb-3 flex items-center gap-1.5 text-[10px] text-[#9a9a9a]">
        <Clock size={9} />
        <span>Válida hasta {new Date(quote.validUntil).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
      </div>

      {/* CTA — only for buyer */}
      {!isOwn && (
        <div className="px-4 pb-4">
          {paid ? (
            <div className="rounded-lg flex items-center justify-center gap-2 py-3"
              style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)' }}>
              <CheckCircle2 size={14} className="text-[#4ade80]" />
              <span className="text-sm font-medium text-[#4ade80]">Pago protegido · fondos por liberar</span>
            </div>
          ) : (
            <button
              onClick={onPay ?? handlePay}
              disabled={paying}
              className="btn-silky-primary w-full py-3 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold disabled:opacity-70 transition-all duration-250"
            >
              {paying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Lock size={14} />
                  Reportar pago - ${quote.buyerPays.toLocaleString()} {quote.currency}
                </>
              )}
            </button>
          )}

          {!paid && (
            <p className="text-[10px] text-[#b8b8b8] text-center mt-2">
              <Shield size={9} className="inline mr-1 text-[#00aeef]" />
              Tu pago queda protegido mientras el equipo revisa la operación.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  if (message.type === 'quote') {
    return (
      <div className={cn('flex flex-col gap-1', isOwn ? 'items-end' : 'items-start')}>
        <QuoteCard quote={message.quote!} isOwn={isOwn} />
        <span className="text-[9px] text-[#9a9a9a] px-1">
          {formatMarketplaceTime(message.createdAt)}
        </span>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-1 max-w-[75%]', isOwn ? 'items-end self-end' : 'items-start self-start')}>
      <div
        className="px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed"
        style={
          isOwn
            ? {
                background: 'linear-gradient(135deg, rgba(0,174,239,0.18) 0%, rgba(0,80,200,0.14) 100%)',
                border: '1px solid rgba(0,174,239,0.2)',
                color: '#f2f2f2',
                borderBottomRightRadius: '4px',
              }
            : {
                background: 'var(--mp-input)',
                border: '1px solid var(--mp-input-border)',
                color: 'var(--mp-text-soft)',
                borderBottomLeftRadius: '4px',
              }
        }
      >
        {message.content}
      </div>
      <span className="text-[9px] text-[#9a9a9a] px-1 flex items-center gap-0.5">
        {formatMarketplaceTime(message.createdAt)}
        {isOwn && (
          message.read
            ? <CheckCheck size={11} style={{ color: '#00aeef' }} />
            : <Check size={11} className="text-[#5a5a5a]" />
        )}
      </span>
    </div>
  )
}

// ─── Chat Header ──────────────────────────────────────────────────────────────

interface RealChatUser {
  displayName: string
  avatarUrl?: string | null
  isVerified?: boolean
  sellerRating?: string | null
}

function ChatHeader({
  thread,
  realUser,
  listingTitle,
  listingSlug,
  onClose,
}: {
  thread: MessageThread
  realUser?: RealChatUser
  listingTitle?: string
  listingSlug?: string
  onClose: () => void
}) {
  const mockUser = thread.participants[1]
  const name = realUser?.displayName ?? mockUser.name
  const initials = name.slice(0, 2).toUpperCase()
  const verified = realUser?.isVerified ?? mockUser.verified
  const rating = realUser?.sellerRating ? parseFloat(realUser.sellerRating) : mockUser.rating
  const title = listingTitle ?? (thread.listing as { title: string }).title

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
      style={{ background: 'var(--mp-panel-solid)', borderColor: 'var(--mp-border)', backdropFilter: 'blur(12px)' }}
    >
      <button
        onClick={onClose}
        className="text-[#5a5a5a] hover:text-[#f2f2f2] transition-colors"
      >
        <ChevronLeft size={18} />
      </button>

      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #00aeef 0%, #0050c8 100%)' }}
        >
          {initials}
        </div>
        {verified && (
          <BadgeCheck size={13} className="absolute -bottom-0.5 -right-0.5 text-[#00aeef]"
            style={{ filter: 'drop-shadow(0 0 4px rgba(0,174,239,0.7))' }} />
        )}
        <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#4ade80] rounded-full border border-[#0a0a0a]" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-[#f2f2f2] truncate">{name}</p>
          {rating > 0 && (
            <div className="flex items-center gap-0.5">
              <Star size={10} className="text-[#ffc107] fill-[#ffc107]" />
              <span className="text-[10px] text-[#a0a0a0]">{rating.toFixed(1)}</span>
            </div>
          )}
        </div>
        {listingSlug ? (
          <Link
            href={`/marketplace/${listingSlug}`}
            className="text-[10px] text-[#00aeef] truncate hover:underline"
            onClick={e => e.stopPropagation()}
          >
            Sobre: {title}
          </Link>
        ) : (
          <p className="text-[10px] text-[#9a9a9a] truncate">{title}</p>
        )}
      </div>

      {/* Protected payment chip */}
      <div className="flex items-center gap-1 px-2 py-1 rounded-full flex-shrink-0"
        style={{ background: 'rgba(0,174,239,0.08)', border: '1px solid rgba(0,174,239,0.18)' }}>
        <Shield size={10} className="text-[#00aeef]" />
        <span className="text-[9px] text-[#00aeef] font-medium tracking-wide">PAGO PROTEGIDO</span>
      </div>

      <button onClick={onClose} className="text-[#5a5a5a] hover:text-[#f2f2f2] transition-colors ml-1">
        <X size={16} />
      </button>
    </div>
  )
}

// ─── Input Area ───────────────────────────────────────────────────────────────

function ChatInput({ onSend }: { onSend: (content: string) => Promise<void> }) {
  const [value, setValue] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSubmit() {
    const trimmed = value.trim()
    if (!trimmed || sending) return
    setSending(true)
    setValue('')
    try {
      await onSend(trimmed)
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div
      className="flex items-end gap-2 px-4 py-3 border-t flex-shrink-0"
      style={{ background: 'var(--mp-panel-solid)', borderColor: 'var(--mp-border)' }}
    >
      <div className="flex-1 relative">
        <textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
          placeholder="Escribe un mensaje…"
          rows={1}
          className="mp-themed-input w-full resize-none rounded-xl px-4 py-2.5 text-sm outline-none transition-all duration-250 disabled:opacity-60"
          style={{
            border: '1px solid var(--mp-input-border)',
            maxHeight: '120px',
          }}
          onInput={e => {
            const t = e.target as HTMLTextAreaElement
            t.style.height = 'auto'
            t.style.height = Math.min(t.scrollHeight, 120) + 'px'
          }}
        />
      </div>
      <button
        className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-250 disabled:opacity-40"
        style={{
          background: value.trim() && !sending
            ? 'linear-gradient(135deg, #00aeef 0%, #0050c8 100%)'
            : 'var(--mp-input)',
          border: value.trim() && !sending ? 'none' : '1px solid var(--mp-input-border)',
        }}
        disabled={!value.trim() || sending}
        onClick={handleSubmit}
      >
        {sending
          ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          : <Send size={15} className={value.trim() ? 'text-white' : 'text-[#5a5a5a]'} />
        }
      </button>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface TransactionChatProps {
  /** Full pre-built thread (legacy demo or real). */
  thread?: MessageThread
  /** Real DB thread ID — enables actual message persistence + polling. */
  threadId?: string
  /** Logged-in user's data — determines message ownership. */
  currentUserId?: string
  currentUserName?: string
  currentUserInitials?: string
  /** Real-mode: replaces mock participant data in the header. */
  otherUser?: RealChatUser
  /** Real-mode: listing context shown in the header. */
  listingTitle?: string
  listingSlug?: string
  onClose?: () => void
  className?: string
  /** Called when a message is sent - for optimistic UI updates */
  onMessageSent?: () => void
}

export function TransactionChat({
  thread = MOCK_THREAD,
  threadId,
  currentUserId,
  currentUserName,
  currentUserInitials,
  otherUser,
  listingTitle,
  listingSlug,
  onClose = () => {},
  className,
  onMessageSent,
}: TransactionChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // The effective viewer ID — falls back to the mock buyer for the demo thread.
  const effectiveUserId = currentUserId ?? 'u6'

  // Real mode starts empty; mock mode starts with thread messages.
  const [localMessages, setLocalMessages] = useState<Message[]>(
    threadId ? [] : thread.messages,
  )

  // Mock mode: sync when thread changes. Real mode: managed by the DB effect below.
  useEffect(() => {
    if (!threadId) {
      setLocalMessages(thread.messages)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread.id, threadId])

  // Track unread acknowledgement without marking messages as read on mount.
  // Do not use onScroll: programmatic auto-scroll can fire scroll events.
  const markReadPendingRef = useRef(false)

  // Real mode: load messages from DB on mount and poll every 10 s.
  useEffect(() => {
    if (!threadId) return

    let active = true
    async function pull() {
      const res = await getThreadMessagesAction(threadId!, 50)
      if (!active || !res.success) return
      setLocalMessages((res.data as DbMessage[]).map(normalizeDbMessage))
    }

    void pull()
    // DO NOT mark as read on mount - wait for explicit user intent
    markReadPendingRef.current = true
    const timer = setInterval(pull, 10_000)

    return () => {
      active = false
      clearInterval(timer)
    }
  }, [threadId])

  // Mark messages as read only after explicit user intent.
  async function ensureMarkedAsRead() {
    if (markReadPendingRef.current && threadId) {
      markReadPendingRef.current = false
      await markMessagesReadAction(threadId)
    }
  }

  // Auto-scroll to bottom whenever messages change.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [localMessages])

  async function handleSend(content: string) {
    if (!content.trim()) return

    const senderName = currentUserName ?? 'Tú'
    const senderInitials =
      currentUserInitials ?? senderName.slice(0, 2).toUpperCase()

    // Optimistic: show the message immediately in the UI.
    const optimistic: Message = {
      id: `local_${Date.now()}`,
      threadId: threadId ?? thread.id,
      senderId: effectiveUserId,
      senderName,
      senderInitials,
      content,
      type: 'text',
      createdAt: new Date().toISOString(),
      read: false,
    }
    setLocalMessages(prev => [...prev, optimistic])

    if (threadId) {
      // Persist to DB + trigger WhatsApp notification (server action handles both).
      await sendMessageAction(threadId, content)
      // Immediately refresh from DB to replace the optimistic message with the real one.
      const res = await getThreadMessagesAction(threadId, 50)
      if (res.success) {
        setLocalMessages((res.data as DbMessage[]).map(normalizeDbMessage))
      }
      // Notify parent component for optimistic UI updates
      onMessageSent?.()
    } else {
      // Demo mode: call Turpial Assistant AI.
      const typingId = `typing_${Date.now()}`
      const typingMsg: Message = {
        id: typingId,
        threadId: thread.id,
        senderId: 'turpial-assistant',
        senderName: 'Turpial Assistant',
        senderInitials: 'TA',
        content: '...',
        type: 'text',
        createdAt: new Date().toISOString(),
        read: true,
      }
      setLocalMessages(prev => [...prev, typingMsg])

      try {
        const res = await fetch('/api/marketplace/ai-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content }),
        })
        const json = (await res.json()) as { reply?: string; error?: string }
        const replyText =
          json.reply ??
          json.error ??
          'No pude procesar tu mensaje. Intenta de nuevo.'

        const aiMsg: Message = {
          id: `ai_${Date.now()}`,
          threadId: thread.id,
          senderId: 'turpial-assistant',
          senderName: 'Turpial Assistant',
          senderInitials: 'TA',
          content: replyText,
          type: 'text',
          createdAt: new Date().toISOString(),
          read: true,
        }
        setLocalMessages(prev => prev.filter(m => m.id !== typingId).concat(aiMsg))
      } catch {
        setLocalMessages(prev => prev.filter(m => m.id !== typingId))
      }
    }
  }

  return (
    <div
      className={cn(
        'flex flex-col rounded-2xl overflow-hidden',
        className,
      )}
      style={{
        background: 'var(--mp-panel-solid)',
        border: '1px solid var(--mp-border)',
        boxShadow: 'var(--mp-shadow), 0 0 120px rgba(0,174,239,0.06)',
        height: '100%',
      }}
    >
      {/* Header */}
      <ChatHeader thread={thread} realUser={otherUser} listingTitle={listingTitle} listingSlug={listingSlug} onClose={onClose} />

      {/* Security Warning — always visible */}
      <div className="flex-shrink-0">
        <SecurityBanner />
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-none"
        style={{ scrollBehavior: 'smooth' }}
        onPointerDown={() => { void ensureMarkedAsRead() }}
        onWheel={() => { void ensureMarkedAsRead() }}
        onTouchStart={() => { void ensureMarkedAsRead() }}
      >
        {localMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-8">
            <p className="text-[11px] text-[#b8b8b8]">
              Inicia la conversación con el vendedor.
            </p>
          </div>
        )}
        {localMessages.map(message => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={message.senderId === effectiveUserId}
          />
        ))}
        <div className="h-2" />
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} />
    </div>
  )
}

// ─── Seller Dashboard — Split de Pagos ───────────────────────────────────────
// Componente auxiliar: muestra cómo ve el vendedor su dashboard de ingresos

export function SellerPaymentBreakdown({ quote }: { quote: FormalQuote }) {
  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{
        background: 'var(--mp-card)',
        border: '1px solid var(--mp-border)',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <TrendingDown size={13} className="text-[#ffc107]" />
        <span className="text-xs font-semibold text-[#f2f2f2] uppercase tracking-wider">
          Tu Liquidación
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-[#a0a0a0]">Precio acordado</span>
          <span className="text-[#f2f2f2]">${quote.basePrice.toLocaleString()} {quote.currency}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-[#a0a0a0]">
            Comisión Turpial ({(quote.commissionRate * 100).toFixed(0)}%)
          </span>
          <span className="text-[#ef4444]">− ${quote.commissionAmount.toLocaleString()}</span>
        </div>
        <div className="h-px" style={{ background: 'var(--mp-border)' }} />
        <div className="flex justify-between">
          <span className="text-sm font-medium text-[#f2f2f2]">Recibirás</span>
          <div className="text-right">
            <span className="text-lg font-bold text-[#4ade80]">
              ${quote.sellerReceives.toLocaleString()}
            </span>
            <span className="text-xs text-[#b8b8b8] ml-1">{quote.currency}</span>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-[#b8b8b8]">
        <Shield size={9} className="inline mr-1 text-[#00aeef]" />
        Los fondos son liberados {7} días después de que el comprador confirme la entrega.
      </p>
    </div>
  )
}
