import 'server-only'

import { Client } from 'pg'

import type { CustomBundleSqlSession } from '@/lib/bookings/custom-bundle-persistence'

export interface OpenCustomBundlePaymentPgSessionInput {
  connectionString: string
}

export interface OpenCustomBundlePaymentPgSessionResult {
  session: CustomBundleSqlSession
  close(): Promise<void>
}

export async function openCustomBundlePaymentPgSession(
  input: OpenCustomBundlePaymentPgSessionInput,
): Promise<OpenCustomBundlePaymentPgSessionResult> {
  const client = new Client({
    connectionString: input.connectionString,
  })

  await client.connect()

  let closed = false
  const session: CustomBundleSqlSession = {
    transactionScope: 'single_connection',
    async query<Row = Record<string, unknown>>(
      sql: string,
      params: readonly unknown[] = [],
    ): Promise<{ rows: Row[]; rowCount: number | null }> {
      const result = (await client.query<Row>(sql, [...params])) as {
        rows: Row[]
        rowCount: number | null
      }
      return {
        rows: result.rows,
        rowCount: result.rowCount,
      }
    },
  }

  return {
    session,
    async close(): Promise<void> {
      if (closed) {
        return
      }

      closed = true
      await client.end()
    },
  }
}
