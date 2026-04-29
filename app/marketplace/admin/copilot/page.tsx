import { redirect } from 'next/navigation'
import { getSession } from '@/lib/marketplace/auth'
import { AdminCopilotClient } from '@/components/marketplace/admin/AdminCopilotClient'

export default async function AdminCopilotPage() {
  const session = await getSession()
  if (!session || session.role !== 'SUPER') {
    redirect('/marketplace')
  }

  return <AdminCopilotClient />
}
