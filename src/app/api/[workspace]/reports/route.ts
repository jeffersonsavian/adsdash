import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getWorkspaceOrFail } from '@/lib/workspace'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function escapeCsvField(field: string | number | null | undefined): string {
  if (field == null) return ''
  let str = String(field)
  // Prevent CSV formula injection: neutralize leading =,+,-,@,tab,CR
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`
  }
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

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
    const workspaceRecord = await getWorkspaceOrFail(workspace, session.user.id)

    const { searchParams } = new URL(req.url)
    const dateStart = searchParams.get('dateStart') || '2024-01-01'
    const dateEnd = searchParams.get('dateEnd') || new Date().toISOString().split('T')[0]
    const entityType = searchParams.get('entityType') || 'campaign'

    // Fetch metrics for the period
    const metrics = await prisma.adMetric.findMany({
      where: {
        workspaceId: workspaceRecord.id,
        entityType,
        date: {
          gte: new Date(dateStart),
          lte: new Date(dateEnd),
        },
      },
      orderBy: { date: 'asc' },
    })

    // Build CSV headers
    const headers = [
      'Data',
      'Entidade',
      'Impressões',
      'Alcance',
      'Cliques',
      'Gasto',
      'CPM',
      'CPC',
      'CTR',
      'Leads',
      'Conversões',
      'Valor de Conversão',
      'CPL',
      'CPA',
      'ROAS',
    ]

    // Build CSV rows
    const rows: string[] = []
    for (const metric of metrics) {
      rows.push([
        new Date(metric.date).toISOString().split('T')[0],
        metric.entityId,
        metric.impressions,
        metric.reach,
        metric.clicks,
        metric.spend.toFixed(2),
        metric.cpm?.toFixed(4) || '',
        metric.cpc?.toFixed(4) || '',
        metric.ctr?.toFixed(4) || '',
        metric.leads,
        metric.purchases,
        metric.conversionValue.toFixed(2),
        metric.cpl?.toFixed(2) || '',
        metric.cpa?.toFixed(2) || '',
        metric.roas?.toFixed(4) || '',
      ].map(escapeCsvField).join(','))
    }

    // Build final CSV
    const csv = [headers.join(','), ...rows].join('\n')

    // Return as file download
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="relatorio-${new Date()
          .toISOString()
          .split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}
