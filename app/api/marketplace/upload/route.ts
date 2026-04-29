import { NextResponse } from 'next/server'
import { getSession } from '@/lib/marketplace/auth'
import { getDb } from '@/lib/marketplace/db'
import {
  isMarketplaceUploadPurpose,
  storeMarketplaceFile,
} from '@/lib/marketplace/media'
import { recordMarketplaceBlobMetadata, type MarketplaceBlobEntityType } from '@/lib/marketplace/blob-metadata'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const purpose = String(formData.get('purpose') ?? '')
    const transactionId = String(formData.get('transactionId') ?? '')
    const file = formData.get('file')

    if (!isMarketplaceUploadPurpose(purpose)) {
      return NextResponse.json({ message: 'Tipo de upload no soportado' }, { status: 400 })
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ message: 'Archivo no recibido' }, { status: 400 })
    }

    if (purpose === 'payment-proof') {
      if (!transactionId) {
        return NextResponse.json(
          { message: 'La transaccion es obligatoria para subir comprobantes' },
          { status: 400 },
        )
      }

      const db = await getDb()
      if (!db) {
        return NextResponse.json({ message: 'Base de datos no disponible' }, { status: 503 })
      }

      try {
        const tx = await db.mpTransaction.findUnique({
          where: { id: transactionId },
          select: { buyerId: true, status: true },
        })

        if (!tx) {
          return NextResponse.json({ message: 'Transaccion no encontrada' }, { status: 404 })
        }

        if (tx.buyerId !== session.userId) {
          return NextResponse.json({ message: 'Sin permiso para adjuntar este comprobante' }, { status: 403 })
        }

        if (tx.status !== 'INITIATED' && tx.status !== 'PENDING_PAYMENT') {
          return NextResponse.json(
            { message: `Estado invalido para adjuntar comprobante: ${tx.status}` },
            { status: 400 },
          )
        }
      } finally {
        await db.$disconnect().catch(() => {})
      }
    }

    const stored = await storeMarketplaceFile(file, purpose)
    const entityType: MarketplaceBlobEntityType =
      purpose === 'payment-proof' ? 'payment_proof' : purpose === 'avatar' ? 'avatar' : 'listing_image'

    await recordMarketplaceBlobMetadata({
      url: stored.url,
      pathname: stored.pathname,
      sizeBytes: stored.size,
      contentType: stored.mimeType,
      entityType,
      entityId: purpose === 'payment-proof' ? transactionId : purpose === 'avatar' ? session.userId : null,
      uploadedAt: new Date(),
    })

    return NextResponse.json({
      url: stored.url,
      mimeType: stored.mimeType,
      size: stored.size,
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : 'No se pudo guardar el archivo',
      },
      { status: 400 },
    )
  }
}
