'use client'

import { useState } from 'react'
import { HelpCircle, Send, Loader2, ChevronDown, MessageSquare } from 'lucide-react'
import { askQuestion, answerQuestion } from '@/actions/marketplace/questions'
import type { QuestionItem } from '@/actions/marketplace/questions'

// ─── Individual Q row ─────────────────────────────────────────────────────────

function QuestionRow({
  q,
  isSeller,
  onAnswered,
}: {
  q: QuestionItem
  isSeller: boolean
  onAnswered: (id: string, answer: string) => void
}) {
  const [answerText, setAnswerText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showInput, setShowInput] = useState(false)

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

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <HelpCircle size={12} className="text-[#00aeef] mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-[#d4d4d4] leading-snug">{q.question}</p>
          <p className="text-[10px] text-[#3a3a3a] mt-0.5">
            {q.asker.displayName} · {new Date(q.createdAt).toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })}
          </p>
        </div>
      </div>

      {q.answer ? (
        <div
          className="ml-5 rounded-lg px-3 py-2"
          style={{ background: 'rgba(0,174,239,0.05)', border: '1px solid rgba(0,174,239,0.1)' }}
        >
          <p className="text-[10px] font-semibold text-[#00aeef] mb-0.5 uppercase tracking-wide">Vendedor</p>
          <p className="text-[13px] text-[#c0c0c0] leading-snug">{q.answer}</p>
        </div>
      ) : (
        <>
          {isSeller ? (
            <div className="ml-5 space-y-2">
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
                    value={answerText}
                    onChange={e => setAnswerText(e.target.value)}
                    placeholder="Escribe tu respuesta pública..."
                    rows={2}
                    maxLength={1000}
                    className="w-full px-3 py-2 rounded-xl text-sm text-[#f2f2f2] placeholder:text-[#3a3a3a] outline-none resize-none"
                    style={{
                      background: 'rgba(20,20,20,0.8)',
                      border: '1px solid rgba(0,174,239,0.2)',
                    }}
                  />
                  {error && <p className="text-[11px] text-[#ef4444]">{error}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowInput(false); setAnswerText(''); setError(null) }}
                      className="px-3 py-1.5 rounded-lg text-[11px] text-[#5a5a5a] hover:text-[#a0a0a0] transition-colors"
                      style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleAnswer}
                      disabled={submitting || !answerText.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all disabled:opacity-50"
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
            <p className="ml-5 text-[10px] text-[#3a3a3a] italic">Pendiente de respuesta del vendedor</p>
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
  initialQuestions,
}: {
  listingId: string
  sellerId: string
  currentUserId?: string
  initialQuestions: QuestionItem[]
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

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(13,13,13,0.95)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center justify-between px-5 py-4"
        style={{ borderBottom: expanded ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
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
            <p className="text-[10px] text-[#5a5a5a]">
              {questions.length} pregunta{questions.length !== 1 ? 's' : ''} públicas
            </p>
          </div>
        </div>
        <ChevronDown
          size={16}
          className="text-[#3a3a3a] transition-transform duration-200"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {expanded && (
        <div className="px-5 py-4 space-y-5">
          {/* Question list */}
          {questions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6">
              <HelpCircle size={24} className="text-[#2a2a2a]" />
              <p className="text-sm text-[#5a5a5a]">Aún no hay preguntas</p>
              <p className="text-xs text-[#3a3a3a]">Sé el primero en preguntar sobre este listing.</p>
            </div>
          ) : (
            <div className="space-y-4 divide-y divide-[rgba(255,255,255,0.04)]">
              {questions.map(q => (
                <div key={q.id} className="pt-4 first:pt-0">
                  <QuestionRow q={q} isSeller={isSeller} onAnswered={handleAnswered} />
                </div>
              ))}
            </div>
          )}

          {/* Ask input — only for non-seller logged-in users */}
          {!isSeller && (
            <div
              className="rounded-xl p-4 space-y-3"
              style={{ background: 'rgba(20,20,20,0.6)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <p className="text-xs font-semibold text-[#a0a0a0] uppercase tracking-wider">Hacer una pregunta</p>
              {isLoggedIn ? (
                <>
                  <textarea
                    value={newQuestion}
                    onChange={e => setNewQuestion(e.target.value)}
                    placeholder="Escribe tu pregunta sobre este listing..."
                    rows={2}
                    maxLength={500}
                    className="w-full px-3 py-2 rounded-xl text-sm text-[#f2f2f2] placeholder:text-[#3a3a3a] outline-none resize-none"
                    style={{ background: 'rgba(10,10,10,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}
                  />
                  <div className="flex items-center justify-between">
                    {askError && <p className="text-[11px] text-[#ef4444]">{askError}</p>}
                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-[10px] text-[#3a3a3a]">{newQuestion.length}/500</span>
                      <button
                        onClick={handleAsk}
                        disabled={asking || newQuestion.trim().length < 5}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
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
                <p className="text-xs text-[#5a5a5a]">
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
