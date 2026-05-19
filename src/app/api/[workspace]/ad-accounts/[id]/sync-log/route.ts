import { auth } from '@/lib/auth'
import { getWorkspaceOrFail } from '@/lib/workspace'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspace: string; id: string }> }
) {
  const { workspace: workspaceSlug, id } = await params
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspace = await getWorkspaceOrFail(workspaceSlug, session.user.id)

    // Verify account exists and belongs to workspace
    const account = await prisma.adAccount.findFirst({
      where: { id, workspaceId: workspace.id },
    })

    if (!account) {
      return NextResponse.json({ error: 'Ad account not found' }, { status: 404 })
    }

    // Get the latest sync log
    const syncLog = await prisma.syncLog.findFirst({
      where: { adAccountId: account.id },
      orderBy: { startedAt: 'desc' },
      select: {
        id: true,
        status: true,
        recordsSynced: true,
        durationMs: true,
        finishedAt: true,
        errorMessage: true,
      },
    })

    return NextResponse.json(syncLog)
  } catch (error: any) {
    console.error('Error fetching sync log:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sync log' },
      { status: 500 }
    )
  }
}
