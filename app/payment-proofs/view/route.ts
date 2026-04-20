import { get } from '@vercel/blob'
import { prisma } from '@/lib/db'
import { validatePaymentProofAccessToken } from '@/lib/bookings/payment-proof-access'

export const dynamic = 'force-dynamic'

function buildTextResponse(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

function getBlobToken(): string | null {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim()
  return token ? token : null
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')?.trim() ?? ''

  if (!token) {
    return buildTextResponse('Falta token de acceso al comprobante.', 400)
  }

  const tokenValidation = validatePaymentProofAccessToken(token)
  if (!tokenValidation.ok) {
    if (tokenValidation.error === 'misconfigured_secret') {
      return buildTextResponse(
        'Configuracion incompleta: falta PAYMENT_PROOF_ACCESS_SECRET.',
        500,
      )
    }

    if (tokenValidation.error === 'expired_token') {
      return buildTextResponse('El enlace del comprobante ha expirado.', 410)
    }

    return buildTextResponse('Token de acceso invalido.', 401)
  }

  const blobToken = getBlobToken()
  if (!blobToken) {
    return buildTextResponse('Configuracion incompleta: falta BLOB_READ_WRITE_TOKEN.', 500)
  }

  const paymentProof = await prisma.paymentProof.findUnique({
    where: {
      id: tokenValidation.payload.paymentProofId,
    },
    select: {
      id: true,
      isActive: true,
      mimeType: true,
      blobPathname: true,
      bookingRequest: {
        select: {
          publicCode: true,
        },
      },
    },
  })

  if (!paymentProof) {
    return buildTextResponse('Comprobante no encontrado.', 404)
  }

  if (!paymentProof.isActive) {
    return buildTextResponse('Comprobante inactivo.', 410)
  }

  const tokenPublicCode = tokenValidation.payload.bookingPublicCode
  if (paymentProof.bookingRequest.publicCode.trim().toUpperCase() !== tokenPublicCode) {
    return buildTextResponse('Token de acceso invalido para este comprobante.', 401)
  }

  let blobResult: Awaited<ReturnType<typeof get>>
  try {
    blobResult = await get(paymentProof.blobPathname, {
      access: 'private',
      useCache: false,
      token: blobToken,
    })
  } catch (error) {
    console.error('[payment-proofs.view.get]', error)
    return buildTextResponse('No pudimos recuperar el comprobante desde el storage privado.', 502)
  }

  if (!blobResult || blobResult.statusCode !== 200 || !blobResult.stream) {
    return buildTextResponse('Blob no encontrado para este comprobante.', 404)
  }

  const filename = `payment-proof-${tokenPublicCode}.jpg`
  return new Response(blobResult.stream, {
    status: 200,
    headers: {
      'Content-Type': paymentProof.mimeType || blobResult.blob.contentType || 'image/jpeg',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'no-store, private, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
