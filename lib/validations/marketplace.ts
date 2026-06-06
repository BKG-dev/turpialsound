import { z } from 'zod'

export const MP_CATEGORIES = [
  'instrumentos-nuevos',
  'instrumentos-usados',
  'audio-pro-estudio',
  'consumibles',
  'alquiler-equipos',
  'musicos-sesion',
  'bandas-eventos',
  'tecnicos-audio-iluminacion',
  'productores-arreglistas',
  'beats',
  'mixing',
  'mastering',
  'vocals',
  'production',
  'arreglos',
  'podcast',
] as const

export type MpCategory = (typeof MP_CATEGORIES)[number]

function isMarketplaceStoredUrl(value: string) {
  return value.startsWith('/') || /^https?:\/\//.test(value)
}

export const createListingSchema = z
  .object({
    title: z
      .string()
      .min(3, 'Minimo 3 caracteres')
      .max(120, 'Maximo 120 caracteres'),

    description: z
      .string()
      .min(10, 'Minimo 10 caracteres')
      .max(2000, 'Maximo 2000 caracteres'),

    category: z.enum(MP_CATEGORIES, { error: 'Categoria invalida' }),

    tags: z
      .array(z.string().max(30, 'Cada etiqueta maximo 30 caracteres'))
      .max(10, 'Maximo 10 etiquetas')
      .default([]),

    price: z
      .number({ error: 'El precio debe ser un numero' })
      .positive('El precio debe ser mayor a 0')
      .multipleOf(0.01, 'Maximo 2 decimales'),

    currency: z.enum(['USD']).default('USD'),

    coverImageUrl: z
      .string()
      .refine(isMarketplaceStoredUrl, 'URL de imagen invalida')
      .optional(),

    mediaUrls: z
      .array(z.string().refine(isMarketplaceStoredUrl, 'URL de imagen invalida'))
      .max(4, 'Maximo 4 imagenes adicionales')
      .default([]),

    hasInventory: z.boolean().default(false),

    inventory: z.number().int('Debe ser un numero entero').positive('Debe ser mayor a 0').optional(),

    // S15 Location
    city: z.string().max(100, 'Maximo 100 caracteres').optional(),
    state: z.string().max(100, 'Maximo 100 caracteres').optional(),
    isLocationPublic: z.boolean().default(true),
  })
  .refine((data) => !data.hasInventory || data.inventory !== undefined, {
    message: 'Debes indicar el inventario cuando hasInventory es true',
    path: ['inventory'],
  })
  .refine(
    (data) => !!data.coverImageUrl || data.mediaUrls.length > 0,
    { message: 'Debes subir al menos 1 imagen', path: ['coverImageUrl'] },
  )

export type CreateListingInput = z.infer<typeof createListingSchema>

export type ActionResult<T = undefined> =
  | { success: true; data: T; message: string }
  | { success: false; data?: never; message: string; errors?: Record<string, string[]> }
