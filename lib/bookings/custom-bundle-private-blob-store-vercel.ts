import 'server-only'

import {
  BlobNotFoundError,
  del,
  head,
  put,
} from '@vercel/blob'

import {
  type CustomBundlePaymentProofAllowedMimeType,
} from '@/lib/bookings/custom-bundle-payment-contract'
import {
  type CustomBundlePrivateBlobObject,
  type CustomBundlePrivateBlobStore,
} from '@/lib/bookings/custom-bundle-payment-proof-boundary'

export interface CreateCustomBundlePrivateBlobStoreVercelInput {
  token: string
}

function isBlobNotFoundError(error: unknown): boolean {
  return error instanceof BlobNotFoundError
}

async function headPrivateObject(
  token: string,
  pathname: string,
): Promise<CustomBundlePrivateBlobObject | null> {
  try {
    const blob = await head(pathname, { token })
    return {
      pathname: blob.pathname,
      contentType: blob.contentType,
      sizeBytes: blob.size,
      uploadedAt: new Date(blob.uploadedAt.getTime()),
      access: 'private',
    }
  } catch (error) {
    if (isBlobNotFoundError(error)) {
      return null
    }

    throw error
  }
}

export function createCustomBundlePrivateBlobStoreVercel(
  input: CreateCustomBundlePrivateBlobStoreVercelInput,
): CustomBundlePrivateBlobStore {
  const { token } = input

  return {
    async headPrivate(pathname: string): Promise<CustomBundlePrivateBlobObject | null> {
      return headPrivateObject(token, pathname)
    },
    async putPrivate(input: {
      pathname: string
      body: Uint8Array
      contentType: CustomBundlePaymentProofAllowedMimeType
      access: 'private'
      addRandomSuffix: false
    }): Promise<CustomBundlePrivateBlobObject> {
      await put(input.pathname, Buffer.from(input.body), {
        access: 'private',
        contentType: input.contentType,
        addRandomSuffix: false,
        token,
      })

      const confirmed = await headPrivateObject(token, input.pathname)
      if (!confirmed) {
        throw new Error('Blob confirmation failed after upload.')
      }

      return confirmed
    },
    async deletePrivate(pathname: string): Promise<void> {
      await del(pathname, { token })
    },
  }
}
