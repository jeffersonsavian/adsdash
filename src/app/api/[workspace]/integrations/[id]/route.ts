import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getWorkspaceWithRoleOrFail } from '@/lib/workspace'
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

    let ws
    try {
      ws = await getWorkspaceWithRoleOrFail(workspace, session.user.id, ['owner', 'manager'])
    } catch (err: any) {
      return NextResponse.json(
        { error: err.code === 'INSUFFICIENT_ROLE' ? 'Acesso negado' : err.message },
        { status: err.code === 'INSUFFICIENT_ROLE' ? 403 : 500 }
      )
    }

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
