'use server'

import { getDb } from '@/lib/marketplace/db'
import { getSession } from '@/lib/marketplace/auth'
import type { ActionResult } from '@/lib/validations/marketplace'
import { sendWhatsAppNotification } from '@/lib/marketplace/notifications'

// ─── GET OR CREATE CHAT THREAD ────────────────────────────────────────────────
// Returns an existing thread or creates a new one between the current user (buyer)
// and the given seller, optionally linked to a specific listing.

export async function getOrCreateThread(
  sellerId: string,
  listingId?: string,
): Promise<ActionResult<{ threadId: string; isNew: boolean }>> {
  const session = await getSession()
  if (!session) return { success: false, message: 'No autenticado' }
  if (session.userId === sellerId) return { success: false, message: 'No puedes chatear contigo mismo' }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const existing = await db.mpChatThread.findFirst({
      where: {
        buyerId: session.userId,
        sellerId,
        listingId: listingId ?? null,
        isActive: true,
      },
    })

    if (existing) {
      await db.$disconnect()
      return { success: true, data: { threadId: existing.id, isNew: false }, message: 'Hilo existente' }
    }

    const thread = await db.mpChatThread.create({
      data: { buyerId: session.userId, sellerId, listingId: listingId ?? null },
      select: { id: true },
    })

    await db.$disconnect()
    return { success: true, data: { threadId: thread.id, isNew: true }, message: 'Hilo creado' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

// ─── SEND MESSAGE ─────────────────────────────────────────────────────────────
// Both buyer and seller can send messages in a thread they participate in.
// Messages are IMMUTABLE — no update/delete operations exist by design.

export async function sendMessage(
  threadId: string,
  content: string,
  attachmentUrl?: string,
): Promise<ActionResult<{ messageId: string }>> {
  if (!content.trim()) return { success: false, message: 'El mensaje no puede estar vacío' }

  const session = await getSession()
  if (!session) return { success: false, message: 'No autenticado' }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const thread = await db.mpChatThread.findUnique({ where: { id: threadId } })
    if (!thread) return { success: false, message: 'Hilo no encontrado' }
    if (!thread.isActive) return { success: false, message: 'Este hilo está cerrado' }

    const isParticipant = thread.buyerId === session.userId || thread.sellerId === session.userId
    if (!isParticipant) return { success: false, message: 'Sin permiso' }

    const receiverId =
      thread.buyerId === session.userId ? thread.sellerId : thread.buyerId

    const message = await db.mpMessage.create({
      data: {
        threadId,
        senderId: session.userId,
        receiverId,
        content: content.trim(),
        attachmentUrl: attachmentUrl ?? null,
      },
      select: { id: true },
    })

    await db.mpChatThread.update({
      where: { id: threadId },
      data: { lastMessageAt: new Date() },
    })

    // WhatsApp notification — fire-and-forget, never blocks the response
    void (async () => {
      try {
        const [receiver, sender] = await Promise.all([
          db.mpUser.findUnique({
            where: { id: receiverId },
            select: { phone: true, whatsappConsent: true },
          }),
          db.mpUser.findUnique({
            where: { id: session.userId },
            select: { displayName: true },
          }),
        ])
        if (receiver?.whatsappConsent && receiver.phone) {
          await sendWhatsAppNotification(
            receiver.phone,
            sender?.displayName ?? 'Turpial Market',
            content.trim(),
          )
        }
      } catch { /* silently ignore */ }
    })()

    await db.$disconnect()
    return { success: true, data: { messageId: message.id }, message: 'Mensaje enviado' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

// ─── GET THREAD MESSAGES ──────────────────────────────────────────────────────
// Returns messages in chronological order (oldest first).
// Uses cursor-based pagination: pass `before` message ID to load earlier messages.

export async function getThreadMessages(
  threadId: string,
  limit = 50,
  before?: string,
): Promise<ActionResult<object[]>> {
  const session = await getSession()
  if (!session) return { success: false, message: 'No autenticado' }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const thread = await db.mpChatThread.findUnique({ where: { id: threadId } })
    if (!thread) return { success: false, message: 'Hilo no encontrado' }

    const isParticipant = thread.buyerId === session.userId || thread.sellerId === session.userId
    const isAdmin = session.role === 'SUPER'
    if (!isParticipant && !isAdmin) return { success: false, message: 'Sin permiso' }

    // Cursor pagination: find the cursor message's date first
    let cursorDate: Date | undefined
    if (before) {
      const cursor = await db.mpMessage.findUnique({ where: { id: before } })
      cursorDate = cursor?.createdAt
    }

    const messages = await db.mpMessage.findMany({
      where: {
        threadId,
        ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
      },
      include: {
        sender: { select: { id: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    await db.$disconnect()
    return { success: true, data: messages.reverse(), message: 'OK' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

// ─── GET MY THREADS ───────────────────────────────────────────────────────────
// Returns all active threads the current user participates in (as buyer or seller),
// sorted by last message. Includes a one-message preview per thread.

export async function getMyThreads(): Promise<ActionResult<object[]>> {
  const session = await getSession()
  if (!session) return { success: false, message: 'No autenticado' }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const threads = await db.mpChatThread.findMany({
      where: {
        isActive: true,
        OR: [{ buyerId: session.userId }, { sellerId: session.userId }],
      },
      include: {
        buyer: { select: { id: true, displayName: true, avatarUrl: true } },
        seller: { select: { id: true, displayName: true, avatarUrl: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, createdAt: true, senderId: true, isRead: true },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    })

    // MpChatThread has no Prisma relation to MpListing — fetch separately by listingId
    const listingIds = threads.map(t => t.listingId).filter((id): id is string => id !== null)
    const listingMap = new Map<string, { id: string; title: string; slug: string; coverImageUrl: string | null }>()
    if (listingIds.length > 0) {
      const listings = await db.mpListing.findMany({
        where: { id: { in: listingIds } },
        select: { id: true, title: true, slug: true, coverImageUrl: true },
      })
      listings.forEach(l => listingMap.set(l.id, l))
    }

    const result = threads.map(t => ({
      ...t,
      listing: t.listingId ? (listingMap.get(t.listingId) ?? null) : null,
    }))

    await db.$disconnect()
    return { success: true, data: result, message: 'OK' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

// ─── MARK MESSAGES READ ───────────────────────────────────────────────────────
// Marks all unread messages addressed to the current user in the thread as read.

export async function markMessagesRead(threadId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, message: 'No autenticado' }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    await db.mpMessage.updateMany({
      where: { threadId, receiverId: session.userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    })

    await db.$disconnect()
    return { success: true, data: undefined, message: 'Mensajes marcados como leídos' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

// ─── GET UNREAD COUNT ─────────────────────────────────────────────────────────
// Returns the total count of unread messages addressed to the current user.
// Lightweight query — safe to poll every 30s.

export async function getUnreadCount(): Promise<ActionResult<{ count: number }>> {
  const session = await getSession()
  if (!session) return { success: false, message: 'No autenticado' }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const count = await db.mpMessage.count({
      where: { receiverId: session.userId, isRead: false },
    })
    await db.$disconnect()
    return { success: true, data: { count }, message: 'OK' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error' }
  }
}

// ─── CLOSE THREAD (ADMIN OR PARTICIPANT) ─────────────────────────────────────

export async function closeThread(threadId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, message: 'No autenticado' }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const thread = await db.mpChatThread.findUnique({ where: { id: threadId } })
    if (!thread) return { success: false, message: 'Hilo no encontrado' }

    const isParticipant = thread.buyerId === session.userId || thread.sellerId === session.userId
    const isAdmin = session.role === 'SUPER'
    if (!isParticipant && !isAdmin) return { success: false, message: 'Sin permiso' }

    await db.mpChatThread.update({ where: { id: threadId }, data: { isActive: false } })

    await db.$disconnect()
    return { success: true, data: undefined, message: 'Hilo cerrado' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}
