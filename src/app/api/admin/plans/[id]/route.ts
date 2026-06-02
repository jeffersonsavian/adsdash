import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/admin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireSuperAdmin()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const { name, description, maxAdAccounts, price, isActive } = body

  const data: Record<string, unknown> = {}
  if (name !== undefined) data.name = name
  if (description !== undefined) data.description = description || null
  if (maxAdAccounts !== undefined) data.maxAdAccounts = Number(maxAdAccounts)
  if (price !== undefined) data.price = price === null || price === '' ? null : Number(price)
  if (isActive !== undefined) data.isActive = Boolean(isActive)

  const plan = await prisma.plan.update({ where: { id }, data })

  // Mantém os workspaces vinculados em sincronia com o novo limite/nome
  if (data.maxAdAccounts !== undefined || data.name !== undefined) {
    await prisma.workspace.updateMany({
      where: { planId: id },
      data: {
        ...(data.name !== undefined && { planName: plan.name }),
        ...(data.maxAdAccounts !== undefined && { maxAdAccounts: plan.maxAdAccounts }),
      },
    })
  }

  return NextResponse.json(plan)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireSuperAdmin()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  const linked = await prisma.workspace.count({ where: { planId: id } })
  if (linked > 0) {
    return NextResponse.json(
      { error: `Não é possível excluir: ${linked} workspace(s) usam este plano` },
      { status: 400 }
    )
  }

  await prisma.plan.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
