import { createHash } from 'node:crypto'

import {
  CUSTOM_BUNDLE_PAYMENT_PROOF_ALLOWED_MIME_TYPES,
  CUSTOM_BUNDLE_PAYMENT_PROOF_MAX_SIZE_BYTES,
  type CustomBundlePaymentProofAllowedMimeType,
  type CustomBundleTrustedPaymentProofMetadata,
} from '@/lib/bookings/custom-bundle-payment-contract'

export type {
  CustomBundleTrustedPaymentProofMetadata,
} from '@/lib/bookings/custom-bundle-payment-contract'

export const CUSTOM_BUNDLE_PAYMENT_PROOF_BOUNDARY_VERSION =
  'custom_bundle_payment_proof_boundary_v1' as const

export const CUSTOM_BUNDLE_PAYMENT_PROOF_PATH_PREFIX = 'payment-proofs' as const

const CUSTOM_BUNDLE_PAYMENT_PROOF_MAX_PATHNAME_LENGTH = 500

const MIME_EXTENSION_MAP: Record<CustomBundlePaymentProofAllowedMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
}

export interface CustomBundlePaymentProofFileLike {
  name: string
  type: string
  size: number
  arrayBuffer(): Promise<ArrayBuffer>
}

export interface CustomBundlePrivateBlobObject {
  pathname: string
  contentType: string
  sizeBytes: number
  uploadedAt: Date
  access: 'private'
}

export interface CustomBundlePrivateBlobStore {
  headPrivate(pathname: string): Promise<CustomBundlePrivateBlobObject | null>
  putPrivate(input: {
    pathname: string
    body: Uint8Array
    contentType: CustomBundlePaymentProofAllowedMimeType
    access: 'private'
    addRandomSuffix: false
  }): Promise<CustomBundlePrivateBlobObject>
  deletePrivate(pathname: string): Promise<void>
}

export interface CustomBundlePaymentProofBoundaryContext {
  publicCode: string
  paymentReportIdempotencyKey: string
  now: Date
}

export interface CustomBundlePaymentProofBoundaryIssue {
  code:
    | 'INVALID_FILE'
    | 'INVALID_FILENAME'
    | 'FILE_EMPTY'
    | 'FILE_TOO_LARGE'
    | 'FILE_SIZE_MISMATCH'
    | 'INVALID_DECLARED_MIME_TYPE'
    | 'UNSUPPORTED_BINARY_SIGNATURE'
    | 'MIME_SIGNATURE_MISMATCH'
    | 'FILE_READ_FAILED'
    | 'INVALID_PUBLIC_CODE'
    | 'INVALID_PAYMENT_REPORT_IDEMPOTENCY_KEY'
    | 'INVALID_NOW'
  message: string
  path?: Array<string | number>
}

export interface CustomBundlePaymentProofPreparation {
  publicCode: string
  paymentReportIdempotencyKey: string
  keyHash16: string
  pathname: string
  bytes: Uint8Array
  sha256: string
  mimeType: CustomBundlePaymentProofAllowedMimeType
  sizeBytes: number
  originalFilename: string | null
}

export type PrepareCustomBundlePaymentProofUploadResult =
  | {
      ok: true
      value: CustomBundlePaymentProofPreparation
    }
  | {
      ok: false
      issues: CustomBundlePaymentProofBoundaryIssue[]
    }

export type UploadCustomBundlePaymentProofToPrivateStoreResult =
  | {
      ok: true
      stage: 'uploaded'
      createdByThisCall: true
      metadata: CustomBundleTrustedPaymentProofMetadata
      privateObject: CustomBundlePrivateBlobObject
    }
  | {
      ok: true
      stage: 'reused'
      createdByThisCall: false
      metadata: CustomBundleTrustedPaymentProofMetadata
      privateObject: CustomBundlePrivateBlobObject
    }
  | {
      ok: false
      stage: 'boundary'
      issues: CustomBundlePaymentProofBoundaryIssue[]
    }
  | {
      ok: false
      stage: 'store'
      code:
        | 'BLOB_IDEMPOTENCY_CONFLICT'
        | 'BLOB_UPLOAD_FAILED'
        | 'BLOB_RESPONSE_INVALID'
      message: string
    }

export type DeleteCustomBundlePaymentProofFromPrivateStoreResult =
  | {
      ok: true
    }
  | {
      ok: false
      code: 'BLOB_CLEANUP_FAILED'
      message: string
    }

function makeIssue(
  code: CustomBundlePaymentProofBoundaryIssue['code'],
  message: string,
  path?: Array<string | number>,
): CustomBundlePaymentProofBoundaryIssue {
  return path ? { code, message, path } : { code, message }
}

function isValidDate(value: Date): boolean {
  return value instanceof Date && Number.isFinite(value.getTime())
}

function isValidPublicCode(value: string): boolean {
  return /^TUR-\d{4}-\d{3,}$/.test(value)
}

function isValidPaymentReportIdempotencyKey(value: string): boolean {
  return /^[A-Za-z0-9:_-]{16,128}$/.test(value)
}

function isAllowedMimeType(value: string): value is CustomBundlePaymentProofAllowedMimeType {
  return (CUSTOM_BUNDLE_PAYMENT_PROOF_ALLOWED_MIME_TYPES as readonly string[]).includes(value)
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function normalizeDeclaredMimeType(value: string): CustomBundlePaymentProofAllowedMimeType | null {
  const normalized = value.trim().toLowerCase()
  return isAllowedMimeType(normalized) ? normalized : null
}

function isControlCharacter(codePoint: number): boolean {
  return codePoint < 0x20 || codePoint === 0x7f
}

function validateFilename(name: unknown): { value: string | null; issues: CustomBundlePaymentProofBoundaryIssue[] } {
  const issues: CustomBundlePaymentProofBoundaryIssue[] = []
  if (typeof name !== 'string') {
    return {
      value: null,
      issues: [makeIssue('INVALID_FILENAME', 'El nombre original del archivo no es valido.')],
    }
  }

  const trimmed = name.trim()
  if (trimmed.length === 0) {
    return {
      value: null,
      issues: [makeIssue('INVALID_FILENAME', 'El nombre original del archivo no es valido.')],
    }
  }

  if (trimmed.length > 255) {
    issues.push(makeIssue('INVALID_FILENAME', 'El nombre original del archivo no es valido.'))
  }

  for (const character of trimmed) {
    const codePoint = character.codePointAt(0) ?? 0
    if (
      character === '/' ||
      character === '\\' ||
      character === '\0' ||
      character === '\n' ||
      character === '\r' ||
      isControlCharacter(codePoint)
    ) {
      issues.push(makeIssue('INVALID_FILENAME', 'El nombre original del archivo no es valido.'))
      break
    }
  }

  return {
    value: issues.length > 0 ? null : trimmed,
    issues,
  }
}

function detectBinaryMimeType(bytes: Uint8Array): CustomBundlePaymentProofAllowedMimeType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png'
  }

  if (
    bytes.length >= 12 &&
    String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) === 'RIFF' &&
    String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]) === 'WEBP'
  ) {
    return 'image/webp'
  }

  if (bytes.length >= 16) {
    const boxType = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7])
    if (boxType === 'ftyp') {
      const brands: string[] = []
      const scanLimit = Math.min(bytes.length, 32)
      for (let offset = 8; offset + 3 < scanLimit; offset += 4) {
        brands.push(String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]))
      }

      if (brands.some((brand) => brand === 'avif' || brand === 'avis')) {
        return 'image/avif'
      }
    }
  }

  return null
}

function validateContext(
  context: CustomBundlePaymentProofBoundaryContext,
): CustomBundlePaymentProofBoundaryIssue[] {
  const issues: CustomBundlePaymentProofBoundaryIssue[] = []

  const publicCode = typeof context.publicCode === 'string' ? context.publicCode.trim().toUpperCase() : ''
  if (!isValidPublicCode(publicCode)) {
    issues.push(
      makeIssue('INVALID_PUBLIC_CODE', 'publicCode debe cumplir el formato TUR-YYYY-NNN.', [
        'publicCode',
      ]),
    )
  }

  const idempotencyKey =
    typeof context.paymentReportIdempotencyKey === 'string'
      ? context.paymentReportIdempotencyKey.trim()
      : ''
  if (
    idempotencyKey.length < 16 ||
    idempotencyKey.length > 128 ||
    idempotencyKey !== context.paymentReportIdempotencyKey ||
    !isValidPaymentReportIdempotencyKey(idempotencyKey)
  ) {
    issues.push(
      makeIssue(
        'INVALID_PAYMENT_REPORT_IDEMPOTENCY_KEY',
        'La clave de idempotencia del reporte no es valida.',
        ['paymentReportIdempotencyKey'],
      ),
    )
  }

  if (!isValidDate(context.now)) {
    issues.push(makeIssue('INVALID_NOW', 'El timestamp del servidor no es valido.', ['now']))
  }

  return issues
}

function buildPreparationValue(input: {
  context: CustomBundlePaymentProofBoundaryContext
  bytes: Uint8Array
  sha256: string
  mimeType: CustomBundlePaymentProofAllowedMimeType
  originalFilename: string | null
}): CustomBundlePaymentProofPreparation {
  const publicCode = input.context.publicCode.trim().toUpperCase()
  const paymentReportIdempotencyKey = input.context.paymentReportIdempotencyKey.trim()
  const keyHash16 = sha256Hex(paymentReportIdempotencyKey).slice(0, 16)
  const pathname = buildCustomBundlePaymentProofPrivatePathname({
    publicCode,
    paymentReportIdempotencyKey,
    sha256: input.sha256,
    mimeType: input.mimeType,
  })

  return {
    publicCode,
    paymentReportIdempotencyKey,
    keyHash16,
    pathname,
    bytes: input.bytes,
    sha256: input.sha256,
    mimeType: input.mimeType,
    sizeBytes: input.bytes.byteLength,
    originalFilename: input.originalFilename,
  }
}

function validatePreparedPathname(pathname: string): boolean {
  if (!pathname.startsWith(`${CUSTOM_BUNDLE_PAYMENT_PROOF_PATH_PREFIX}/`)) {
    return false
  }

  if (
    pathname.includes('..') ||
    pathname.includes('\\') ||
    pathname.includes('?') ||
    pathname.includes('#') ||
    pathname.includes('\0')
  ) {
    return false
  }

  return pathname.length > 0 && pathname.length <= CUSTOM_BUNDLE_PAYMENT_PROOF_MAX_PATHNAME_LENGTH
}

function isObjectAlreadyExistsError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false
  }

  const code = 'code' in error && typeof (error as { code?: unknown }).code === 'string'
    ? ((error as { code: string }).code).toLowerCase()
    : ''
  const message = 'message' in error && typeof (error as { message?: unknown }).message === 'string'
    ? ((error as { message: string }).message).toLowerCase()
    : ''

  return (
    code.includes('already_exists') ||
    code === 'conflict' ||
    code === '409' ||
    code.includes('exists') ||
    message.includes('already exists') ||
    message.includes('exists')
  )
}

function objectToMetadata(
  object: CustomBundlePrivateBlobObject,
  originalFilename: string | null,
): CustomBundleTrustedPaymentProofMetadata {
  return {
    blobPathname: object.pathname,
    sha256: object.pathname.match(/-([a-f0-9]{64})\.[^.]+$/i)?.[1]?.toLowerCase() ?? '',
    mimeType: object.contentType as CustomBundlePaymentProofAllowedMimeType,
    sizeBytes: object.sizeBytes,
    originalFilename,
    uploadedAt: new Date(object.uploadedAt.getTime()),
  }
}

function validateStoredObject(
  object: CustomBundlePrivateBlobObject,
  prepared: CustomBundlePaymentProofPreparation,
  now: Date,
): { ok: true } | { ok: false; code: 'BLOB_RESPONSE_INVALID' | 'BLOB_IDEMPOTENCY_CONFLICT' } {
  if (!validatePreparedPathname(object.pathname) || object.access !== 'private' || !isValidDate(object.uploadedAt)) {
    return { ok: false, code: 'BLOB_RESPONSE_INVALID' }
  }

  if (object.pathname !== prepared.pathname) {
    return { ok: false, code: 'BLOB_IDEMPOTENCY_CONFLICT' }
  }

  if (object.contentType !== prepared.mimeType || object.sizeBytes !== prepared.sizeBytes) {
    return { ok: false, code: 'BLOB_IDEMPOTENCY_CONFLICT' }
  }

  if (object.uploadedAt.getTime() > now.getTime()) {
    return { ok: false, code: 'BLOB_RESPONSE_INVALID' }
  }

  return { ok: true }
}

export function buildCustomBundlePaymentProofPrivatePathname(input: {
  publicCode: string
  paymentReportIdempotencyKey: string
  sha256: string
  mimeType: CustomBundlePaymentProofAllowedMimeType
}): string {
  const publicCode = input.publicCode.trim().toUpperCase()
  if (!isValidPublicCode(publicCode)) {
    throw new Error('publicCode no es valido para construir el pathname privado.')
  }

  const paymentReportIdempotencyKey = input.paymentReportIdempotencyKey.trim()
  if (!isValidPaymentReportIdempotencyKey(paymentReportIdempotencyKey)) {
    throw new Error('paymentReportIdempotencyKey no es valido para construir el pathname privado.')
  }

  if (!/^[a-f0-9]{64}$/.test(input.sha256)) {
    throw new Error('sha256 no es valido para construir el pathname privado.')
  }

  const keyHash16 = sha256Hex(paymentReportIdempotencyKey).slice(0, 16)
  const extension = MIME_EXTENSION_MAP[input.mimeType]
  const pathname = `${CUSTOM_BUNDLE_PAYMENT_PROOF_PATH_PREFIX}/${publicCode}/${keyHash16}-${input.sha256}.${extension}`

  if (pathname.length > CUSTOM_BUNDLE_PAYMENT_PROOF_MAX_PATHNAME_LENGTH) {
    throw new Error('El pathname privado excede la longitud maxima permitida.')
  }

  return pathname
}

export async function prepareCustomBundlePaymentProofUpload(input: {
  file: CustomBundlePaymentProofFileLike
  context: CustomBundlePaymentProofBoundaryContext
}): Promise<PrepareCustomBundlePaymentProofUploadResult> {
  const issues = validateContext(input.context)
  if (issues.length > 0) {
    return { ok: false, issues }
  }

  if (typeof input.file !== 'object' || input.file === null) {
    return {
      ok: false,
      issues: [makeIssue('INVALID_FILE', 'El comprobante no es valido.')],
    }
  }

  const fileIssues: CustomBundlePaymentProofBoundaryIssue[] = []
  const declaredSize = Number(input.file.size)
  if (!Number.isInteger(declaredSize) || declaredSize < 0) {
    fileIssues.push(makeIssue('INVALID_FILE', 'El comprobante no es valido.', ['size']))
  } else if (declaredSize === 0) {
    fileIssues.push(makeIssue('FILE_EMPTY', 'El comprobante no puede estar vacio.', ['size']))
  } else if (declaredSize > CUSTOM_BUNDLE_PAYMENT_PROOF_MAX_SIZE_BYTES) {
    fileIssues.push(
      makeIssue('FILE_TOO_LARGE', 'El comprobante supera el maximo permitido de 3.9 MB.', [
        'size',
      ]),
    )
  }

  if (fileIssues.length > 0) {
    return { ok: false, issues: fileIssues }
  }

  let arrayBuffer: ArrayBuffer
  try {
    arrayBuffer = await input.file.arrayBuffer()
  } catch {
    return {
      ok: false,
      issues: [makeIssue('FILE_READ_FAILED', 'No se pudo leer el comprobante.', ['arrayBuffer'])],
    }
  }

  const bytes = new Uint8Array(arrayBuffer)
  const bodyLength = bytes.byteLength
  if (bodyLength <= 0) {
    return { ok: false, issues: [makeIssue('FILE_EMPTY', 'El comprobante no puede estar vacio.')] }
  }

  if (bodyLength > CUSTOM_BUNDLE_PAYMENT_PROOF_MAX_SIZE_BYTES) {
    return {
      ok: false,
      issues: [
      makeIssue('FILE_TOO_LARGE', 'El comprobante supera el maximo permitido de 3.9 MB.'),
      ],
    }
  }

  if (bodyLength !== declaredSize) {
    return {
      ok: false,
      issues: [makeIssue('FILE_SIZE_MISMATCH', 'El tamano del archivo no coincide con el contenido.')],
    }
  }

  const filename = validateFilename((input.file as CustomBundlePaymentProofFileLike).name)
  if (filename.issues.length > 0) {
    return { ok: false, issues: filename.issues }
  }

  const declaredMimeType = normalizeDeclaredMimeType((input.file as CustomBundlePaymentProofFileLike).type)
  if (!declaredMimeType) {
    return {
      ok: false,
      issues: [
        makeIssue(
          'INVALID_DECLARED_MIME_TYPE',
          'El tipo MIME declarado no es valido.',
          ['type'],
        ),
      ],
    }
  }

  const detectedMimeType = detectBinaryMimeType(bytes)
  if (!detectedMimeType) {
    return {
      ok: false,
      issues: [
        makeIssue(
          'UNSUPPORTED_BINARY_SIGNATURE',
          'La firma binaria del comprobante no es compatible.',
        ),
      ],
    }
  }

  if (detectedMimeType !== declaredMimeType) {
    return {
      ok: false,
      issues: [
        makeIssue(
          'MIME_SIGNATURE_MISMATCH',
          'El MIME declarado no coincide con la firma binaria del comprobante.',
        ),
      ],
    }
  }

  const sha256 = createHash('sha256').update(bytes).digest('hex')

  return {
    ok: true,
    value: buildPreparationValue({
      context: input.context,
      bytes,
      sha256,
      mimeType: declaredMimeType,
      originalFilename: filename.value,
    }),
  }
}

export async function uploadCustomBundlePaymentProofToPrivateStore(input: {
  store: CustomBundlePrivateBlobStore
  file: CustomBundlePaymentProofFileLike
  context: CustomBundlePaymentProofBoundaryContext
}): Promise<UploadCustomBundlePaymentProofToPrivateStoreResult> {
  const prepared = await prepareCustomBundlePaymentProofUpload({
    file: input.file,
    context: input.context,
  })

  if (!prepared.ok) {
    return {
      ok: false,
      stage: 'boundary',
      issues: prepared.issues,
    }
  }

  const { value } = prepared
  const expectedPathname = value.pathname
  if (!validatePreparedPathname(expectedPathname)) {
    return {
      ok: false,
      stage: 'store',
      code: 'BLOB_RESPONSE_INVALID',
      message: 'El pathname privado calculado no es valido.',
    }
  }

  let existing: CustomBundlePrivateBlobObject | null
  try {
    existing = await input.store.headPrivate(expectedPathname)
  } catch {
    return {
      ok: false,
      stage: 'store',
      code: 'BLOB_UPLOAD_FAILED',
      message: 'No se pudo leer el comprobante privado existente.',
    }
  }

  if (existing) {
    const validation = validateStoredObject(existing, value, input.context.now)
    if (!validation.ok) {
      return {
        ok: false,
        stage: 'store',
        code: validation.code,
        message: 'El almacén devolvio un objeto privado incoherente.',
      }
    }

    return {
      ok: true,
      stage: 'reused',
      createdByThisCall: false,
      metadata: objectToMetadata(existing, value.originalFilename),
      privateObject: existing,
    }
  }

  try {
    const created = await input.store.putPrivate({
      pathname: expectedPathname,
      body: value.bytes,
      contentType: value.mimeType,
      access: 'private',
      addRandomSuffix: false,
    })

    const validation = validateStoredObject(created, value, input.context.now)
    if (!validation.ok) {
      await input.store.deletePrivate(expectedPathname).catch(() => {})
      return {
        ok: false,
        stage: 'store',
        code: validation.code,
        message: 'El almacén devolvio un objeto privado incoherente.',
      }
    }

    return {
      ok: true,
      stage: 'uploaded',
      createdByThisCall: true,
      metadata: objectToMetadata(created, value.originalFilename),
      privateObject: created,
    }
  } catch (error) {
    if (isObjectAlreadyExistsError(error)) {
      let after: CustomBundlePrivateBlobObject | null
      try {
        after = await input.store.headPrivate(expectedPathname)
      } catch {
        return {
          ok: false,
          stage: 'store',
          code: 'BLOB_UPLOAD_FAILED',
          message: 'No se pudo verificar el comprobante privado existente.',
        }
      }

      if (after) {
        const validation = validateStoredObject(after, value, input.context.now)
        if (validation.ok) {
          return {
            ok: true,
            stage: 'reused',
            createdByThisCall: false,
            metadata: objectToMetadata(after, value.originalFilename),
            privateObject: after,
          }
        }
      }

      return {
        ok: false,
        stage: 'store',
        code: 'BLOB_IDEMPOTENCY_CONFLICT',
        message: 'El comprobante privado ya existe con contenido distinto.',
      }
    }

    return {
      ok: false,
      stage: 'store',
      code: 'BLOB_UPLOAD_FAILED',
      message: 'No se pudo guardar el comprobante privado.',
    }
  }
}

function isSafePrivatePathname(pathname: string): boolean {
  return (
    typeof pathname === 'string' &&
    pathname.startsWith(`${CUSTOM_BUNDLE_PAYMENT_PROOF_PATH_PREFIX}/`) &&
    pathname.length <= CUSTOM_BUNDLE_PAYMENT_PROOF_MAX_PATHNAME_LENGTH &&
    !pathname.includes('..') &&
    !pathname.includes('\\') &&
    !pathname.includes('?') &&
    !pathname.includes('#') &&
    !pathname.includes('\0')
  )
}

export async function deleteCustomBundlePaymentProofFromPrivateStore(input: {
  store: CustomBundlePrivateBlobStore
  pathname: string
}): Promise<DeleteCustomBundlePaymentProofFromPrivateStoreResult> {
  if (!isSafePrivatePathname(input.pathname)) {
    return {
      ok: false,
      code: 'BLOB_CLEANUP_FAILED',
      message: 'El pathname privado a limpiar no es valido.',
    }
  }

  try {
    await input.store.deletePrivate(input.pathname)
    return { ok: true }
  } catch {
    return {
      ok: false,
      code: 'BLOB_CLEANUP_FAILED',
      message: 'No se pudo limpiar el comprobante privado.',
    }
  }
}
