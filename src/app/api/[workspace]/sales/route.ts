import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getWorkspaceForAdminOrFail } from '@/lib/workspace'
import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(
  req: Request,
  { params: paramsPromise }: { params: Promise<{ workspace: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { workspace } = await paramsPromise

    let workspaceRecord
    try {
      const result = await getWorkspaceForAdminOrFail(workspace, session.user.id)
      workspaceRecord = result.workspace
    } catch {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const dateStart = searchParams.get('dateStart') || '2024-01-01'
    const dateEnd = searchParams.get('dateEnd') || new Date().toISOString().split('T')[0]
    const platform = searchParams.get('platform') || 'all'
    const status = searchParams.get('status') || 'all'
    const q = (searchParams.get('q') || '').trim()

    // Fim do dia para incluir vendas do próprio dateEnd
    const end = new Date(dateEnd)
    end.setHours(23, 59, 59, 999)

    const where: Prisma.SaleWhereInput = {
      workspaceId: workspaceRecord.id,
      saleDate: { gte: new Date(dateStart), lte: end },
    }

    if (platform !== 'all') where.platform = platform
    if (status !== 'all') where.status = status
    if (q) {
      where.OR = [
        { customerEmail: { contains: q, mode: 'insensitive' } },
        { productName: { contains: q, mode: 'insensitive' } },
        { externalId: { contains: q, mode: 'insensitive' } },
      ]
    }

    const [sales, statusGroups] = await Promise.all([
      prisma.sale.findMany({
        where,
        orderBy: { saleDate: 'desc' },
        take: 200,
      }),
      prisma.sale.groupBy({
        by: ['status'],
        where: {
          workspaceId: workspaceRecord.id,
          saleDate: { gte: new Date(dateStart), lte: end },
          ...(platform !== 'all' ? { platform } : {}),
        },
        _count: { _all: true },
      }),
    ])

    const summary = statusGroups.reduce<Record<string, number>>((acc, g) => {
      acc[g.status] = g._count._all
      return acc
    }, {})

    return NextResponse.json({ sales, summary })
  } catch (error) {
    console.error('Error fetching sales:', error)
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 })
  }
}
