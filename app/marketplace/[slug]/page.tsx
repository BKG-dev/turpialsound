import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BadgeCheck, Clock, MapPin, Shield, Star } from 'lucide-react'
import { siteConfig } from '@/content/site'
import { getListingBySlug } from '@/actions/marketplace/listings'
import { getListingQuestions } from '@/actions/marketplace/questions'
import { getSession } from '@/lib/marketplace/auth'
import { ListingQASection } from '@/components/marketplace/ListingQASection'
import { ListingDetailActions } from '@/components/marketplace/ListingDetailActions'
import { MarketplaceImage } from '@/components/marketplace/MarketplaceImage'
import { MarketplaceThemeToggle } from '@/components/marketplace/MarketplaceTheme'
import type { Listing } from '@/types/marketplace'

type ListingPageParams = { params: { slug: string } }

function truncateForMetadata(value: string, maxLength = 155) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 1).trimEnd()}...`
}

function getListingImages(listing: Listing) {
  return listing.type === 'product' ? listing.images : (listing.portfolio ?? [])
}

function getListingPrice(listing: Listing) {
  return listing.type === 'product' ? listing.price : listing.priceFrom
}

function formatListingPrice(listing: Listing) {
  const price = getListingPrice(listing)
  if (!Number.isFinite(price) || price <= 0) return null

  const amount = `$${price.toLocaleString('es-VE')}`
  if (listing.type === 'service') {
    return listing.priceTo
      ? `desde ${amount} hasta $${listing.priceTo.toLocaleString('es-VE')} ${listing.currency}`
      : `desde ${amount} ${listing.currency}`
  }

  return `${amount} ${listing.currency}`
}

function buildListingDescription(listing: Listing) {
  const price = formatListingPrice(listing)
  const parts = [
    listing.description,
    price ? `Precio publicado: ${price}.` : null,
    listing.subcategory ? `Categoria: ${listing.subcategory}.` : null,
    'Operacion con pago reportado y revision manual en Turpial Sound.',
  ].filter(Boolean)

  return truncateForMetadata(parts.join(' '))
}

function absoluteUrl(pathOrUrl: string) {
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl
  }

  return `${siteConfig.url}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`
}

function getListingUrl(slug: string) {
  return `${siteConfig.url}/marketplace/${slug}`
}

function buildListingJsonLd(listing: Listing, listingUrl: string, description: string) {
  const marketplaceUrl = `${siteConfig.url}/marketplace`
  const images = getListingImages(listing)
  const cover = images[0] ? absoluteUrl(images[0]) : undefined

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ItemPage',
        '@id': `${listingUrl}#webpage`,
        url: listingUrl,
        name: listing.title,
        description,
        inLanguage: 'es-VE',
        isPartOf: {
          '@type': 'WebSite',
          name: siteConfig.name,
          url: siteConfig.url,
        },
        ...(cover
          ? {
              primaryImageOfPage: {
                '@type': 'ImageObject',
                url: cover,
              },
            }
          : {}),
        about: {
          '@type': 'Thing',
          name: listing.title,
          description,
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${listingUrl}#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Inicio',
            item: siteConfig.url,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Marketplace',
            item: marketplaceUrl,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: listing.title,
            item: listingUrl,
          },
        ],
      },
    ],
  }
}

export async function generateMetadata({ params }: ListingPageParams): Promise<Metadata> {
  const listing = await getListingBySlug(params.slug)
  const fallbackUrl = getListingUrl(params.slug)

  if (!listing) {
    return {
      title: `Publicacion no encontrada | ${siteConfig.name}`,
      description: 'La publicacion del marketplace no esta disponible en Turpial Sound.',
      alternates: {
        canonical: fallbackUrl,
      },
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  const listingUrl = getListingUrl(listing.slug || params.slug)
  const description = buildListingDescription(listing)
  const title = `${listing.title} | ${siteConfig.name}`
  const images = getListingImages(listing)
  const ogImage = images[0] ? absoluteUrl(images[0]) : `${siteConfig.url}/images/og/default.jpg`

  return {
    title,
    description,
    alternates: {
      canonical: listingUrl,
    },
    openGraph: {
      title,
      description,
      url: listingUrl,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      type: 'website',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: listing.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

export default async function ListingPage({ params }: ListingPageParams) {
  const listing = await getListingBySlug(params.slug)
  if (!listing) notFound()

  const sellerId = listing.type === 'product' ? listing.seller.id : listing.talent.id
  const seller = listing.type === 'product' ? listing.seller : listing.talent

  const [questionsResult, session] = await Promise.all([
    getListingQuestions(listing.id),
    getSession(),
  ])

  const questions = questionsResult.success ? (questionsResult.data ?? []) : []
  const coverImages = getListingImages(listing)
  const cover = coverImages[0] ?? null

  const price = listing.type === 'product' ? listing.price : listing.priceFrom
  const priceTo = listing.type === 'service' ? listing.priceTo : undefined
  const currency = listing.currency
  const priceLabel = listing.type === 'service' ? listing.priceLabel : undefined
  const listingUrl = getListingUrl(listing.slug || params.slug)
  const listingDescription = buildListingDescription(listing)
  const listingJsonLd = buildListingJsonLd(listing, listingUrl, listingDescription)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(listingJsonLd) }}
      />
      <div className="min-h-screen">
        <div
          className="sticky top-0 z-40 flex items-center gap-4 px-4 sm:px-6 py-3"
          style={{
            background: 'var(--mp-panel-solid)',
            borderBottom: '1px solid var(--mp-border)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <Link
            href="/marketplace"
            className="flex items-center gap-2 text-[#9a9a9a] hover:text-[#f2f2f2] transition-colors"
          >
            <ArrowLeft size={16} />
            <span className="text-xs hidden sm:inline">Marketplace</span>
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#9a9a9a] truncate">{listing.title}</p>
          </div>
          <MarketplaceThemeToggle compact />
        </div>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-3">
              <div
                className="w-full aspect-[4/3] rounded-2xl overflow-hidden relative"
                style={{ background: 'var(--mp-media-bg)', border: '1px solid var(--mp-border)' }}
              >
                {cover ? (
                  <MarketplaceImage
                    src={cover}
                    alt={listing.title}
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
                {listing.status === 'sold' && (
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

              {coverImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {coverImages.slice(0, 6).map((img, i) => (
                    <MarketplaceImage
                      key={i}
                      src={img}
                      alt={`${listing.title} ${i + 1}`}
                      width={64}
                      height={64}
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      style={{ border: i === 0 ? '2px solid rgba(0,174,239,0.5)' : '1px solid var(--mp-border)' }}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-5">
              <p className="text-[11px] text-[#9a9a9a] uppercase tracking-widest">
                {listing.subcategory}
              </p>

              <h1 className="text-2xl sm:text-3xl font-semibold text-[#f2f2f2] leading-snug">
                {listing.title}
              </h1>

              <div className="flex items-end gap-2">
                {listing.type === 'service' && (
                  <span className="text-sm text-[#b8b8b8] mb-0.5">Desde</span>
                )}
                <span className="text-3xl font-bold text-gradient-gold">
                  ${price.toLocaleString()}
                </span>
                {priceTo && (
                  <span className="text-sm text-[#b8b8b8] mb-0.5">- ${priceTo.toLocaleString()}</span>
                )}
                <span className="text-sm text-[#a0a0a0] mb-0.5">{currency}</span>
                {priceLabel && (
                  <span className="text-sm text-[#b8b8b8] mb-0.5">{priceLabel}</span>
                )}
              </div>

              {listing.type === 'product' && (
                <div className="flex flex-wrap gap-2">
                  <span
                    className="px-2.5 py-1 rounded-lg text-xs font-medium"
                    style={{ background: 'rgba(0,174,239,0.08)', border: '1px solid rgba(0,174,239,0.2)', color: '#00aeef' }}
                  >
                    {listing.condition === 'new' ? 'Nuevo'
                      : listing.condition === 'used-like-new' ? 'Como nuevo'
                      : listing.condition === 'used-good' ? 'Buen estado'
                      : 'Estado regular'}
                  </span>
                  {listing.rentalAvailable && (
                    <span
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium"
                      style={{ background: 'rgba(255,193,7,0.08)', border: '1px solid rgba(255,193,7,0.2)', color: '#ffc107' }}
                    >
                      <Clock size={10} /> Alquiler disponible
                    </span>
                  )}
                </div>
              )}

              {listing.type === 'service' && listing.deliveryDays && (
                <div className="flex items-center gap-2">
                  <span
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium"
                    style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80' }}
                  >
                    <Clock size={10} /> {listing.deliveryDays} dias de entrega
                  </span>
                </div>
              )}

              <div
                className="flex items-center gap-3 p-4 rounded-xl"
                style={{ background: 'var(--mp-card)', border: '1px solid var(--mp-border)' }}
              >
                <div className="relative flex-shrink-0">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #00aeef 0%, #0050c8 100%)' }}
                  >
                    {seller.initials}
                  </div>
                  {seller.verified && (
                    <BadgeCheck
                      size={14}
                      className="absolute -bottom-0.5 -right-0.5 text-[#00aeef]"
                      style={{ filter: 'drop-shadow(0 0 4px rgba(0,174,239,0.7))' }}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[#f2f2f2] truncate">{seller.name}</p>
                    {seller.verified && (
                      <span
                        className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(0,174,239,0.1)', color: '#00aeef', border: '1px solid rgba(0,174,239,0.2)' }}
                      >
                        VERIFICADO
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Star size={10} className="text-[#ffc107] fill-[#ffc107]" />
                    <span className="text-[11px] text-[#a0a0a0]">{seller.rating.toFixed(1)}</span>
                    <span className="text-[#7a7a7a]">/</span>
                    <MapPin size={9} className="text-[#9a9a9a]" />
                    <span className="text-[11px] text-[#9a9a9a]">{seller.location}</span>
                  </div>
                </div>
              </div>

              {listing.description && (
                <p className="text-sm text-[#a0a0a0] leading-relaxed">{listing.description}</p>
              )}

              <section
                aria-labelledby="purchase-process-title"
                className="space-y-2 px-3 py-3 rounded-xl"
                style={{ background: 'rgba(0,174,239,0.06)', border: '1px solid rgba(0,174,239,0.16)' }}
              >
                <div className="flex items-center gap-2">
                  <Shield size={12} className="text-[#00aeef] flex-shrink-0" />
                  <h2 id="purchase-process-title" className="text-xs font-semibold text-[#d8d8d8]">
                    Como funciona la compra
                  </h2>
                </div>
                <p className="text-[11px] text-[#b8b8b8] leading-relaxed">
                  El comprador reporta el pago y Turpial Sound realiza una revision manual antes
                  de avanzar la operacion. El pago al vendedor se gestiona despues de la validacion
                  y la confirmacion correspondiente.
                </p>
              </section>

              <ListingDetailActions
                listing={listing}
                sellerId={sellerId}
                initialUserId={session?.userId ?? null}
                initialUserName={session?.displayName ?? null}
              />
            </div>
          </div>

          <ListingQASection
            listingId={listing.id}
            sellerId={sellerId}
            currentUserId={session?.userId}
            initialQuestions={questions}
          />
        </main>
      </div>
    </>
  )
}
