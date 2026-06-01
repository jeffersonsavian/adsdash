import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiToken, unauthorized } from '../../_auth'

type Params = { params: Promise<{ id: string }> }

// GET /api/v1/workspaces/:id
export async function GET(request: NextRequest, { params }: Params) {
  if (!validateApiToken(request)) return unauthorized()

  const { id } = await params
  const workspace = await prisma.workspace.findUnique({
    where: { id },
    include: {
      users: {
        select: {
          role: true,
          user: { select: { id: true, name: true, email: true, role: true, isActive: true } },
        },
      },
      adAccounts: {
        select: { id: true, name: true, platform: true, isActive: true, tokenExpiresAt: true, lastSyncedAt: true },
      },
      _count: { select: { sales: true, campaigns: true, metrics: true } },
    },
  })

  if (!workspace) return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 })
  return NextResponse.json({ data: workspace })
}

// PATCH /api/v1/workspaces/:id — update plan, limits, name
export async function PATCH(request: NextRequest, { params }: Params) {
  if (!validateApiToken(request)) return unauthorized()

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
    select: {
      id: true, name: true, slug: true, planName: true, maxAdAccounts: true,
      timezone: true, currency: true, createdAt: true,
    },
  })

  return NextResponse.json({ data: workspace })
}

// DELETE /api/v1/workspaces/:id
export async function DELETE(request: NextRequest, { params }: Params) {
  if (!validateApiToken(request)) return unauthorized()

  const { id } = await params
  await prisma.workspace.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
