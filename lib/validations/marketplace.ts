import { z } from 'zod'

// ─── CATEGORIES ───────────────────────────────────────────────────────────────

export const MP_CATEGORIES = [
  // Physical products
  'instrumentos-nuevos',
  'instrumentos-usados',
  'audio-pro-estudio',
  'consumibles',
  'alquiler-equipos',
  // Services & talent
  'musicos-sesion',
  'bandas-eventos',
  'tecnicos-audio-iluminacion',
  'productores-arreglistas',
  // Digital goods
  'beats',
  'mixing',
  'mastering',
  'vocals',
  'production',
  'arreglos',
  'podcast',
] as const

export type MpCategory = (typeof MP_CATEGORIES)[number]

// ─── CREATE LISTING ───────────────────────────────────────────────────────────

export const createListingSchema = z
  .object({
    title: z
      .string()
      .min(3, 'Mínimo 3 caracteres')
      .max(120, 'Máximo 120 caracteres'),

    description: z
      .string()
      .min(10, 'Mínimo 10 caracteres')
      .max(2000, 'Máximo 2000 caracteres'),

    category: z.enum(MP_CATEGORIES, { error: 'Categoría inválida' }),

    tags: z
      .array(z.string().max(30, 'Cada etiqueta máximo 30 caracteres'))
      .max(10, 'Máximo 10 etiquetas')
      .default([]),

    price: z
      .number({ error: 'El precio debe ser un número' })
      .positive('El precio debe ser mayor a 0')
      .multipleOf(0.01, 'Máximo 2 decimales'),

    currency: z.enum(['USD']).default('USD'),

    // Accepts both persistent URLs (https://) and inline data URLs (data:image/...)
    coverImageUrl: z
      .string()
      .refine(
        v => v.startsWith('data:image/') || /^https?:\/\//.test(v),
        'URL de imagen inválida',
      )
      .optional(),

    hasInventory: z.boolean().default(false),

    inventory: z.number().int('Debe ser un número entero').positive('Debe ser mayor a 0').optional(),
  })
  .refine((data) => !data.hasInventory || data.inventory !== undefined, {
    message: 'Debes indicar el inventario cuando hasInventory es true',
    path: ['inventory'],
  })

export type CreateListingInput = z.infer<typeof createListingSchema>

// ─── SHARED RESULT TYPE ───────────────────────────────────────────────────────

export type ActionResult<T = undefined> =
  | { success: true; data: T; message: string }
  | { success: false; data?: never; message: string; errors?: Record<string, string[]> }
