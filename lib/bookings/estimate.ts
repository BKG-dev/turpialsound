// Turpial Sound - Motor derivado de cotizacion en memoria
// Fase 1B.6c

import { CATALOG_VARIANTS, getAddonsForService } from '@/lib/bookings/catalog'
import type {
  BookingEstimate,
  BookingEstimateAdjustment,
  BookingEstimateIssue,
  BookingEstimateLine,
  SelectedBookingItem,
} from '@/lib/bookings/types'

export interface BuildBookingEstimateInput {
  selectedItems: SelectedBookingItem[]
  eventDate: string | null
  durationMinutes: number | null
  extrasTechnician: boolean
  extrasBackline: boolean
}

export function buildBookingEstimate(input: BuildBookingEstimateInput): BookingEstimate {
  const primaryItem = input.selectedItems[0] ?? null
  const lines: BookingEstimateLine[] = []
  const adjustments: BookingEstimateAdjustment[] = []
  const blockingIssues: BookingEstimateIssue[] = []

  if (!primaryItem?.variantSlug) {
    return {
      lines,
      adjustments,
      subtotalUsd: 0,
      estimatedTotalUsd: 0,
      blockingIssues,
      isBlocked: false,
    }
  }

  const variant = CATALOG_VARIANTS.find((entry) => entry.slug === primaryItem.variantSlug)

  if (!variant || variant.priceUsd == null || !variant.priceUnit) {
    return {
      lines,
      adjustments,
      subtotalUsd: 0,
      estimatedTotalUsd: 0,
      blockingIssues,
      isBlocked: false,
    }
  }

  const durationHours = input.durationMinutes ? input.durationMinutes / 60 : 0

  if (variant.slug === 'mezcla-master-por-tema') {
    lines.push(
      {
        label: 'Mezcla',
        quantity: primaryItem.quantity,
        unit: 'track',
        unitPriceUsd: 150,
        lineTotalUsd: 150 * primaryItem.quantity,
      },
      {
        label: 'Master',
        quantity: primaryItem.quantity,
        unit: 'track',
        unitPriceUsd: 150,
        lineTotalUsd: 150 * primaryItem.quantity,
      },
    )
  } else {
    lines.push({
      label: variant.name,
      quantity: getBaseQuantity(variant.priceUnit, durationHours, primaryItem.quantity),
      unit: variant.priceUnit,
      unitPriceUsd: variant.priceUsd,
      lineTotalUsd:
        variant.priceUnit === 'fixed'
          ? variant.priceUsd * primaryItem.quantity
          : variant.priceUsd * getBaseQuantity(variant.priceUnit, durationHours, primaryItem.quantity),
    })
  }

  if (
    variant.serviceSlug === 'sala-ensayo' &&
    variant.weekendSurchargeUsd &&
    isWeekendDate(input.eventDate) &&
    durationHours > 0
  ) {
    adjustments.push({
      label: 'Recargo fin de semana',
      amountUsd: variant.weekendSurchargeUsd * durationHours * primaryItem.quantity,
    })
  }

  if (
    variant.maxHours &&
    variant.blockWhenExceedingMaxHours &&
    durationHours > variant.maxHours
  ) {
    blockingIssues.push({
      code: 'MAX_HOURS_EXCEEDED',
      message: `La modalidad ${variant.name} admite un maximo de ${variant.maxHours} horas por sesion.`,
    })
  }

  const addons = getVisibleSelectedAddons(input, primaryItem.serviceSlug)
  for (const addon of addons) {
    lines.push({
      label: addon.name,
      quantity: 1,
      unit: 'addon',
      unitPriceUsd: null,
      lineTotalUsd: 0,
    })
  }

  const subtotalUsd = sumLineTotals(lines)
  const estimatedTotalUsd = subtotalUsd + sumAdjustmentTotals(adjustments)

  return {
    lines,
    adjustments,
    subtotalUsd,
    estimatedTotalUsd,
    blockingIssues,
    isBlocked: blockingIssues.length > 0,
  }
}

function getBaseQuantity(
  unit: 'hour' | 'track' | 'episode' | 'fixed',
  durationHours: number,
  itemQuantity: number,
): number {
  if (unit === 'hour') return durationHours * itemQuantity
  if (unit === 'fixed') return itemQuantity
  return itemQuantity
}

function isWeekendDate(eventDate: string | null): boolean {
  if (!eventDate) return false
  const parsed = new Date(`${eventDate}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return false
  const day = parsed.getDay()
  return day === 0 || day === 6
}

function getVisibleSelectedAddons(
  input: BuildBookingEstimateInput,
  serviceSlug: string,
) {
  const availableAddons = getAddonsForService(serviceSlug)
  return availableAddons.filter((addon) => {
    if (addon.slug === 'tecnico-sonido') return input.extrasTechnician
    if (addon.slug === 'backline-equipamiento') return input.extrasBackline
    return false
  })
}

function sumLineTotals(lines: BookingEstimateLine[]): number {
  return lines.reduce((total, line) => total + line.lineTotalUsd, 0)
}

function sumAdjustmentTotals(adjustments: BookingEstimateAdjustment[]): number {
  return adjustments.reduce((total, adjustment) => total + adjustment.amountUsd, 0)
}
