import { isVercelBlobPublicUrl } from '@/lib/media/public-no-booking-url'

export function isVercelBlobUrl(src: string) {
  return isVercelBlobPublicUrl(src)
}
