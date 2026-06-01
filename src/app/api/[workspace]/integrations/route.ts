import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getWorkspaceOrFail } from '@/lib/workspace'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params: p }: { params: Promise<{ workspace: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { workspace } = await p
    const ws = await getWorkspaceOrFail(workspace, session.user.id)

    const integrations = await prisma.integration.findMany({
      where: { workspaceId: ws.id },
      select: {
        id: true, platform: true, name: true, isActive: true, createdAt: true,
        _count: { select: { sales: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ integrations })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params: p }: { params: Promise<{ workspace: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { workspace } = await p
    const ws = await getWorkspaceOrFail(workspace, session.user.id)

    const body = await req.json()
    const { platform, webhookToken, name } = body

    if (!platform || !webhookToken) {
      return NextResponse.json({ error: 'platform e webhookToken são obrigatórios' }, { status: 400 })
    }
    if (!['kiwify', 'hotmart'].includes(platform)) {
      return NextResponse.json({ error: 'Plataforma inválida' }, { status: 400 })
    }

    const integration = await prisma.integration.create({
      data: { workspaceId: ws.id, platform, webhookToken, name: name || null },
    })

    return NextResponse.json(integration, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
