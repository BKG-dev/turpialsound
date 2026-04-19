'use server'

import { getDb } from '@/lib/marketplace/db'
import { getSession, setSessionCookie } from '@/lib/marketplace/auth'
import type { ActionResult } from '@/lib/validations/marketplace'

// ─── GET MY PROFILE ───────────────────────────────────────────────────────────

export async function getMyProfile(): Promise<ActionResult<object>> {
  const session = await getSession()
  if (!session) return { success: false, message: 'No autenticado' }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const user = await db.mpUser.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        isVerified: true,
        verificationLevel: true,
        isSeller: true,
        sellerRating: true,
        totalSales: true,
        totalPurchases: true,
        role: true,
        createdAt: true,
      },
    })

    if (!user) return { success: false, message: 'Usuario no encontrado' }

    await db.$disconnect()
    return { success: true, data: user, message: 'OK' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

// ─── UPDATE PROFILE ───────────────────────────────────────────────────────────
// Updates displayName, bio, and/or avatarUrl. Also refreshes the session cookie
// if displayName changed (so the auth bar updates immediately).

export async function updateProfile(data: {
  displayName?: string
  bio?: string
  avatarUrl?: string
}): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, message: 'No autenticado' }

  if (data.displayName !== undefined) {
    if (data.displayName.trim().length < 2) return { success: false, message: 'El nombre debe tener al menos 2 caracteres' }
    if (data.displayName.trim().length > 60) return { success: false, message: 'El nombre no puede exceder 60 caracteres' }
  }
  if (data.bio !== undefined && data.bio.length > 500) {
    return { success: false, message: 'La bio no puede exceder 500 caracteres' }
  }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const updateData: Record<string, string> = {}
    if (data.displayName !== undefined) updateData.displayName = data.displayName.trim()
    if (data.bio !== undefined) updateData.bio = data.bio
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl

    await db.mpUser.update({ where: { id: session.userId }, data: updateData })

    // Refresh JWT so displayName in the auth bar updates without re-login
    if (data.displayName !== undefined) {
      await setSessionCookie({
        ...session,
        displayName: data.displayName.trim(),
      })
    }

    await db.$disconnect()
    return { success: true, data: undefined, message: 'Perfil actualizado' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

// ─── GET PUBLIC PROFILE ───────────────────────────────────────────────────────
// Returns a user's public-facing profile with their active listings.

export async function getUserProfile(userId: string): Promise<ActionResult<object>> {
  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const user = await db.mpUser.findUnique({
      where: { id: userId, isBanned: false },
      select: {
        id: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        isVerified: true,
        isSeller: true,
        sellerRating: true,
        totalSales: true,
        role: true,
        createdAt: true,
        listings: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 12,
          select: {
            id: true,
            title: true,
            slug: true,
            price: true,
            currency: true,
            coverImageUrl: true,
            category: true,
            createdAt: true,
          },
        },
      },
    })

    if (!user) return { success: false, message: 'Usuario no encontrado' }

    await db.$disconnect()
    return { success: true, data: user, message: 'OK' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

// ─── BECOME SELLER ────────────────────────────────────────────────────────────
// Activates the seller profile for the current user.
// Also refreshes the JWT so isSeller=true appears in the auth bar immediately.

export async function becomeSeller(): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, message: 'No autenticado' }
  if (session.isSeller) return { success: true, data: undefined, message: 'Ya eres vendedor' }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    await db.mpUser.update({ where: { id: session.userId }, data: { isSeller: true } })
    await setSessionCookie({ ...session, isSeller: true })

    await db.$disconnect()
    return { success: true, data: undefined, message: 'Perfil de vendedor activado' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

// ─── ADD PAYOUT METHOD ────────────────────────────────────────────────────────
// Adds a withdrawal method for the seller.
// encryptedData should be AES-encrypted at the application layer before storing.
// Valid methodTypes: ZELLE | PAGO_MOVIL | CRYPTO_WALLET | BANK_TRANSFER

export async function addPayoutMethod(data: {
  methodType: string
  encryptedData: string
  displayLabel: string
  currency: string
  isDefault?: boolean
}): Promise<ActionResult<{ id: string }>> {
  const session = await getSession()
  if (!session) return { success: false, message: 'No autenticado' }

  if (!data.displayLabel.trim()) return { success: false, message: 'La etiqueta no puede estar vacía' }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    if (data.isDefault) {
      // Unset current default
      await db.mpPayoutMethod.updateMany({
        where: { userId: session.userId, isDefault: true },
        data: { isDefault: false },
      })
    }

    const method = await db.mpPayoutMethod.create({
      data: {
        userId: session.userId,
        methodType: data.methodType,
        encryptedData: data.encryptedData,
        displayLabel: data.displayLabel.trim(),
        currency: data.currency,
        isDefault: data.isDefault ?? false,
        isActive: true,
      },
      select: { id: true },
    })

    await db.$disconnect()
    return { success: true, data: { id: method.id }, message: 'Método de cobro añadido' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

// ─── GET PAYOUT METHODS ───────────────────────────────────────────────────────

export async function getPayoutMethods(): Promise<ActionResult<object[]>> {
  const session = await getSession()
  if (!session) return { success: false, message: 'No autenticado' }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const methods = await db.mpPayoutMethod.findMany({
      where: { userId: session.userId, isActive: true },
      select: {
        id: true,
        methodType: true,
        displayLabel: true,
        currency: true,
        isDefault: true,
        createdAt: true,
        // NOTE: encryptedData is intentionally omitted from this query
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    })

    await db.$disconnect()
    return { success: true, data: methods, message: 'OK' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

// ─── SET DEFAULT PAYOUT METHOD ────────────────────────────────────────────────

export async function setDefaultPayoutMethod(methodId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, message: 'No autenticado' }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const method = await db.mpPayoutMethod.findUnique({ where: { id: methodId } })
    if (!method) return { success: false, message: 'Método no encontrado' }
    if (method.userId !== session.userId) return { success: false, message: 'Sin permiso' }

    // Unset all, then set the new default
    await db.mpPayoutMethod.updateMany({
      where: { userId: session.userId },
      data: { isDefault: false },
    })
    await db.mpPayoutMethod.update({ where: { id: methodId }, data: { isDefault: true } })

    await db.$disconnect()
    return { success: true, data: undefined, message: 'Método por defecto actualizado' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

// ─── GET SELLER PAYOUT METHODS FOR CHECKOUT ──────────────────────────────────
// Exposes the seller's bank details to the buyer ONLY when:
//   1. Caller is authenticated
//   2. transactionId belongs to caller as buyer
//   3. Transaction is in INITIATED state
// Returns encryptedData (plain JSON in current implementation) filtered to
// PAGO_MOVIL | BANK_TRANSFER | CRYPTO_WALLET — never ZELLE.

export async function getSellerPayoutMethodsForCheckout(
  sellerId: string,
  transactionId: string,
): Promise<ActionResult<object[]>> {
  const session = await getSession()
  if (!session) return { success: false, message: 'No autenticado' }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    // Strict ownership + state verification
    const tx = await db.mpTransaction.findUnique({
      where: { id: transactionId },
      select: { buyerId: true, sellerId: true, status: true },
    })

    if (!tx) return { success: false, message: 'Transacción no encontrada' }
    if (tx.buyerId !== session.userId) return { success: false, message: 'Sin permiso' }
    if (tx.sellerId !== sellerId) return { success: false, message: 'Vendedor no coincide con la transacción' }
    if (tx.status !== 'INITIATED' && tx.status !== 'PENDING_PAYMENT') {
      return { success: false, message: 'Estado de transacción inválido para obtener métodos de pago' }
    }

    const ALLOWED_METHODS = ['PAGO_MOVIL', 'BANK_TRANSFER', 'CRYPTO_WALLET']

    const methods = await db.mpPayoutMethod.findMany({
      where: {
        userId: sellerId,
        isActive: true,
        methodType: { in: ALLOWED_METHODS as ['PAGO_MOVIL', 'BANK_TRANSFER', 'CRYPTO_WALLET'] },
      },
      select: {
        id: true,
        methodType: true,
        displayLabel: true,
        currency: true,
        isDefault: true,
        encryptedData: true,
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    })

    await db.$disconnect()
    return { success: true, data: methods, message: 'OK' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

// ─── REMOVE PAYOUT METHOD ─────────────────────────────────────────────────────
// Soft-delete: sets isActive=false to preserve audit trail.

export async function removePayoutMethod(methodId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, message: 'No autenticado' }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const method = await db.mpPayoutMethod.findUnique({ where: { id: methodId } })
    if (!method) return { success: false, message: 'Método no encontrado' }
    if (method.userId !== session.userId) return { success: false, message: 'Sin permiso' }

    await db.mpPayoutMethod.update({ where: { id: methodId }, data: { isActive: false } })

    await db.$disconnect()
    return { success: true, data: undefined, message: 'Método eliminado' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}
