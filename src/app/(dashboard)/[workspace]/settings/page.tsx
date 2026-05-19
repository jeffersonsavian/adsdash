import { auth } from '@/lib/auth'
import { getWorkspaceOrFail } from '@/lib/workspace'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { SettingsContent } from './settings-content'

export const dynamic = 'force-dynamic'

interface WorkspaceSettingsPageProps {
  params: Promise<{ workspace: string }>
}

export default async function WorkspaceSettingsPage({
  params: paramsPromise,
}: WorkspaceSettingsPageProps) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const { workspace: workspaceSlug } = await paramsPromise
  const workspace = await getWorkspaceOrFail(workspaceSlug, session.user.id)

  const adAccounts = await prisma.adAccount.findMany({
    where: { workspaceId: workspace.id },
    select: {
      id: true,
      externalAccountId: true,
      name: true,
      platform: true,
      isActive: true,
      lastSyncedAt: true,
      createdAt: true,
    },
  })

  return (
    <SettingsContent
      workspaceSlug={workspace.slug}
      workspaceName={workspace.name}
      workspaceTimezone={workspace.timezone}
      workspaceCurrency={workspace.currency}
      initialAdAccounts={adAccounts}
    />
  )
}
