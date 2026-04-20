import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

export const MARKETPLACE_UPLOAD_PURPOSES = [
  'listing-image',
  'payment-proof',
  'avatar',
] as const

export type MarketplaceUploadPurpose = (typeof MARKETPLACE_UPLOAD_PURPOSES)[number]

type UploadRule = {
  directory: string
  maxBytes: number
  allowedMimeTypes: readonly string[]
}

export const MARKETPLACE_UPLOAD_RULES: Record<MarketplaceUploadPurpose, UploadRule> = {
  'listing-image': {
    directory: 'listings',
    maxBytes: 8 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  'payment-proof': {
    directory: 'payment-proofs',
    maxBytes: 10 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  avatar: {
    directory: 'avatars',
    maxBytes: 4 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
}

const MIME_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export function isMarketplaceUploadPurpose(value: string): value is MarketplaceUploadPurpose {
  return MARKETPLACE_UPLOAD_PURPOSES.includes(value as MarketplaceUploadPurpose)
}

export function validateMarketplaceFile(
  file: File,
  purpose: MarketplaceUploadPurpose,
): { ok: true } | { ok: false; message: string } {
  const rule = MARKETPLACE_UPLOAD_RULES[purpose]

  if (!(file instanceof File)) {
    return { ok: false, message: 'Archivo invalido' }
  }

  if (!rule.allowedMimeTypes.includes(file.type)) {
    return { ok: false, message: 'Tipo de archivo no permitido' }
  }

  if (file.size <= 0) {
    return { ok: false, message: 'El archivo esta vacio' }
  }

  if (file.size > rule.maxBytes) {
    return {
      ok: false,
      message: `El archivo supera el limite de ${(rule.maxBytes / (1024 * 1024)).toFixed(0)}MB`,
    }
  }

  return { ok: true }
}

export async function storeMarketplaceFile(
  file: File,
  purpose: MarketplaceUploadPurpose,
): Promise<{
  url: string
  mimeType: string
  size: number
}> {
  const validation = validateMarketplaceFile(file, purpose)
  if (!validation.ok) {
    throw new Error(validation.message)
  }

  const rule = MARKETPLACE_UPLOAD_RULES[purpose]
  const extension = MIME_EXTENSION[file.type] ?? 'bin'
  const now = new Date()
  const year = String(now.getUTCFullYear())
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const relativeDir = path.posix.join('uploads', 'marketplace', rule.directory, year, month)
  const absoluteDir = path.join(process.cwd(), 'public', ...relativeDir.split('/'))
  const filename = `${Date.now()}-${randomUUID()}.${extension}`
  const absolutePath = path.join(absoluteDir, filename)
  const publicUrl = `/${path.posix.join(relativeDir, filename)}`
  const buffer = Buffer.from(await file.arrayBuffer())

  await mkdir(absoluteDir, { recursive: true })
  await writeFile(absolutePath, buffer)

  return {
    url: publicUrl,
    mimeType: file.type,
    size: buffer.length,
  }
}
