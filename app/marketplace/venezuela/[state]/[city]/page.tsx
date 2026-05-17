import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { generatePageMetadata } from '@/lib/metadata'
import { getActiveListings } from '@/actions/marketplace/listings'
import MarketplacePageClient from '../../../MarketplacePageClient'

export const dynamic = 'force-dynamic'

const cityDefaults: Record<string, { label: string; stateLabel: string }> = {
  caracas: { label: 'Caracas', stateLabel: 'Distrito Capital' },
  maracaibo: { label: 'Maracaibo', stateLabel: 'Zulia' },
  valencia: { label: 'Valencia', stateLabel: 'Carabobo' },
  barquisimeto: { label: 'Barquisimeto', stateLabel: 'Lara' },
  maracay: { label: 'Maracay', stateLabel: 'Aragua' },
  'san-cristobal': { label: 'San Cristóbal', stateLabel: 'Táchira' },
  'ciudad-guayana': { label: 'Ciudad Guayana', stateLabel: 'Bolívar' },
  barcelona: { label: 'Barcelona', stateLabel: 'Anzoátegui' },
  maturin: { label: 'Maturín', stateLabel: 'Monagas' },
  merida: { label: 'Mérida', stateLabel: 'Mérida' },
}

const stateLabels: Record<string, string> = {
  'distrito-capital': 'Distrito Capital',
  'zulia': 'Zulia',
  'carabobo': 'Carabobo',
  'lara': 'Lara',
  'aragua': 'Aragua',
  'tachira': 'Táchira',
  'bolivar': 'Bolívar',
  'anzoategui': 'Anzoátegui',
  'monagas': 'Monagas',
  'merida': 'Mérida',
  'miranda': 'Miranda',
  'falcon': 'Falcón',
  'sucre': 'Sucre',
  'nueva-esparta': 'Nueva Esparta',
  'portuguesa': 'Portuguesa',
  'guarico': 'Guárico',
  'trujillo': 'Trujillo',
  'yaracuy': 'Yaracuy',
  'apure': 'Apure',
  'vargas': 'La Guaira',
  'cojedes': 'Cojedes',
  'delta-amacuro': 'Delta Amacuro',
  'amazonas': 'Amazonas',
}

function capitalize(s: string): string {
  return s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string; city: string }>
}): Promise<Metadata> {
  const { state, city } = await params
  const stateName = stateLabels[state] ?? capitalize(state)
  const cityName = cityDefaults[city]?.label ?? capitalize(city)

  return generatePageMetadata({
    title: `Marketplace musical en ${cityName}, ${stateName}`,
    description: `Encuentra instrumentos, equipos de audio y accesorios musicales en ${cityName}, ${stateName} en el marketplace de Turpial Sound. Publica o compra con operacion protegida.`,
    path: `/marketplace/venezuela/${state}/${city}`,
  })
}

export default async function MarketplaceLocationPage({
  params,
}: {
  params: Promise<{ state: string; city: string }>
}) {
  const { state, city } = await params
  const stateName = stateLabels[state] ?? capitalize(state)
  const cityName = cityDefaults[city]?.label ?? capitalize(city)

  const listings = await getActiveListings({
    state: stateName,
    city: cityName,
  })

  if (listings.length === 0) notFound()

  return (
    <>
      <div
        className="w-full py-3 px-4 mb-2 rounded-xl text-sm"
        style={{
          background: 'rgba(0,174,239,0.06)',
          border: '1px solid rgba(0,174,239,0.15)',
          color: '#00aeef',
        }}
      >
        Mostrando {listings.length} listing{listings.length !== 1 ? 's' : ''} en {cityName}, {stateName}
      </div>
      <MarketplacePageClient initialListings={listings} />
    </>
  )
}
