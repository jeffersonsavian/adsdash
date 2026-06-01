import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getWorkspaceOrFail } from '@/lib/workspace'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function DELETE(
  req: NextRequest,
  { params: p }: { params: Promise<{ workspace: string; id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { workspace, id } = await p
    const ws = await getWorkspaceOrFail(workspace, session.user.id)

    const integration = await prisma.integration.findFirst({
      where: { id, workspaceId: ws.id },
    })
    if (!integration) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.integration.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
