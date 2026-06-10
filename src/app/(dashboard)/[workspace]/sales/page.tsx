import { auth } from '@/lib/auth'
import { getWorkspaceForAdminOrFail } from '@/lib/workspace'
import { redirect } from 'next/navigation'
import { ShieldAlert } from 'lucide-react'
import { SalesDebugClient } from '@/components/SalesDebugClient'

export const dynamic = 'force-dynamic'

interface SalesPageProps {
  params: Promise<{ workspace: string }>
}

export default async function SalesDebugPage({ params: paramsPromise }: SalesPageProps) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const { workspace: workspaceSlug } = await paramsPromise

  try {
    await getWorkspaceForAdminOrFail(workspaceSlug, session.user.id)
  } catch {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div
          className="flex flex-col items-center gap-3 rounded-xl border px-8 py-10 text-center"
          style={{ backgroundColor: '#111827', borderColor: '#1e293b' }}
        >
          <ShieldAlert className="w-10 h-10" style={{ color: '#ef4444' }} />
          <h1 className="text-lg font-semibold" style={{ color: '#f1f5f9' }}>
            Acesso restrito
          </h1>
          <p className="text-sm" style={{ color: '#64748b' }}>
            Apenas o proprietário do workspace ou administradores podem ver esta tela.
          </p>
        </div>
      </div>
    )
  }

  return <SalesDebugClient workspaceSlug={workspaceSlug} />
}
