import { NextResponse } from 'next/server'
import { getDb } from '@/lib/marketplace/db'
import { getSession } from '@/lib/marketplace/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Only admin/super can export
  const db = await getDb()
  if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 })

  const user = await db.mpUser.findUnique({ where: { id: session.userId }, select: { role: true } })
  if (!user || (user.role !== 'SUPER' && user.role !== 'SOCIO')) {
    await db.$disconnect()
    return NextResponse.json({ error: 'Solo admin o socio puede exportar' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') || 'json'
  const status = searchParams.get('status') || 'all'

  try {
    let payouts
    if (status !== 'all') {
      payouts = await db.mpPayout.findMany({
        where: { status: status.toUpperCase() },
        orderBy: { completedAt: 'desc' },
        include: {
          seller: {
            select: {
              id: true,
              displayName: true,
              email: true,
              phone: true,
              sellerRating: true,
              reviewCount: true,
              totalSales: true,
            },
          },
        },
      })
    } else {
      payouts = await db.mpPayout.findMany({
        orderBy: { completedAt: 'desc' },
        include: {
          seller: {
            select: {
              id: true,
              displayName: true,
              email: true,
              phone: true,
              sellerRating: true,
              reviewCount: true,
              totalSales: true,
            },
          },
        },
      })
    }

    // Enrich with transaction data and payout method
    const enriched = await Promise.all(
      payouts.map(async (p: Record<string, unknown>) => {
        const txIds = (p.transactionIds as string[]) || []
        const transactions = txIds.length > 0
          ? await db.mpTransaction.findMany({
              where: { id: { in: txIds } },
              select: {
                id: true,
                amount: true,
                currency: true,
                sellerNetAmount: true,
                platformFeePercent: true,
                platformFeeAmount: true,
                paymentMethod: true,
                frozenRate: true,
                frozenRateSource: true,
                listingId: true,
                createdAt: true,
                releasedAt: true,
                status: true,
              },
            })
          : []

        const payoutMethod = await db.mpPayoutMethod.findFirst({
          where: { userId: (p.seller as Record<string, unknown>)?.id as string, isActive: true, isDefault: true },
          select: { methodType: true, accountData: true, bankName: true, accountLast4: true },
        })

        const listingIds = [...new Set(transactions.map((t: { listingId: unknown }) => t.listingId).filter(Boolean))]
        const listings = listingIds.length > 0
          ? await db.mpListing.findMany({
              where: { id: { in: listingIds.filter((id): id is string => Boolean(id)) } },
              select: { id: true, title: true, slug: true, category: true },
            })
          : []

        return {
          payoutId: p.id,
          completedAt: (p.completedAt as Date)?.toISOString(),
          externalPayoutId: p.externalPayoutId,
          // Seller data
          seller: {
            id: (p.seller as Record<string, unknown>)?.id,
            name: (p.seller as Record<string, unknown>)?.displayName,
            email: (p.seller as Record<string, unknown>)?.email,
            phone: (p.seller as Record<string, unknown>)?.phone,
            rating: (p.seller as Record<string, unknown>)?.sellerRating,
            reviewCount: (p.seller as Record<string, unknown>)?.reviewCount,
            totalSales: (p.seller as Record<string, unknown>)?.totalSales,
          },
          // Payment method + banking
          paymentMethod: {
            type: p.method,
            details: payoutMethod?.methodType,
            bank: payoutMethod?.bankName,
            accountLast4: payoutMethod?.accountLast4,
            accountData: payoutMethod?.accountData,
          },
          // Amounts
          amount: p.amount,
          currency: p.currency,
          // Transactions
          transactions: transactions.map((tx: { id: string; amount: unknown; currency: unknown; listingId: unknown; frozenRate: unknown; frozenRateSource: unknown; platformFeePercent: unknown; platformFeeAmount: unknown; sellerNetAmount: unknown; paymentMethod: unknown; createdAt: Date | null; releasedAt: Date | null; status: unknown }) => {
            const listing = listings.find((l: { id: string }) => l.id === tx.listingId)
            return {
              id: tx.id,
              listingTitle: listing?.title,
              listingSlug: listing?.slug,
              listingCategory: listing?.category,
              saleAmount: tx.amount,
              saleCurrency: tx.currency,
              exchangeRate: tx.frozenRate,
              exchangeRateSource: tx.frozenRateSource,
              platformFeePercent: tx.platformFeePercent,
              platformFeeAmount: tx.platformFeeAmount,
              sellerNetAmount: tx.sellerNetAmount,
              paymentMethod: tx.paymentMethod,
              createdAt: tx.createdAt?.toISOString(),
              releasedAt: tx.releasedAt?.toISOString(),
              status: tx.status,
            }
          }),
          totalToPay: p.amount,
          status: p.status,
        }
      }),
    )

    await db.$disconnect()

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      exportedBy: session.userId,
      totalPayouts: enriched.length,
      totalAmount: enriched.reduce((sum: number, p: Record<string, unknown>) => sum + Number(p.amount || 0), 0),
      payouts: enriched,
    }

    switch (format) {
      case 'csv':
      case 'excel': {
        const headers = [
          'Payout ID', 'Fecha Pago', 'Vendedor', 'Email', 'Telefono',
          'Banco', 'Cuenta', 'Monto USD', 'TX IDs', 'Metodo Pago',
          'Comision %', 'Comision $', 'Neto Vendedor', 'Tasa BCV', 'Estado'
        ]
        const rows = enriched.flatMap((p: Record<string, unknown>) =>
          (p.transactions as Record<string, unknown>[])?.map((tx: Record<string, unknown>) => [
            p.payoutId,
            p.completedAt,
            (p.seller as Record<string, unknown>)?.name,
            (p.seller as Record<string, unknown>)?.email,
            (p.seller as Record<string, unknown>)?.phone,
            (p.paymentMethod as Record<string, unknown>)?.bank,
            (p.paymentMethod as Record<string, unknown>)?.accountLast4,
            p.amount,
            tx.id,
            tx.paymentMethod,
            tx.platformFeePercent,
            tx.platformFeeAmount,
            tx.sellerNetAmount,
            tx.exchangeRate,
            p.status,
          ]) || [[
            p.payoutId, p.completedAt,
            (p.seller as Record<string, unknown>)?.name,
            (p.seller as Record<string, unknown>)?.email,
            (p.seller as Record<string, unknown>)?.phone,
            (p.paymentMethod as Record<string, unknown>)?.bank,
            (p.paymentMethod as Record<string, unknown>)?.accountLast4,
            p.amount, '', '',
            '', '', '', '', p.status,
          ]]
        )
        const csv = [headers.join(','), ...rows.map((r: unknown[]) => r.map(c => `"${String(c ?? '')}"`).join(','))].join('\n')
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename=payouts-${new Date().toISOString().slice(0, 10)}.csv`,
          },
        })
      }
      case 'txt': {
        const txt = enriched.map((p: Record<string, unknown>) => {
          const seller = p.seller as Record<string, unknown>
          const pm = p.paymentMethod as Record<string, unknown>
          return [
            `=== Payout: ${p.payoutId} ===`,
            `Fecha: ${p.completedAt}`,
            `Vendedor: ${seller?.name} (${seller?.email})`,
            `Telefono: ${seller?.phone}`,
            `Banco: ${pm?.bank} | Cuenta: ${pm?.accountLast4}`,
            `Monto Total: $${p.amount} ${p.currency}`,
            `Metodo: ${pm?.details}`,
            `Estado: ${p.status}`,
            `Transacciones:`,
            ...((p.transactions as Record<string, unknown>[])?.map((tx: Record<string, unknown>) =>
              `  - ${tx.id}: $${tx.sellerNetAmount} neto (venta $${tx.saleAmount}, fee ${tx.platformFeePercent}% = $${tx.platformFeeAmount}, tasa BCV ${tx.exchangeRate || 'N/A'})`
            ) || []),
            '',
          ].join('\n')
        }).join('\n')
        return new NextResponse(txt, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': `attachment; filename=payouts-${new Date().toISOString().slice(0, 10)}.txt`,
          },
        })
      }
      default: // json
        return NextResponse.json(exportPayload)
    }
  } catch (err) {
    await db.$disconnect().catch(() => {})
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error al exportar' }, { status: 500 })
  }
}
