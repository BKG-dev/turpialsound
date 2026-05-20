import { NextResponse } from 'next/server'
import { getSession } from '@/lib/marketplace/auth'
import { getDb } from '@/lib/marketplace/db'
import { getConsolidatedPayoutReport } from '@/actions/marketplace/admin'
import type { PayoutReportRow } from '@/actions/marketplace/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Only admin/super/socio can export
  const db = await getDb()
  if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 })

  const user = await db.mpUser.findUnique({ where: { id: session.userId }, select: { role: true } })
  await db.$disconnect()
  if (!user || (user.role !== 'SUPER' && user.role !== 'SOCIO')) {
    return NextResponse.json({ error: 'Solo admin o socio puede exportar' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') || 'json'

  try {
    const report = await getConsolidatedPayoutReport()
    if (!report.success || !report.data) {
      return NextResponse.json({ error: report.message || 'Error al generar reporte' }, { status: 500 })
    }

    const rows: PayoutReportRow[] = report.data

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      exportedBy: session.userId,
      totalRows: rows.length,
      totalGross: rows.reduce((sum, r) => sum + r.grossAmount, 0),
      totalNet: rows.reduce((sum, r) => sum + r.netAmount, 0),
      bySource: {
        seller: rows.filter(r => r.source === 'seller').length,
        referral: rows.filter(r => r.source === 'referral').length,
      },
      rows: rows.map(r => ({
        source: r.source === 'referral' ? 'Drop Social' : 'Venta',
        sellerName: r.sellerName,
        payoutMethodType: r.payoutMethodType,
        payoutAccount: r.payoutAccount,
        titular: r.titular,
        cedula: r.cedula,
        telefono: r.telefono,
        numeroCuenta: r.numeroCuenta,
        banco: r.banco,
        payId: r.payId,
        email: r.email,
        paymentCurrency: r.paymentCurrency,
        grossAmount: r.grossAmount,
        feeAmount: r.feeAmount,
        netAmount: r.netAmount,
        fechaValor: r.fechaValor,
        bcvRate: r.bcvRate,
        binanceRate: r.binanceRate,
        netoBs: r.netoBs,
        netoUsdt: r.netoUsdt,
        transactionCount: r.transactionCount,
        transactionIds: r.transactionIds,
        referralReference: r.referralReference,
      })),
    }

    if (format === 'csv' || format === 'excel') {
      const headers = [
        'Fuente', 'Miembro', 'Metodo de cobro', 'Cuenta/Direccion',
        'Titular', 'Cedula', 'Telefono', 'N° Cuenta', 'Banco', 'Pay ID', 'Email',
        'Moneda de pago', 'Bruto (USD)', 'Comision plataforma', 'Neto a pagar',
        'Fecha valor', 'Tasa BCV', 'Tasa Binance', 'Neto a pagar (Bs)', 'Neto a pagar (USDT)',
        'Num. TX', 'IDs Transacciones', 'Referencia'
      ]
      const csvRows = rows.map(r => [
        `"${r.source === 'referral' ? 'Drop Social' : 'Venta'}"`,
        `"${r.sellerName}"`,
        `"${r.payoutMethodType}"`,
        `"${r.payoutAccount}"`,
        `"${r.titular}"`,
        `"${r.cedula}"`,
        `"${r.telefono}"`,
        `"${r.numeroCuenta}"`,
        `"${r.banco}"`,
        `"${r.payId}"`,
        `"${r.email}"`,
        r.paymentCurrency,
        r.grossAmount.toFixed(2),
        r.feeAmount.toFixed(2),
        r.netAmount.toFixed(2),
        r.fechaValor || '',
        String(r.bcvRate),
        String(r.binanceRate),
        r.netoBs.toFixed(2),
        r.netoUsdt.toFixed(2),
        r.transactionCount,
        `"${r.transactionIds.join(';')}"`,
        `"${r.referralReference}"`,
      ].join(','))
      const csv = [headers.join(','), ...csvRows].join('\n')
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename=pagos-consolidados-${new Date().toISOString().slice(0, 10)}.csv`,
        },
      })
    }

    if (format === 'txt') {
      const txt = rows.map(r => {
        const source = r.source === 'referral' ? 'Drop Social' : 'Venta'
        return [
          `=== ${source}: ${r.sellerName} ===`,
          `Metodo: ${r.payoutMethodType} | Cuenta: ${r.payoutAccount}`,
          r.titular ? `Titular: ${r.titular} | CI: ${r.cedula}` : null,
          r.telefono ? `Telefono: ${r.telefono}` : null,
          r.banco ? `Banco: ${r.banco} | N° Cuenta: ${r.numeroCuenta}` : null,
          r.payId ? `Pay ID: ${r.payId}` : null,
          r.email ? `Email: ${r.email}` : null,
          `Moneda: ${r.paymentCurrency}`,
          `Bruto: $${r.grossAmount.toFixed(2)} | Fee: $${r.feeAmount.toFixed(2)} | Neto: $${r.netAmount.toFixed(2)}`,
          `Fecha valor: ${r.fechaValor || 'N/A'}`,
          `Tasa BCV: ${r.bcvRate || 'N/A'} | Tasa Binance: ${r.binanceRate || 'N/A'}`,
          `Neto Bs: ${r.netoBs.toFixed(2)} | Neto USDT: ${r.netoUsdt.toFixed(2)}`,
          `TXs (${r.transactionCount}): ${r.transactionIds.join(', ')}`,
          r.referralReference ? `Referencia: ${r.referralReference}` : null,
          '',
        ].filter(Boolean).join('\n')
      }).join('\n')
      return new NextResponse(txt, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename=pagos-consolidados-${new Date().toISOString().slice(0, 10)}.txt`,
        },
      })
    }

    return NextResponse.json(exportPayload)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error al exportar' }, { status: 500 })
  }
}
