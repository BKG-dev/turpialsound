'use client'

import { useState, useRef, useEffect } from 'react'
import {
  AlertTriangle,
  Shield,
  CheckCircle2,
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
import type { MessageThread, Message, FormalQuote, ServiceListing } from '@/types/marketplace'
import { MOCK_THREAD } from '@/content/marketplace'

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
          <span className="text-[#ef4444] font-medium">BANEO PERMANENTE de la cuenta</span> y la pérdida de toda protección fiduciaria.
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <Shield size={10} className="text-[#00aeef]" />
          <span className="text-[10px] text-[#5a5a5a]">Turpial Market protege tu dinero hasta confirmar la entrega.</span>
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
        background: 'rgba(13,13,13,0.95)',
        border: '1px solid rgba(0,174,239,0.2)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 48px rgba(0,174,239,0.06)',
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2 border-b border-[#1e1e1e]"
        style={{ background: 'rgba(0,174,239,0.04)' }}>
        <Lock size={13} className="text-[#00aeef]" />
        <span className="text-[11px] font-semibold text-[#00aeef] tracking-wider uppercase">
          Cotización Formal
        </span>
        <span className="ml-auto text-[10px] text-[#5a5a5a]">#{quote.id.toUpperCase()}</span>
      </div>

      {/* Listing title */}
      <div className="px-4 pt-3 pb-2">
        <p className="text-xs text-[#a0a0a0] mb-1">Artículo</p>
        <p className="text-sm text-[#f2f2f2] font-medium leading-snug">{quote.listingTitle}</p>
        <p className="text-[11px] text-[#5a5a5a] mt-1">{quote.description}</p>
      </div>

      {/* Price breakdown */}
      <div className="mx-4 mb-3 rounded-lg overflow-hidden"
        style={{ border: '1px solid #1e1e1e', background: 'rgba(0,0,0,0.3)' }}>
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
            <span className="text-[10px] text-[#5a5a5a] ml-1">{quote.currency}</span>
          </div>
        </div>

        <div className="h-px bg-[#1e1e1e]" />

        {/* Seller receives (only shown to seller side for demo) */}
        {!isOwn && (
          <>
            <div className="px-3 py-2 flex items-center justify-between bg-[rgba(0,0,0,0.2)]">
              <span className="text-[10px] text-[#5a5a5a]">Precio base</span>
              <span className="text-xs text-[#a0a0a0]">${quote.basePrice.toLocaleString()}</span>
            </div>
            <div className="px-3 py-2 flex items-center justify-between bg-[rgba(0,0,0,0.2)]">
              <div className="flex items-center gap-1">
                <TrendingDown size={10} className="text-[#ef4444]" />
                <span className="text-[10px] text-[#5a5a5a]">Comisión Turpial ({(quote.commissionRate * 100).toFixed(0)}%)</span>
              </div>
              <span className="text-xs text-[#ef4444]">− ${quote.commissionAmount.toLocaleString()}</span>
            </div>
            <div className="h-px bg-[#1e1e1e]" />
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
      <div className="px-4 pb-3 flex items-center gap-1.5 text-[10px] text-[#5a5a5a]">
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
              <span className="text-sm font-medium text-[#4ade80]">Pago en Escrow · Fondos Retenidos</span>
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
                  Realizar Pago Fiduciario — ${quote.buyerPays.toLocaleString()} {quote.currency}
                </>
              )}
            </button>
          )}

          {!paid && (
            <p className="text-[10px] text-[#5a5a5a] text-center mt-2">
              <Shield size={9} className="inline mr-1 text-[#00aeef]" />
              Tu pago queda retenido en escrow hasta confirmar la entrega
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
        <span className="text-[9px] text-[#5a5a5a] px-1">
          {new Date(message.createdAt).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
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
                background: 'rgba(30,30,30,0.8)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: '#d4d4d4',
                borderBottomLeftRadius: '4px',
              }
        }
      >
        {message.content}
      </div>
      <span className="text-[9px] text-[#5a5a5a] px-1">
        {new Date(message.createdAt).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
        {isOwn && <CheckCircle2 size={9} className="inline ml-1 text-[#00aeef]" />}
      </span>
    </div>
  )
}

// ─── Chat Header ──────────────────────────────────────────────────────────────

function ChatHeader({ thread, onClose }: { thread: MessageThread; onClose: () => void }) {
  const listing = thread.listing
  const otherUser = thread.participants[1]

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 border-b border-[#1e1e1e] flex-shrink-0"
      style={{ background: 'rgba(13,13,13,0.95)', backdropFilter: 'blur(12px)' }}
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
          {otherUser.initials}
        </div>
        {otherUser.verified && (
          <BadgeCheck size={13} className="absolute -bottom-0.5 -right-0.5 text-[#00aeef]"
            style={{ filter: 'drop-shadow(0 0 4px rgba(0,174,239,0.7))' }} />
        )}
        <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#4ade80] rounded-full border border-[#0a0a0a]" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-[#f2f2f2] truncate">{otherUser.name}</p>
          <div className="flex items-center gap-0.5">
            <Star size={10} className="text-[#ffc107] fill-[#ffc107]" />
            <span className="text-[10px] text-[#a0a0a0]">{otherUser.rating.toFixed(1)}</span>
          </div>
        </div>
        <p className="text-[10px] text-[#5a5a5a] truncate">
          {listing.type === 'product' ? listing.title : (listing as ServiceListing).title}
        </p>
      </div>

      {/* Escrow chip */}
      <div className="flex items-center gap-1 px-2 py-1 rounded-full flex-shrink-0"
        style={{ background: 'rgba(0,174,239,0.08)', border: '1px solid rgba(0,174,239,0.18)' }}>
        <Shield size={10} className="text-[#00aeef]" />
        <span className="text-[9px] text-[#00aeef] font-medium tracking-wide">ESCROW</span>
      </div>

      <button onClick={onClose} className="text-[#5a5a5a] hover:text-[#f2f2f2] transition-colors ml-1">
        <X size={16} />
      </button>
    </div>
  )
}

// ─── Input Area ───────────────────────────────────────────────────────────────

function ChatInput() {
  const [value, setValue] = useState('')

  return (
    <div
      className="flex items-end gap-2 px-4 py-3 border-t border-[#1e1e1e] flex-shrink-0"
      style={{ background: 'rgba(13,13,13,0.95)' }}
    >
      <div className="flex-1 relative">
        <textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Escribe un mensaje..."
          rows={1}
          className="w-full resize-none rounded-xl px-4 py-2.5 text-sm text-[#f2f2f2] placeholder:text-[#5a5a5a] outline-none transition-all duration-250"
          style={{
            background: 'rgba(30,30,30,0.8)',
            border: '1px solid rgba(255,255,255,0.06)',
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
          background: value.trim()
            ? 'linear-gradient(135deg, #00aeef 0%, #0050c8 100%)'
            : 'rgba(30,30,30,0.8)',
          border: value.trim() ? 'none' : '1px solid rgba(255,255,255,0.06)',
        }}
        disabled={!value.trim()}
        onClick={() => setValue('')}
      >
        <Send size={15} className={value.trim() ? 'text-white' : 'text-[#5a5a5a]'} />
      </button>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface TransactionChatProps {
  thread?: MessageThread
  onClose?: () => void
  className?: string
}

export function TransactionChat({
  thread = MOCK_THREAD,
  onClose = () => {},
  className,
}: TransactionChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const currentUserId = 'u6' // Mock: buyer is the current user

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [thread.messages])

  return (
    <div
      className={cn(
        'flex flex-col rounded-2xl overflow-hidden',
        className,
      )}
      style={{
        background: 'rgba(10,10,10,0.97)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.8), 0 0 120px rgba(0,174,239,0.06)',
        height: '100%',
      }}
    >
      {/* Header */}
      <ChatHeader thread={thread} onClose={onClose} />

      {/* Security Warning — always visible */}
      <div className="flex-shrink-0">
        <SecurityBanner />
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-none"
        style={{ scrollBehavior: 'smooth' }}
      >
        {thread.messages.map(message => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={message.senderId === currentUserId}
          />
        ))}

        {/* Padding bottom for comfortable scroll */}
        <div className="h-2" />
      </div>

      {/* Input */}
      <ChatInput />
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
        background: 'rgba(13,13,13,0.9)',
        border: '1px solid rgba(255,255,255,0.06)',
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
        <div className="h-px bg-[#1e1e1e]" />
        <div className="flex justify-between">
          <span className="text-sm font-medium text-[#f2f2f2]">Recibirás</span>
          <div className="text-right">
            <span className="text-lg font-bold text-[#4ade80]">
              ${quote.sellerReceives.toLocaleString()}
            </span>
            <span className="text-xs text-[#5a5a5a] ml-1">{quote.currency}</span>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-[#5a5a5a]">
        <Shield size={9} className="inline mr-1 text-[#00aeef]" />
        Los fondos son liberados {7} días después de que el comprador confirme la entrega.
      </p>
    </div>
  )
}
