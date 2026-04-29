'use server'

import { getDb } from '@/lib/marketplace/db'
import { getSession, setSessionCookie } from '@/lib/marketplace/auth'
import type { ActionResult } from '@/lib/validations/marketplace'
import { VENEZUELAN_BANK_OPTIONS } from '@/lib/marketplace/venezuelan-banks'
import { normalizeVenezuelanMobilePhone } from '@/lib/marketplace/venezuelan-phone'

const PAYOUT_METHOD_TYPES = ['PAGO_MOVIL', 'BANK_TRANSFER', 'ZELLE', 'CRYPTO_WALLET'] as const
type PayoutMethodType = (typeof PAYOUT_METHOD_TYPES)[number]

function normalizePayoutMethodType(methodType: string): PayoutMethodType | null {
  const normalized = methodType === 'BINANCE_PAY' ? 'CRYPTO_WALLET' : methodType
  return PAYOUT_METHOD_TYPES.includes(normalized as PayoutMethodType)
    ? normalized as PayoutMethodType
    : null
}

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

export async function addPayoutMethod(data: {
  methodType: string
  encryptedData: string
  displayLabel: string
  currency: string
  isDefault?: boolean
}): Promise<ActionResult<{ id: string }>> {
  const session = await getSession()
  if (!session) return { success: false, message: 'No autenticado' }

  const methodType = normalizePayoutMethodType(data.methodType)
  const displayLabel = data.displayLabel.trim()
  let normalizedEncryptedData = data.encryptedData

  if (!methodType) return { success: false, message: 'Metodo de cobro no soportado' }
  if (!displayLabel) return { success: false, message: 'La etiqueta no puede estar vacia' }
  if (!data.currency.trim()) return { success: false, message: 'La moneda es obligatoria' }

  try {
    const details = JSON.parse(data.encryptedData) as Record<string, unknown>
    const detailsAreValid =
      details &&
      typeof details === 'object' &&
      Object.values(details).every(value => String(value ?? '').trim().length > 0)

    if (!detailsAreValid) return { success: false, message: 'Completa todos los datos del metodo' }

    if ('banco' in details) {
      const bank = String(details.banco ?? '').trim()
      if (!VENEZUELAN_BANK_OPTIONS.some(option => option.label === bank)) {
        return { success: false, message: 'Selecciona un banco valido' }
      }
    }

    if (methodType === 'PAGO_MOVIL') {
      const phone = normalizeVenezuelanMobilePhone(String(details.telefono ?? ''))
      if (!phone) {
        return { success: false, message: 'Ingresa un telefono movil venezolano valido en formato 04XXXXXXXXX' }
      }
      details.telefono = phone
    }

    normalizedEncryptedData = JSON.stringify(details)
  } catch {
    return { success: false, message: 'Datos del metodo invalidos' }
  }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const existingMethod = await db.mpPayoutMethod.findFirst({
      where: {
        userId: session.userId,
        isActive: true,
        methodType,
        encryptedData: normalizedEncryptedData,
      },
      select: { id: true },
    })

    if (existingMethod) {
      await db.$disconnect()
      return { success: false, message: 'Este metodo de cobro ya esta registrado' }
    }

    const activeMethodCount = await db.mpPayoutMethod.count({
      where: { userId: session.userId, isActive: true },
    })
    const shouldBeDefault = data.isDefault || activeMethodCount === 0

    if (shouldBeDefault) {
      await db.mpPayoutMethod.updateMany({
        where: { userId: session.userId, isDefault: true },
        data: { isDefault: false },
      })
    }

    const method = await db.mpPayoutMethod.create({
      data: {
        userId: session.userId,
        methodType,
        encryptedData: normalizedEncryptedData,
        displayLabel,
        currency: data.currency,
        isDefault: shouldBeDefault,
        isActive: true,
      },
      select: { id: true },
    })

    await db.$disconnect()
    return { success: true, data: { id: method.id }, message: 'Metodo de cobro anadido' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

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
        encryptedData: true,
        currency: true,
        isDefault: true,
        createdAt: true,
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

export async function setDefaultPayoutMethod(methodId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, message: 'No autenticado' }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const method = await db.mpPayoutMethod.findUnique({ where: { id: methodId } })
    if (!method) return { success: false, message: 'Metodo no encontrado' }
    if (method.userId !== session.userId) return { success: false, message: 'Sin permiso' }

    await db.mpPayoutMethod.updateMany({
      where: { userId: session.userId },
      data: { isDefault: false },
    })
    await db.mpPayoutMethod.update({ where: { id: methodId }, data: { isDefault: true } })

    await db.$disconnect()
    return { success: true, data: undefined, message: 'Metodo por defecto actualizado' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

export interface SellerCheckoutMethod {
  id: string
  methodType: 'PAGO_MOVIL' | 'ZELLE' | 'CRYPTO_WALLET'
  displayLabel: string
  currency: string
  isDefault: boolean
  encryptedData: string
}

export async function getSellerPayoutMethodsForCheckout(
  sellerId: string,
): Promise<ActionResult<SellerCheckoutMethod[]>> {
  const session = await getSession()
  if (!session) return { success: false, message: 'No autenticado' }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const seller = await db.mpUser.findUnique({
      where: { id: sellerId },
      select: { id: true, isBanned: true },
    })

    if (!seller || seller.isBanned) {
      return { success: false, message: 'Vendedor no disponible' }
    }
    if (seller.id === session.userId) {
      return { success: false, message: 'No puedes comprar tus propios listings' }
    }

    const methods = await db.mpPayoutMethod.findMany({
      where: {
        userId: sellerId,
        isActive: true,
        methodType: { in: ['PAGO_MOVIL', 'ZELLE', 'CRYPTO_WALLET'] },
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
    return { success: true, data: methods as SellerCheckoutMethod[], message: 'OK' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

export async function removePayoutMethod(methodId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, message: 'No autenticado' }

  const db = await getDb()
  if (!db) return { success: false, message: 'Base de datos no disponible' }

  try {
    const method = await db.mpPayoutMethod.findUnique({ where: { id: methodId } })
    if (!method) return { success: false, message: 'Metodo no encontrado' }
    if (method.userId !== session.userId) return { success: false, message: 'Sin permiso' }

    await db.mpPayoutMethod.update({ where: { id: methodId }, data: { isActive: false } })

    await db.$disconnect()
    return { success: true, data: undefined, message: 'Metodo eliminado' }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return { success: false, message: err instanceof Error ? err.message : 'Error desconocido' }
  }
}
