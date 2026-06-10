import { auth } from '@/lib/auth'
import { getWorkspaceOrFail, getWorkspaceWithRoleOrFail } from '@/lib/workspace'
import { prisma } from '@/lib/prisma'
import { enqueueSyncJob } from '@/lib/queue'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspace: string; id: string }> }
) {
  const { workspace: workspaceSlug, id } = await params
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let workspace
    try {
      workspace = await getWorkspaceWithRoleOrFail(workspaceSlug, session.user.id, ['owner', 'manager'])
    } catch (err: any) {
      return NextResponse.json(
        { error: err.code === 'INSUFFICIENT_ROLE' ? 'Acesso negado' : err.message },
        { status: err.code === 'INSUFFICIENT_ROLE' ? 403 : 500 }
      )
    }

    const account = await prisma.adAccount.findFirst({
      where: { id, workspaceId: workspace.id },
    })

    if (!account) {
      return NextResponse.json({ error: 'Ad account not found' }, { status: 404 })
    }

    // Get date range from body or use default (last 30 days)
    const body = await req.json().catch(() => ({}))
    const today = new Date()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(today.getDate() - 30)

    const dateStart = body.dateStart || thirtyDaysAgo.toISOString().split('T')[0]
    const dateEnd = body.dateEnd || today.toISOString().split('T')[0]

    // Enqueue the sync job
    await enqueueSyncJob({
      adAccountId: account.id,
      dateStart,
      dateEnd,
    })

    return NextResponse.json(
      {
        success: true,
        message: `Sync job enqueued for ${dateStart} to ${dateEnd}`,
      },
      { status: 202 }
    )
  } catch (error: any) {
    console.error('Error enqueueing sync job:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to enqueue sync job' },
      { status: 500 }
    )
  }
}
