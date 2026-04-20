import 'server-only'

import { createHash, randomUUID } from 'node:crypto'
import { put } from '@vercel/blob'
import { prisma } from '@/lib/db'

export const PAYMENT_PROOF_ALLOWED_MIME_TYPE = 'image/jpeg' as const
export const PAYMENT_PROOF_MAX_SIZE_BYTES = Math.floor(4.5 * 1024 * 1024)

export type PaymentProofDuplicateStatus = 'none' | 'same_booking' | 'other_booking'

export interface PaymentProofValidationResult {
  mimeType: typeof PAYMENT_PROOF_ALLOWED_MIME_TYPE
  sizeBytes: number
  originalFilename: string | null
  buffer: Buffer
}

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
  mimeType: typeof PAYMENT_PROOF_ALLOWED_MIME_TYPE
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

export function normalizeReportedReference(
  value: string | null | undefined,
): string | null {
  const normalized = (value ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  return normalized.length > 0 ? normalized : null
}

export async function validatePaymentProofFile(
  file: File | null | undefined,
): Promise<PaymentProofValidationResult> {
  if (!(file instanceof File)) {
    throw new PaymentProofValidationError('missing_file', 'Debes adjuntar un comprobante en formato JPG.')
  }

  const mimeType = normalizeMimeType(file.type)
  if (mimeType !== PAYMENT_PROOF_ALLOWED_MIME_TYPE) {
    throw new PaymentProofValidationError('invalid_mime_type', 'El comprobante debe estar en formato image/jpeg.')
  }

  if (file.size <= 0) {
    throw new PaymentProofValidationError('file_empty', 'El comprobante no puede estar vacio.')
  }

  if (file.size > PAYMENT_PROOF_MAX_SIZE_BYTES) {
    throw new PaymentProofValidationError('file_too_large', 'El comprobante supera el maximo permitido de 4.5 MB.')
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  return {
    mimeType: PAYMENT_PROOF_ALLOWED_MIME_TYPE,
    sizeBytes: buffer.byteLength,
    originalFilename: file.name?.trim() || null,
    buffer,
  }
}

export function computeSha256FromBuffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

export function buildPaymentProofPathname(input: {
  bookingPublicCode: string
  uploadedAt: Date
  sha256: string
}): string {
  const safeCode = sanitizePublicCode(input.bookingPublicCode)
  const timestamp = formatPathTimestamp(input.uploadedAt)
  const shortHash = input.sha256.slice(0, 12)
  const uniqueSuffix = randomUUID().replace(/-/g, '').slice(0, 8)
  return `payment-proofs/${safeCode}/${timestamp}-${shortHash}-${uniqueSuffix}.jpg`
}

export async function detectPaymentProofDuplicateStatus(input: {
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
  })

  await put(blobPathname, validatedFile.buffer, {
    access: 'private',
    contentType: PAYMENT_PROOF_ALLOWED_MIME_TYPE,
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
    mimeType: PAYMENT_PROOF_ALLOWED_MIME_TYPE,
    sizeBytes: validatedFile.sizeBytes,
    originalFilename: validatedFile.originalFilename,
    uploadedAt,
    reportedReference: input.reportedReference?.trim() || null,
    normalizedReference: normalizeReportedReference(input.reportedReference),
    duplicateStatus,
  }
}
