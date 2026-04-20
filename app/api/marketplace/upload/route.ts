import { NextResponse } from 'next/server'
import { getSession } from '@/lib/marketplace/auth'
import {
  isMarketplaceUploadPurpose,
  storeMarketplaceFile,
} from '@/lib/marketplace/media'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const purpose = String(formData.get('purpose') ?? '')
    const file = formData.get('file')

    if (!isMarketplaceUploadPurpose(purpose)) {
      return NextResponse.json({ message: 'Tipo de upload no soportado' }, { status: 400 })
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ message: 'Archivo no recibido' }, { status: 400 })
    }

    const stored = await storeMarketplaceFile(file, purpose)

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
