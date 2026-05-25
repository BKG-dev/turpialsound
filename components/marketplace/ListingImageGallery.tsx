'use client'

import { useMemo, useState } from 'react'
import { MarketplaceImage } from '@/components/marketplace/MarketplaceImage'

type ListingImageGalleryProps = {
  images: string[]
  title: string
  isSold?: boolean
}

export function ListingImageGallery({ images, title, isSold = false }: ListingImageGalleryProps) {
  const normalizedImages = useMemo(() => images.filter(Boolean), [images])
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectedImage = normalizedImages[selectedIndex] ?? normalizedImages[0] ?? null
  const hasMultipleImages = normalizedImages.length > 1

  return (
    <div className="space-y-3">
      <div
        className="w-full aspect-[4/3] rounded-2xl overflow-hidden relative"
        style={{ background: 'var(--mp-media-bg)', border: '1px solid var(--mp-border)' }}
      >
        {selectedImage ? (
          <MarketplaceImage
            src={selectedImage}
            alt={`${title} imagen ${selectedIndex + 1}`}
            fill
            className="w-full h-full object-cover"
            sizes="(min-width: 1024px) 50vw, 100vw"
            priority
          />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background: 'linear-gradient(135deg, rgba(0,174,239,0.05) 0%, rgba(0,80,200,0.03) 100%)',
            }}
          />
        )}

        {isSold && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
          >
            <span
              className="px-6 py-2 rounded-xl text-xl font-bold tracking-widest"
              style={{
                background: 'rgba(239,68,68,0.15)',
                border: '2px solid rgba(239,68,68,0.7)',
                color: '#ef4444',
                boxShadow: '0 0 32px rgba(239,68,68,0.35)',
                transform: 'rotate(-8deg)',
              }}
            >
              VENDIDO
            </span>
          </div>
        )}
      </div>

      {hasMultipleImages && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {normalizedImages.map((img, index) => (
            <button
              key={`${img}-${index}`}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className="w-16 h-16 rounded-lg flex-shrink-0 overflow-hidden"
              style={{
                border:
                  selectedIndex === index
                    ? '2px solid rgba(0,174,239,0.5)'
                    : '1px solid var(--mp-border)',
              }}
              aria-label={`Ver imagen ${index + 1} de ${normalizedImages.length}`}
              aria-pressed={selectedIndex === index}
            >
              <MarketplaceImage
                src={img}
                alt={`${title} miniatura ${index + 1}`}
                width={64}
                height={64}
                className="w-16 h-16 object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
