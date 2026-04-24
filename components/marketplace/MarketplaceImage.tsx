import Image from 'next/image'
import type { CSSProperties } from 'react'
import { isVercelBlobUrl } from '@/lib/marketplace/media-url'

type MarketplaceImageProps = {
  src: string
  alt: string
  className?: string
  sizes?: string
  priority?: boolean
  loading?: 'lazy' | 'eager'
  style?: CSSProperties
} & (
  | {
      fill: true
      width?: never
      height?: never
    }
  | {
      fill?: false
      width: number
      height: number
    }
)

function shouldUseOptimizedImage(src: string) {
  return (src.startsWith('/') && !src.startsWith('data:')) || isVercelBlobUrl(src)
}

export function MarketplaceImage(props: MarketplaceImageProps) {
  const { src, alt, className, sizes, priority, loading = 'lazy', style } = props

  if (!shouldUseOptimizedImage(src)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={className} loading={loading} style={style} />
  }

  if (props.fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={className}
        sizes={sizes}
        priority={priority}
        style={style}
      />
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={props.width}
      height={props.height}
      className={className}
      sizes={sizes}
      priority={priority}
      loading={priority ? undefined : loading}
      style={style}
    />
  )
}
