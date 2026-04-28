import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { get, put } from '@vercel/blob'

export const TS_MARKETPLACE_SENSITIVE_BLOB_READ_WRITE_TOKEN_ENV =
  'TS_MARKETPLACE_SENSITIVE_BLOB_READ_WRITE_TOKEN'

type StoreSensitiveMarketplaceMediaInput = {
  file: File
  directory: string
}

type StoredSensitiveMarketplaceMedia = {
  storagePath: string
  url: string
  mimeType: string
  size: number
}

type ReadSensitiveMarketplaceMediaResult = {
  body: Uint8Array | ReadableStream<Uint8Array>
  mimeType: string
  size: number
}

const SENSITIVE_PROXY_PREFIX = '/api/marketplace/payment-proofs'
const LOCAL_SENSITIVE_STORAGE_DIR = '.tmp-marketplace-sensitive-media'

const MIME_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

function sanitizeDirectory(directory: string) {
  return directory
    .split('/')
    .map((part) => part.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'))
    .filter(Boolean)
    .join('/')
}

function buildProxyUrl(storagePath: string) {
  return `${SENSITIVE_PROXY_PREFIX}/${storagePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')}`
}

function resolveLocalAbsolutePath(storagePath: string) {
  return path.join(process.cwd(), LOCAL_SENSITIVE_STORAGE_DIR, ...storagePath.split('/'))
}

function inferMimeTypeFromStoragePath(storagePath: string) {
  const extension = path.extname(storagePath).toLowerCase()

  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg'
  if (extension === '.png') return 'image/png'
  if (extension === '.webp') return 'image/webp'

  return 'application/octet-stream'
}

export async function storeSensitiveMarketplaceMedia({
  file,
  directory,
}: StoreSensitiveMarketplaceMediaInput): Promise<StoredSensitiveMarketplaceMedia> {
  const token = process.env.TS_MARKETPLACE_SENSITIVE_BLOB_READ_WRITE_TOKEN
  const extension = MIME_EXTENSION[file.type] ?? 'bin'
  const now = new Date()
  const year = String(now.getUTCFullYear())
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const safeDirectory = sanitizeDirectory(directory)
  const relativeDir = path.posix.join('marketplace-sensitive-media', safeDirectory, year, month)
  const filename = `${Date.now()}-${randomUUID()}.${extension}`
  const storagePath = path.posix.join(relativeDir, filename)
  const buffer = Buffer.from(await file.arrayBuffer())

  if (token) {
    await put(storagePath, buffer, {
      access: 'private',
      contentType: file.type,
      token,
    })
  } else {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `Storage sensible de marketplace no configurado: falta ${TS_MARKETPLACE_SENSITIVE_BLOB_READ_WRITE_TOKEN_ENV}`,
      )
    }

    const absolutePath = resolveLocalAbsolutePath(storagePath)
    await mkdir(path.dirname(absolutePath), { recursive: true })
    await writeFile(absolutePath, buffer)
  }

  return {
    storagePath,
    url: buildProxyUrl(storagePath),
    mimeType: file.type,
    size: buffer.length,
  }
}

export async function readSensitiveMarketplaceMedia(
  storagePath: string,
): Promise<ReadSensitiveMarketplaceMediaResult> {
  const token = process.env.TS_MARKETPLACE_SENSITIVE_BLOB_READ_WRITE_TOKEN

  if (token) {
    const blob = await get(storagePath, {
      access: 'private',
      token,
      useCache: false,
    })

    if (!blob || blob.statusCode !== 200 || !blob.stream) {
      throw new Error('Comprobante no encontrado en storage sensible')
    }

    return {
      body: blob.stream,
      mimeType: blob.blob.contentType,
      size: blob.blob.size,
    }
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `Storage sensible de marketplace no configurado: falta ${TS_MARKETPLACE_SENSITIVE_BLOB_READ_WRITE_TOKEN_ENV}`,
    )
  }

  const absolutePath = resolveLocalAbsolutePath(storagePath)
  const buffer = await readFile(absolutePath)

  return {
    body: new Uint8Array(buffer),
    mimeType: inferMimeTypeFromStoragePath(storagePath),
    size: buffer.length,
  }
}

export function buildSensitiveMarketplaceProofUrl(storagePath: string) {
  return buildProxyUrl(storagePath)
}
