'use client'

import { useState } from 'react'
import { HelpCircle, Send, Loader2, ChevronDown, MessageSquare } from 'lucide-react'
import { askQuestion, answerQuestion } from '@/actions/marketplace/questions'
import type { QuestionItem } from '@/actions/marketplace/questions'

// ─── Individual Q row ─────────────────────────────────────────────────────────

function QuestionRow({
  q,
  isSeller,
  isLoggedIn,
  onAnswered,
  onFollowUp,
}: {
  q: QuestionItem
  isSeller: boolean
  isLoggedIn: boolean
  onAnswered: (id: string, answer: string) => void
  onFollowUp: (questionId: string, followUpText: string) => void
}) {
  const [answerText, setAnswerText] = useState('')
  const [followUpText, setFollowUpText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [followUpSubmitting, setFollowUpSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [followUpError, setFollowUpError] = useState<string | null>(null)
  const [showInput, setShowInput] = useState(false)
  const [showFollowUp, setShowFollowUp] = useState(false)

  async function handleAnswer() {
    if (!answerText.trim()) return
    setSubmitting(true)
    setError(null)
    const res = await answerQuestion(q.id, answerText.trim())
    if (res.success) {
      onAnswered(q.id, answerText.trim())
      setAnswerText('')
      setShowInput(false)
    } else {
      setError(res.message)
    }
    setSubmitting(false)
  }
  
  async function handleFollowUp() {
    if (!followUpText.trim()) return
    setFollowUpSubmitting(true)
    setFollowUpError(null)
    try {
      await onFollowUp(q.id, followUpText.trim())
      setFollowUpText('')
      setShowFollowUp(false)
    } catch (error) {
      setFollowUpError(error instanceof Error ? error.message : 'Error al enviar la pregunta')
    } finally {
      setFollowUpSubmitting(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <HelpCircle size={12} className="text-[#00aeef] mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-relaxed text-[#f2f2f2]">{q.question}</p>
          <p className="mt-1 text-[11px] text-[#9a9a9a]">
            {q.asker.displayName} · {new Date(q.createdAt).toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })}
          </p>
        </div>
      </div>

      {q.answer ? (
        <div className="space-y-3">
          <div
            className="ml-0 rounded-xl px-3 py-3 sm:ml-5"
            style={{ background: 'rgba(0,174,239,0.08)', border: '1px solid rgba(0,174,239,0.2)' }}
          >
            <p className="text-[10px] font-semibold text-[#00aeef] mb-0.5 uppercase tracking-wide">Vendedor</p>
            <p className="text-sm leading-relaxed text-[#e6e6e6]">{q.answer}</p>
          </div>
          
          {/* Follow-up button for answered questions */}
          {!isSeller && isLoggedIn && (
            <div className="ml-0 sm:ml-5">
              {!showFollowUp ? (
                <button
                  onClick={() => setShowFollowUp(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                  style={{
                    background: 'rgba(255,193,7,0.06)',
                    border: '1px solid rgba(255,193,7,0.18)',
                    color: '#ffc107',
                  }}
                >
                  <MessageSquare size={11} /> Preguntar más
                </button>
              ) : (
                <div className="space-y-2">
                  <textarea
                    id={`listing-follow-up-${q.id}`}
                    name={`listing-follow-up-${q.id}`}
                    value={followUpText}
                    onChange={e => setFollowUpText(e.target.value)}
                    placeholder="Escribe una pregunta adicional..."
                    rows={3}
                    maxLength={500}
                    className="mp-themed-input min-h-[96px] w-full resize-y rounded-xl px-3 py-3 text-sm outline-none focus:border-[rgba(255,193,7,0.45)] sm:min-h-[72px]"
                    style={{
                      border: '1px solid rgba(255,193,7,0.28)',
                    }}
                  />
                  {followUpError && <p className="text-[11px] text-[#ef4444]">{followUpError}</p>}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      onClick={() => { setShowFollowUp(false); setFollowUpText(''); setFollowUpError(null) }}
                      className="rounded-lg px-3 py-2 text-[11px] text-[#c0c0c0] transition-colors hover:text-[#f2f2f2]"
                      style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleFollowUp}
                      disabled={followUpSubmitting || !followUpText.trim()}
                      className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-medium transition-all disabled:opacity-50"
                      style={{
                        background: 'rgba(255,193,7,0.12)',
                        border: '1px solid rgba(255,193,7,0.25)',
                        color: '#ffc107',
                      }}
                    >
                      {followUpSubmitting ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                      Enviar pregunta
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          {isSeller ? (
            <div className="ml-0 space-y-2 sm:ml-5">
              {!showInput ? (
                <button
                  onClick={() => setShowInput(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                  style={{
                    background: 'rgba(0,174,239,0.06)',
                    border: '1px solid rgba(0,174,239,0.18)',
                    color: '#00aeef',
                  }}
                >
                  <MessageSquare size={11} /> Responder
                </button>
              ) : (
                <div className="space-y-2">
                  <textarea
                    id={`listing-answer-${q.id}`}
                    name={`listing-answer-${q.id}`}
                    value={answerText}
                    onChange={e => setAnswerText(e.target.value)}
                    placeholder="Escribe tu respuesta pública..."
                    rows={3}
                    maxLength={1000}
                    className="mp-themed-input min-h-[96px] w-full resize-y rounded-xl px-3 py-3 text-sm outline-none focus:border-[rgba(0,174,239,0.45)] sm:min-h-[72px]"
                    style={{
                      border: '1px solid rgba(0,174,239,0.28)',
                    }}
                  />
                  {error && <p className="text-[11px] text-[#ef4444]">{error}</p>}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      onClick={() => { setShowInput(false); setAnswerText(''); setError(null) }}
                      className="rounded-lg px-3 py-2 text-[11px] text-[#c0c0c0] transition-colors hover:text-[#f2f2f2]"
                      style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleAnswer}
                      disabled={submitting || !answerText.trim()}
                      className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-medium transition-all disabled:opacity-50"
                      style={{
                        background: 'rgba(0,174,239,0.12)',
                        border: '1px solid rgba(0,174,239,0.25)',
                        color: '#00aeef',
                      }}
                    >
                      {submitting ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                      Publicar respuesta
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="ml-0 text-[11px] italic text-[#9a9a9a] sm:ml-5">Pendiente de respuesta del vendedor</p>
          )}
        </>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ListingQASection({
  listingId,
  sellerId,
  currentUserId,
  initialQuestions = [],
}: {
  listingId: string
  sellerId: string
  currentUserId?: string
  initialQuestions?: QuestionItem[]
}) {
  const [questions, setQuestions] = useState<QuestionItem[]>(initialQuestions)
  const [newQuestion, setNewQuestion] = useState('')
  const [asking, setAsking] = useState(false)
  const [askError, setAskError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(true)

  const isSeller = currentUserId === sellerId
  const isLoggedIn = !!currentUserId

  function handleAnswered(id: string, answer: string) {
    setQuestions(prev =>
      prev.map(q => q.id === id ? { ...q, answer, answeredAt: new Date().toISOString() } : q),
    )
  }

  async function handleAsk() {
    if (newQuestion.trim().length < 5) { setAskError('Mínimo 5 caracteres'); return }
    setAsking(true)
    setAskError(null)
    const res = await askQuestion(listingId, newQuestion.trim())
    if (res.success && res.data) {
      setQuestions(prev => [
        ...prev,
        {
          id: res.data!.id,
          question: newQuestion.trim(),
          answer: null,
          answeredAt: null,
          createdAt: new Date().toISOString(),
          asker: { id: currentUserId!, displayName: 'Tú' },
        },
      ])
      setNewQuestion('')
    } else {
      setAskError(res.message)
    }
    setAsking(false)
  }
  
  async function handleFollowUp(questionId: string, followUpText: string) {
    if (!isLoggedIn) return
    
    const res = await askQuestion(listingId, followUpText)
    if (res.success && res.data) {
      setQuestions(prev => [
        ...prev,
        {
          id: res.data!.id,
          question: followUpText,
          answer: null,
          answeredAt: null,
          createdAt: new Date().toISOString(),
          asker: { id: currentUserId!, displayName: 'Tú' },
        },
      ])
      return true
    } else {
      throw new Error(res.message || 'Error al enviar la pregunta')
    }
  }

  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{ background: 'var(--mp-panel-solid)', border: '1px solid var(--mp-border-strong)' }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center justify-between px-5 py-4"
        style={{ borderBottom: expanded ? '1px solid var(--mp-border)' : 'none' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(0,174,239,0.1)', border: '1px solid rgba(0,174,239,0.2)' }}
          >
            <HelpCircle size={14} className="text-[#00aeef]" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-[#f2f2f2]">Preguntas y Respuestas</p>
            <p className="text-[11px] text-[#b8b8b8]">
              {questions.length} pregunta{questions.length !== 1 ? 's' : ''} públicas
            </p>
          </div>
        </div>
        <ChevronDown
          size={16}
          className="text-[#8a8a8a] transition-transform duration-200"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {expanded && (
        <div className="px-5 py-4 space-y-5">
          {/* Question list */}
          {questions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6">
              <HelpCircle size={24} className="text-[#6f6f6f]" />
              <p className="text-sm text-[#d4d4d4]">Aún no hay preguntas</p>
              <p className="text-xs text-[#9a9a9a]">Sé el primero en preguntar sobre este listing.</p>
            </div>
          ) : (
            <div className="space-y-4 divide-y divide-[rgba(255,255,255,0.04)]">
              {questions.map(q => (
                <div key={q.id} className="pt-4 first:pt-0">
                  <QuestionRow
                    q={q}
                    isSeller={isSeller}
                    isLoggedIn={isLoggedIn}
                    onAnswered={handleAnswered}
                    onFollowUp={handleFollowUp}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Ask input — only for non-seller logged-in users */}
          {!isSeller && (
            <div
              className="space-y-3 rounded-xl p-4"
              style={{ background: 'var(--mp-card-subtle)', border: '1px solid var(--mp-border)' }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-[#d4d4d4]">Hacer una pregunta</p>
              {isLoggedIn ? (
                <>
                  <textarea
                    id={`listing-question-${listingId}`}
                    name={`listing-question-${listingId}`}
                    value={newQuestion}
                    onChange={e => setNewQuestion(e.target.value)}
                    placeholder="Escribe tu pregunta sobre este listing..."
                    rows={3}
                    maxLength={500}
                    className="mp-themed-input min-h-[112px] w-full resize-y rounded-xl px-3 py-3 text-sm outline-none focus:border-[rgba(0,174,239,0.45)] sm:min-h-[88px]"
                    style={{ border: '1px solid var(--mp-input-border)' }}
                  />
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    {askError && <p className="text-[11px] text-[#ef4444]">{askError}</p>}
                    <div className="ml-auto flex w-full items-center justify-between gap-2 sm:w-auto">
                      <span className="text-[10px] text-[#9a9a9a]">{newQuestion.length}/500</span>
                      <button
                        onClick={handleAsk}
                        disabled={asking || newQuestion.trim().length < 5}
                        className="flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-xs font-semibold transition-all disabled:opacity-50 sm:py-2"
                        style={{
                          background: 'rgba(0,174,239,0.12)',
                          border: '1px solid rgba(0,174,239,0.25)',
                          color: '#00aeef',
                        }}
                      >
                        {asking ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                        Enviar
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-xs text-[#b8b8b8]">
                  <a href="/marketplace" className="text-[#00aeef] hover:underline">Inicia sesión</a>
                  {' '}para hacer preguntas públicas a este vendedor.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
