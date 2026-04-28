import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { put } from '@vercel/blob'

export const TS_WEB_BLOB_READ_WRITE_TOKEN_ENV = 'TS_WEB_BLOB_READ_WRITE_TOKEN'

type StorePublicNoBookingMediaInput = {
  file: File
  directory: string
}

type StoredPublicNoBookingMedia = {
  url: string
  mimeType: string
  size: number
}

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

export async function storePublicNoBookingMedia({
  file,
  directory,
}: StorePublicNoBookingMediaInput): Promise<StoredPublicNoBookingMedia> {
  const token = process.env.TS_WEB_BLOB_READ_WRITE_TOKEN
  const extension = MIME_EXTENSION[file.type] ?? 'bin'
  const now = new Date()
  const year = String(now.getUTCFullYear())
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const safeDirectory = sanitizeDirectory(directory)
  const relativeDir = path.posix.join('public-media', safeDirectory, year, month)
  const filename = `${Date.now()}-${randomUUID()}.${extension}`
  const objectPath = path.posix.join(relativeDir, filename)
  const buffer = Buffer.from(await file.arrayBuffer())

  if (token) {
    const blob = await put(objectPath, buffer, {
      access: 'public',
      contentType: file.type,
      token,
    })

    return {
      url: blob.url,
      mimeType: file.type,
      size: buffer.length,
    }
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `Storage publico no-booking no configurado: falta ${TS_WEB_BLOB_READ_WRITE_TOKEN_ENV}`,
    )
  }

  const absoluteDir = path.join(process.cwd(), 'public', ...relativeDir.split('/'))
  const absolutePath = path.join(absoluteDir, filename)
  const publicUrl = `/${objectPath}`

  await mkdir(absoluteDir, { recursive: true })
  await writeFile(absolutePath, buffer)

  return {
    url: publicUrl,
    mimeType: file.type,
    size: buffer.length,
  }
}
