'use client'

import type { MarketplaceUploadPurpose } from '@/lib/marketplace/media'

export type PreparedMarketplaceUpload = {
  file: File
  previewUrl: string
}

type UploadTransformOptions = {
  maxDimension: number
  quality: number
  outputType: 'image/webp' | 'image/jpeg'
}

const CLIENT_MAX_BYTES: Record<MarketplaceUploadPurpose, number> = {
  'listing-image': 24 * 1024 * 1024,
  'payment-proof': 10 * 1024 * 1024,
  avatar: 4 * 1024 * 1024,
}

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])

const PURPOSE_TRANSFORMS: Record<MarketplaceUploadPurpose, UploadTransformOptions> = {
  'listing-image': { maxDimension: 1600, quality: 0.82, outputType: 'image/jpeg' },
  'payment-proof': { maxDimension: 1800, quality: 0.8, outputType: 'image/webp' },
  avatar: { maxDimension: 800, quality: 0.82, outputType: 'image/webp' },
}

function validateClientImage(file: File, purpose: MarketplaceUploadPurpose) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Solo se permiten imagenes JPG, PNG, WEBP o HEIC')
  }

  if (file.size > CLIENT_MAX_BYTES[purpose]) {
    throw new Error(`La imagen supera el limite de ${(CLIENT_MAX_BYTES[purpose] / (1024 * 1024)).toFixed(0)}MB`)
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('No se pudo leer la imagen'))
    }

    image.src = objectUrl
  })
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: 'image/webp' | 'image/jpeg',
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('No se pudo procesar la imagen'))
        return
      }

      resolve(blob)
    }, type, quality)
  })
}

async function compressImage(
  file: File,
  options: UploadTransformOptions,
): Promise<File> {
  const image = await loadImage(file)
  let width = image.naturalWidth
  let height = image.naturalHeight

  if (width > options.maxDimension || height > options.maxDimension) {
    if (width >= height) {
      height = Math.round((height * options.maxDimension) / width)
      width = options.maxDimension
    } else {
      width = Math.round((width * options.maxDimension) / height)
      height = options.maxDimension
    }
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('No se pudo preparar el canvas de imagen')
  }

  ctx.drawImage(image, 0, 0, width, height)

  const blob = await canvasToBlob(canvas, options.outputType, options.quality)
  const outputType = blob.type === 'image/png' ? 'image/png' : options.outputType
  const extension = outputType === 'image/webp' ? 'webp' : outputType === 'image/png' ? 'png' : 'jpg'
  const outputName = file.name.replace(/\.[^.]+$/, '') || 'upload'

  return new File([blob], `${outputName}.${extension}`, {
    type: outputType,
    lastModified: Date.now(),
  })
}

export async function prepareMarketplaceUpload(
  file: File,
  purpose: MarketplaceUploadPurpose,
): Promise<PreparedMarketplaceUpload> {
  validateClientImage(file, purpose)
  const compressedFile = await compressImage(file, PURPOSE_TRANSFORMS[purpose])

  return {
    file: compressedFile,
    previewUrl: URL.createObjectURL(compressedFile),
  }
}

export function revokeMarketplaceUploadPreview(upload: PreparedMarketplaceUpload | null | undefined) {
  if (upload?.previewUrl) {
    URL.revokeObjectURL(upload.previewUrl)
  }
}

export async function uploadMarketplaceFile(
  file: File,
  purpose: MarketplaceUploadPurpose,
  options?: {
    transactionId?: string
  },
): Promise<{ url: string }> {
  const formData = new FormData()
  formData.set('purpose', purpose)
  formData.set('file', file)
  if (options?.transactionId) {
    formData.set('transactionId', options.transactionId)
  }

  const response = await fetch('/api/marketplace/upload', {
    method: 'POST',
    body: formData,
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok || !payload?.url) {
    throw new Error(payload?.message ?? 'No se pudo subir el archivo')
  }

  return { url: payload.url as string }
}
