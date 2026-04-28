const VERCEL_BLOB_HOST_SUFFIX = '.public.blob.vercel-storage.com'

export function isVercelBlobPublicUrl(src: string) {
  try {
    const url = new URL(src)
    return url.protocol === 'https:' && url.hostname.endsWith(VERCEL_BLOB_HOST_SUFFIX)
  } catch {
    return false
  }
}
