import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function requireSuperAdmin() {
  const session = await auth()
  if (!session?.user) return null
  if ((session.user as any).role !== 'superadmin') return null
  return session
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireSuperAdmin()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const workspace = await prisma.workspace.findUnique({
    where: { id },
    include: {
      users: {
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      },
      adAccounts: { select: { id: true, name: true, platform: true, isActive: true, lastSyncedAt: true } },
      _count: { select: { sales: true, campaigns: true } },
    },
  })

  if (!workspace) {
    return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 })
  }

  return NextResponse.json(workspace)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireSuperAdmin()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const { name, planName, maxAdAccounts, timezone, currency } = body

  const data: Record<string, unknown> = {}
  if (name !== undefined) data.name = name
  if (planName !== undefined) data.planName = planName
  if (maxAdAccounts !== undefined) data.maxAdAccounts = Number(maxAdAccounts)
  if (timezone !== undefined) data.timezone = timezone
  if (currency !== undefined) data.currency = currency

  const workspace = await prisma.workspace.update({
    where: { id },
    data,
  })

  return NextResponse.json(workspace)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireSuperAdmin()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  await prisma.workspace.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
