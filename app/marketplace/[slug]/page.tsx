import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Shield, BadgeCheck, MapPin, Star, Clock } from 'lucide-react'
import { getListingBySlug } from '@/actions/marketplace/listings'
import { getListingQuestions } from '@/actions/marketplace/questions'
import { getSession } from '@/lib/marketplace/auth'
import { ListingQASection } from '@/components/marketplace/ListingQASection'
import { ListingDetailActions } from '@/components/marketplace/ListingDetailActions'
import { MARKETPLACE_CONFIG } from '@/types/marketplace'

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const listing = await getListingBySlug(params.slug)
  if (!listing) return { title: 'Listing no encontrado — Turpial Market' }
  return {
    title: `${listing.title} — Turpial Market`,
    description: listing.description.slice(0, 160),
  }
}

export default async function ListingPage({ params }: { params: { slug: string } }) {
  const listing = await getListingBySlug(params.slug)
  if (!listing) notFound()

  const sellerId = listing.type === 'product' ? listing.seller.id : listing.talent.id
  const seller = listing.type === 'product' ? listing.seller : listing.talent

  const [questionsResult, session] = await Promise.all([
    getListingQuestions(listing.id),
    getSession(),
  ])

  const questions = questionsResult.success ? (questionsResult.data ?? []) : []

  const coverImages: string[] =
    listing.type === 'product'
      ? listing.images
      : (listing.portfolio ?? [])

  const cover = coverImages[0] ?? null

  const price = listing.type === 'product' ? listing.price : listing.priceFrom
  const priceTo = listing.type === 'service' ? listing.priceTo : undefined
  const currency = listing.currency
  const priceLabel = listing.type === 'service' ? listing.priceLabel : undefined

  return (
    <div
      className="min-h-screen"
      style={{ background: 'radial-gradient(ellipse at top, rgba(0,20,40,0.4) 0%, #0a0a0a 55%)' }}
    >
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-40 flex items-center gap-4 px-4 sm:px-6 py-3"
        style={{
          background: 'rgba(8,8,8,0.95)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <Link
          href="/marketplace"
          className="flex items-center gap-2 text-[#5a5a5a] hover:text-[#f2f2f2] transition-colors"
        >
          <ArrowLeft size={16} />
          <span className="text-xs hidden sm:inline">Marketplace</span>
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[#3a3a3a] truncate">{listing.title}</p>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── 2-column grid ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Left: Image gallery */}
          <div className="space-y-3">
            <div
              className="w-full aspect-[4/3] rounded-2xl overflow-hidden relative"
              style={{ background: 'rgba(17,17,17,0.9)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cover}
                  alt={listing.title}
                  className="w-full h-full object-cover"
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
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={img}
                    alt={`${listing.title} ${i + 1}`}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    style={{ border: i === 0 ? '2px solid rgba(0,174,239,0.5)' : '1px solid rgba(255,255,255,0.06)' }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right: Details + CTAs */}
          <div className="space-y-5">
            {/* Subcategory eyebrow */}
            <p className="text-[11px] text-[#5a5a5a] uppercase tracking-widest">
              {listing.subcategory}
            </p>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-semibold text-[#f2f2f2] leading-snug">
              {listing.title}
            </h1>

            {/* Price row */}
            <div className="flex items-end gap-2">
              {listing.type === 'service' && (
                <span className="text-sm text-[#5a5a5a] mb-0.5">Desde</span>
              )}
              <span className="text-3xl font-bold text-gradient-gold">
                ${price.toLocaleString()}
              </span>
              {priceTo && (
                <span className="text-sm text-[#5a5a5a] mb-0.5">– ${priceTo.toLocaleString()}</span>
              )}
              <span className="text-sm text-[#a0a0a0] mb-0.5">{currency}</span>
              {priceLabel && (
                <span className="text-sm text-[#5a5a5a] mb-0.5">{priceLabel}</span>
              )}
            </div>

            {/* Product-specific badges */}
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

            {/* Service-specific delivery */}
            {listing.type === 'service' && listing.deliveryDays && (
              <div className="flex items-center gap-2">
                <span
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium"
                  style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80' }}
                >
                  <Clock size={10} /> {listing.deliveryDays} días de entrega
                </span>
              </div>
            )}

            {/* Seller info */}
            <div
              className="flex items-center gap-3 p-4 rounded-xl"
              style={{ background: 'rgba(17,17,17,0.9)', border: '1px solid rgba(255,255,255,0.06)' }}
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
                  <span className="text-[#3a3a3a]">·</span>
                  <MapPin size={9} className="text-[#5a5a5a]" />
                  <span className="text-[11px] text-[#5a5a5a]">{seller.location}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            {listing.description && (
              <p className="text-sm text-[#a0a0a0] leading-relaxed">{listing.description}</p>
            )}

            {/* Escrow notice */}
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{ background: 'rgba(0,174,239,0.04)', border: '1px solid rgba(0,174,239,0.1)' }}
            >
              <Shield size={12} className="text-[#00aeef] flex-shrink-0" />
              <p className="text-[11px] text-[#5a5a5a]">
                Pago fiduciario protegido · {(MARKETPLACE_CONFIG.COMMISSION_RATE * 100).toFixed(0)}% comisión al vendedor
              </p>
            </div>

            {/* CTA Buttons — client component */}
            <ListingDetailActions
              listing={listing}
              sellerId={sellerId}
              initialUserId={session?.userId ?? null}
              initialUserName={session?.displayName ?? null}
            />
          </div>
        </div>

        {/* ── Q&A Section ─────────────────────────────────────────────────── */}
        <ListingQASection
          listingId={listing.id}
          sellerId={sellerId}
          currentUserId={session?.userId}
          initialQuestions={questions}
        />

      </main>
    </div>
  )
}
