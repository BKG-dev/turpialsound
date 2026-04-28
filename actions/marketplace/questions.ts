'use server'

import { revalidatePath } from 'next/cache'
import { getDb } from '@/lib/marketplace/db'
import { getSession } from '@/lib/marketplace/auth'
import type { ActionResult } from '@/lib/validations/marketplace'

export interface InteractedListing {
  listingId: string
  listingTitle: string
  listingStatus: string
  listingCoverImageUrl: string | null
  listingSlug: string
  questions: QuestionItem[]
}

export interface QuestionItem {
  id: string
  question: string
  answer: string | null
  answeredAt: Date | string | null
  createdAt: Date | string
  asker: { id: string; displayName: string }
}

// ─── GET MY INTERACTED LISTINGS (BUYER DASHBOARD) ────────────────────────────

export async function getMyInteractedListings(): Promise<ActionResult<InteractedListing[]>> {
  const session = await getSession()
  if (!session) return { success: false, message: 'No autenticado' }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const rows = await db.mpListingQuestion.findMany({
      where: { askerId: session.userId },
      include: {
        listing: { select: { id: true, title: true, status: true, coverImageUrl: true, slug: true } },
        asker: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const byListing = new Map<string, InteractedListing>()
    for (const q of rows) {
      const lid = q.listing.id
      if (!byListing.has(lid)) {
        byListing.set(lid, {
          listingId: lid,
          listingTitle: q.listing.title,
          listingStatus: q.listing.status,
          listingCoverImageUrl: q.listing.coverImageUrl,
          listingSlug: q.listing.slug,
          questions: [],
        })
      }
      byListing.get(lid)!.questions.push({
        id: q.id,
        question: q.question,
        answer: q.answer,
        answeredAt: q.answeredAt,
        createdAt: q.createdAt,
        asker: q.asker,
      })
    }

    await db.$disconnect()
    return { success: true, data: Array.from(byListing.values()), message: 'OK' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error' }
  }
}

// ─── GET LISTING QUESTIONS (PUBLIC) ──────────────────────────────────────────

export async function getListingQuestions(listingId: string): Promise<ActionResult<QuestionItem[]>> {
  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const questions = await db.mpListingQuestion.findMany({
      where: { listingId },
      include: { asker: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: 'asc' },
    })
    await db.$disconnect()
    return { success: true, data: questions as QuestionItem[], message: 'OK' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error al cargar preguntas' }
  }
}

// ─── ASK QUESTION (AUTH REQUIRED) ────────────────────────────────────────────

export async function askQuestion(
  listingId: string,
  question: string,
): Promise<ActionResult<{ id: string }>> {
  const session = await getSession()
  if (!session) return { success: false, message: 'Debes iniciar sesión para hacer preguntas' }

  const trimmed = question.trim()
  if (trimmed.length < 5) return { success: false, message: 'La pregunta debe tener al menos 5 caracteres' }
  if (trimmed.length > 500) return { success: false, message: 'Máximo 500 caracteres' }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const listing = await db.mpListing.findUnique({
      where: { id: listingId },
      select: { sellerId: true, status: true, title: true },
    })
    if (!listing) return { success: false, message: 'Listing no encontrado' }
    if (listing.status !== 'ACTIVE') return { success: false, message: 'Este listing no está disponible' }

    const q = await db.mpListingQuestion.create({
      data: { listingId, askerId: session.userId, question: trimmed },
      select: { id: true },
    })
    
    // Find or create a chat thread between buyer and seller
    const existingThread = await db.mpChatThread.findFirst({
      where: {
        buyerId: session.userId,
        sellerId: listing.sellerId,
        listingId,
      },
    })
    
    let threadId = existingThread?.id
    
    if (!existingThread) {
      // Create a new thread if one doesn't exist
      const newThread = await db.mpChatThread.create({
        data: {
          buyerId: session.userId,
          sellerId: listing.sellerId,
          listingId,
          isActive: true,
          lastMessageAt: new Date(),
        },
        select: { id: true },
      })
      threadId = newThread.id
    }
    
    // Add the question to the chat thread as a message
    if (threadId) {
      await db.mpMessage.create({
        data: {
          threadId,
          senderId: session.userId,
          receiverId: listing.sellerId,
          content: `[Pregunta pública sobre "${listing.title}"]: ${trimmed}`,
        },
      })
      
      // Update thread's last message timestamp
      await db.mpChatThread.update({
        where: { id: threadId },
        data: { lastMessageAt: new Date() },
      })
    }
    
    await db.$disconnect()
    revalidatePath('/marketplace')
    revalidatePath('/marketplace/dashboard')
    return { success: true, data: { id: q.id }, message: 'Pregunta enviada. El vendedor la verá pronto.' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error al enviar pregunta' }
  }
}

// ─── ANSWER QUESTION (SELLER OR SUPER ONLY) ──────────────────────────────────

export async function answerQuestion(
  questionId: string,
  answer: string,
): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, message: 'No autenticado' }

  const trimmed = answer.trim()
  if (!trimmed) return { success: false, message: 'La respuesta no puede estar vacía' }
  if (trimmed.length > 1000) return { success: false, message: 'Máximo 1000 caracteres' }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const q = await db.mpListingQuestion.findUnique({
      where: { id: questionId },
      include: {
        listing: { select: { id: true, sellerId: true, title: true } },
        asker: { select: { id: true } }
      },
    })
    if (!q) return { success: false, message: 'Pregunta no encontrada' }
    if (q.listing.sellerId !== session.userId && session.role !== 'SUPER') {
      return { success: false, message: 'Solo el vendedor puede responder esta pregunta' }
    }
    if (q.answer) return { success: false, message: 'Esta pregunta ya fue respondida' }

    await db.mpListingQuestion.update({
      where: { id: questionId },
      data: { answer: trimmed, answeredAt: new Date() },
    })
    
    // Find the chat thread between buyer and seller
    const thread = await db.mpChatThread.findFirst({
      where: {
        buyerId: q.asker.id,
        sellerId: q.listing.sellerId,
        listingId: q.listing.id,
      },
    })
    
    // If thread exists, add the answer as a message
    if (thread) {
      await db.mpMessage.create({
        data: {
          threadId: thread.id,
          senderId: session.userId,
          receiverId: q.asker.id,
          content: `[Respuesta a tu pregunta sobre "${q.listing.title}"]: ${trimmed}`,
        },
      })
      
      // Update thread's last message timestamp
      await db.mpChatThread.update({
        where: { id: thread.id },
        data: { lastMessageAt: new Date() },
      })
    }
    
    await db.$disconnect()
    revalidatePath('/marketplace')
    revalidatePath('/marketplace/dashboard')
    return { success: true, data: undefined, message: 'Respuesta publicada' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error al responder' }
  }
}
