import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getWorkspaceOrFail } from '@/lib/workspace'
import { encrypt } from '@/lib/crypto'

type Params = { params: Promise<{ workspace: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { workspace: slug } = await params
  const workspace = await getWorkspaceOrFail(slug, session.user.id)

  const adAccountCount = await prisma.adAccount.count({ where: { workspaceId: workspace.id } })

  return NextResponse.json({
    metaAppId: workspace.metaAppId ?? null,
    metaAppConfigured: !!(workspace.metaAppId && workspace.metaAppSecret),
    planName: workspace.planName,
    maxAdAccounts: workspace.maxAdAccounts,
    adAccountCount,
  })
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { workspace: slug } = await params
  const workspace = await getWorkspaceOrFail(slug, session.user.id)

  // Only workspace owners can update settings
  const role = await prisma.workspaceUser.findUnique({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: session.user.id } },
    select: { role: true },
  })
  const isSuperAdmin = (session.user as any).role === 'superadmin'
  if (!isSuperAdmin && role?.role !== 'owner') {
    return NextResponse.json({ error: 'Apenas owners podem alterar configurações' }, { status: 403 })
  }

  const body = await request.json()
  const { metaAppId, metaAppSecret } = body

  // Validate: if one is set, both must be set
  if ((metaAppId && !metaAppSecret) || (!metaAppId && metaAppSecret)) {
    return NextResponse.json(
      { error: 'metaAppId e metaAppSecret devem ser fornecidos juntos' },
      { status: 400 }
    )
  }

  const data: Record<string, unknown> = {}

  if (metaAppId === null || metaAppId === '') {
    // Clear Meta App
    data.metaAppId = null
    data.metaAppSecret = null
  } else if (metaAppId && metaAppSecret) {
    data.metaAppId = metaAppId
    data.metaAppSecret = encrypt(metaAppSecret)
  }

  await prisma.workspace.update({ where: { id: workspace.id }, data })

  return NextResponse.json({ success: true })
}
