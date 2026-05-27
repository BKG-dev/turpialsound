import 'server-only'

import { createHash, randomUUID } from 'node:crypto'
import { put } from '@vercel/blob'
import { prisma } from '@/lib/db'

export const PAYMENT_PROOF_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const

export type PaymentProofAllowedMimeType = (typeof PAYMENT_PROOF_ALLOWED_MIME_TYPES)[number]
export type PaymentProofDuplicateStatus = 'none' | 'same_booking' | 'other_booking'

export const PAYMENT_PROOF_MAX_SIZE_BYTES = Math.floor(4.5 * 1024 * 1024)

export interface UploadPaymentProofInput {
  file: File
  bookingId: string
  bookingPublicCode: string
  reportedReference?: string | null
  uploadedAt?: Date
}

export interface UploadedPaymentProofMetadata {
  blobPathname: string
  sha256: string
  mimeType: PaymentProofAllowedMimeType
  sizeBytes: number
  originalFilename: string | null
  uploadedAt: Date
  reportedReference: string | null
  normalizedReference: string | null
  duplicateStatus: PaymentProofDuplicateStatus
}

export class PaymentProofValidationError extends Error {
  readonly code: 'invalid_mime_type' | 'file_empty' | 'file_too_large' | 'missing_file'

  constructor(
    code: PaymentProofValidationError['code'],
    message: string,
  ) {
    super(message)
    this.name = 'PaymentProofValidationError'
    this.code = code
  }
}

const MIME_EXTENSION_MAP: Record<PaymentProofAllowedMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
}

function normalizeMimeType(value: string): string {
  return value.trim().toLowerCase()
}

function sanitizePublicCode(value: string): string {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '')
  return normalized.length > 0 ? normalized : 'UNKNOWN'
}

function resolveBlobToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim()
  if (!token) {
    throw new Error('Missing BLOB_READ_WRITE_TOKEN for payment proof upload.')
  }
  return token
}

function normalizeReportedReference(
  value: string | null | undefined,
): string | null {
  const normalized = (value ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  return normalized.length > 0 ? normalized : null
}

function formatPathTimestamp(value: Date): string {
  const year = value.getUTCFullYear()
  const month = String(value.getUTCMonth() + 1).padStart(2, '0')
  const day = String(value.getUTCDate()).padStart(2, '0')
  const hour = String(value.getUTCHours()).padStart(2, '0')
  const minute = String(value.getUTCMinutes()).padStart(2, '0')
  const second = String(value.getUTCSeconds()).padStart(2, '0')
  const millisecond = String(value.getUTCMilliseconds()).padStart(3, '0')
  return `${year}${month}${day}T${hour}${minute}${second}${millisecond}Z`
}

function computeSha256FromBuffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

function buildPaymentProofPathname(input: {
  bookingPublicCode: string
  uploadedAt: Date
  sha256: string
  mimeType: PaymentProofAllowedMimeType
}): string {
  const safeCode = sanitizePublicCode(input.bookingPublicCode)
  const timestamp = formatPathTimestamp(input.uploadedAt)
  const shortHash = input.sha256.slice(0, 12)
  const uniqueSuffix = randomUUID().replace(/-/g, '').slice(0, 8)
  const extension = MIME_EXTENSION_MAP[input.mimeType]
  return `payment-proofs/${safeCode}/${timestamp}-${shortHash}-${uniqueSuffix}.${extension}`
}

async function detectPaymentProofDuplicateStatus(input: {
  bookingId: string
  sha256: string
}): Promise<PaymentProofDuplicateStatus> {
  const matches = await prisma.paymentProof.findMany({
    where: {
      sha256: input.sha256,
      isActive: true,
    },
    select: {
      bookingRequestId: true,
    },
    take: 20,
  })

  if (matches.length === 0) {
    return 'none'
  }

  const hasOtherBookingMatch = matches.some(
    (proof) => proof.bookingRequestId !== input.bookingId,
  )
  if (hasOtherBookingMatch) {
    return 'other_booking'
  }

  return 'same_booking'
}

async function validatePaymentProofFile(file: File): Promise<{
  mimeType: PaymentProofAllowedMimeType
  buffer: Buffer
  sizeBytes: number
  originalFilename: string | null
}> {
  if (!(file instanceof File)) {
    throw new PaymentProofValidationError(
      'missing_file',
      'Sube tu comprobante en JPG, PNG, WEBP o AVIF.',
    )
  }

  const mimeType = normalizeMimeType(file.type)
  if (!PAYMENT_PROOF_ALLOWED_MIME_TYPES.includes(mimeType as PaymentProofAllowedMimeType)) {
    throw new PaymentProofValidationError(
      'invalid_mime_type',
      'Formato no soportado. Sube una imagen JPG, PNG, WEBP o AVIF.',
    )
  }

  if (file.size <= 0) {
    throw new PaymentProofValidationError('file_empty', 'El comprobante no puede estar vacio.')
  }

  if (file.size > PAYMENT_PROOF_MAX_SIZE_BYTES) {
    throw new PaymentProofValidationError(
      'file_too_large',
      'El comprobante supera el maximo permitido de 4.5 MB.',
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  return {
    mimeType: mimeType as PaymentProofAllowedMimeType,
    buffer,
    sizeBytes: buffer.byteLength,
    originalFilename: file.name?.trim() || null,
  }
}

export async function uploadPaymentProofToBlob(
  input: UploadPaymentProofInput,
): Promise<UploadedPaymentProofMetadata> {
  const validatedFile = await validatePaymentProofFile(input.file)
  const uploadedAt = input.uploadedAt ?? new Date()
  const sha256 = computeSha256FromBuffer(validatedFile.buffer)
  const blobPathname = buildPaymentProofPathname({
    bookingPublicCode: input.bookingPublicCode,
    uploadedAt,
    sha256,
    mimeType: validatedFile.mimeType,
  })

  await put(blobPathname, validatedFile.buffer, {
    access: 'private',
    contentType: validatedFile.mimeType,
    addRandomSuffix: false,
    token: resolveBlobToken(),
  })

  const duplicateStatus = await detectPaymentProofDuplicateStatus({
    bookingId: input.bookingId,
    sha256,
  })

  return {
    blobPathname,
    sha256,
    mimeType: validatedFile.mimeType,
    sizeBytes: validatedFile.sizeBytes,
    originalFilename: validatedFile.originalFilename,
    uploadedAt,
    reportedReference: input.reportedReference?.trim() || null,
    normalizedReference: normalizeReportedReference(input.reportedReference),
    duplicateStatus,
  }
}
