import { NextResponse } from 'next/server'
import { getSession } from '@/lib/marketplace/auth'
import { getDb } from '@/lib/marketplace/db'
import {
  buildSensitiveMarketplaceProofUrl,
  readSensitiveMarketplaceMedia,
} from '@/lib/media/marketplace-sensitive-storage'

export const runtime = 'nodejs'

type RouteContext = {
  params: {
    proofPath?: string[]
  }
}

function decodeStoragePath(segments: string[] | undefined) {
  return (segments ?? []).map((segment) => decodeURIComponent(segment)).join('/')
}

export async function GET(_request: Request, context: RouteContext) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 })
  }

  const storagePath = decodeStoragePath(context.params.proofPath)
  if (!storagePath) {
    return NextResponse.json({ message: 'Comprobante no especificado' }, { status: 400 })
  }

  const proofUrl = buildSensitiveMarketplaceProofUrl(storagePath)
  const db = await getDb()
  if (!db) {
    return NextResponse.json({ message: 'Base de datos no disponible' }, { status: 503 })
  }

  try {
    const tx = await db.mpTransaction.findFirst({
      where: { paymentProofUrl: proofUrl },
      select: { buyerId: true },
    })

    if (!tx) {
      return NextResponse.json({ message: 'Comprobante no encontrado' }, { status: 404 })
    }

    const canRead = session.role === 'SUPER' || tx.buyerId === session.userId
    if (!canRead) {
      return NextResponse.json({ message: 'Sin permiso para ver este comprobante' }, { status: 403 })
    }

    const file = await readSensitiveMarketplaceMedia(storagePath)
    const responseBody =
      file.body instanceof ReadableStream
        ? file.body
        : new Blob([file.body as unknown as BlobPart], { type: file.mimeType })

    return new Response(responseBody, {
      status: 200,
      headers: {
        'Content-Type': file.mimeType,
        'Content-Length': String(file.size),
        'Cache-Control': 'private, no-store, max-age=0',
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : 'No se pudo leer el comprobante',
      },
      { status: 500 },
    )
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
