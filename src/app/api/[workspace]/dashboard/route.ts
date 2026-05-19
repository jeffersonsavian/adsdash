import { auth } from '@/lib/auth'
import { getWorkspaceOrFail } from '@/lib/workspace'
import { prisma } from '@/lib/prisma'
import { periodPresets, getPreviousPeriod } from '@/lib/metrics'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ workspace: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { workspace: workspaceSlug } = await paramsPromise
    const workspace = await getWorkspaceOrFail(workspaceSlug, session.user.id)

    const { searchParams } = new URL(req.url)
    const dateStart =
      searchParams.get('dateStart') ?? periodPresets.last30Days().start
    const dateEnd = searchParams.get('dateEnd') ?? periodPresets.last30Days().end

    // Get previous period for comparison
    const prevPeriod = getPreviousPeriod(dateStart, dateEnd)

    // ===== CURRENT PERIOD =====
    // KPIs agregados do período atual
    const currentKpis = await prisma.adMetric.aggregate({
      where: {
        workspaceId: workspace.id,
        entityType: 'campaign',
        date: { gte: new Date(dateStart), lte: new Date(dateEnd) },
      },
      _sum: {
        spend: true,
        impressions: true,
        clicks: true,
        leads: true,
        purchases: true,
        conversionValue: true,
      },
    })

    // Evolução diária do período atual
    const currentDaily = await prisma.$queryRaw<
      Array<{
        date: Date
        spend: number
        leads: number
        purchases: number
        cpl: number
        roas: number
      }>
    >`
      SELECT
        date,
        SUM(CAST(spend AS FLOAT)) AS spend,
        SUM(CAST(leads AS INT)) AS leads,
        SUM(CAST(purchases AS INT)) AS purchases,
        CASE WHEN SUM(CAST(leads AS INT)) > 0
          THEN (SUM(CAST(spend AS FLOAT)) / SUM(CAST(leads AS INT))) ELSE 0 END AS cpl,
        CASE WHEN SUM(CAST(spend AS FLOAT)) > 0
          THEN (SUM(CAST("conversionValue" AS FLOAT)) / SUM(CAST(spend AS FLOAT))) ELSE 0 END AS roas
      FROM ad_metrics
      WHERE workspace_id = ${workspace.id}
        AND entity_type = 'campaign'
        AND date BETWEEN ${new Date(dateStart)} AND ${new Date(dateEnd)}
      GROUP BY date
      ORDER BY date ASC
    `

    // Campanhas rankeadas do período atual
    const currentCampaigns = await prisma.$queryRaw<
      Array<{
        id: string
        name: string
        status: string | null
        spend: number
        impressions: number
        clicks: number
        leads: number
        purchases: number
        cpl: number | null
        roas: number | null
      }>
    >`
      SELECT
        c.id,
        c.name,
        c.status,
        SUM(CAST(m.spend AS FLOAT)) AS spend,
        SUM(CAST(m.impressions AS INT)) AS impressions,
        SUM(CAST(m.clicks AS INT)) AS clicks,
        SUM(CAST(m.leads AS INT)) AS leads,
        SUM(CAST(m.purchases AS INT)) AS purchases,
        CASE WHEN SUM(CAST(m.leads AS INT)) > 0
          THEN (SUM(CAST(m.spend AS FLOAT)) / SUM(CAST(m.leads AS INT))) ELSE NULL END AS cpl,
        CASE WHEN SUM(CAST(m.spend AS FLOAT)) > 0
          THEN (SUM(CAST(m."conversionValue" AS FLOAT)) / SUM(CAST(m.spend AS FLOAT))) ELSE NULL END AS roas
      FROM ad_metrics m
      JOIN campaigns c ON c."externalId" = m."externalEntityId"
        AND c."workspaceId" = ${workspace.id}
      WHERE m.workspace_id = ${workspace.id}
        AND m.entity_type = 'campaign'
        AND m.date BETWEEN ${new Date(dateStart)} AND ${new Date(dateEnd)}
      GROUP BY c.id, c.name, c.status
      ORDER BY spend DESC
      LIMIT 10
    `

    // ===== PREVIOUS PERIOD =====
    // KPIs agregados do período anterior para comparativo
    const previousKpis = await prisma.adMetric.aggregate({
      where: {
        workspaceId: workspace.id,
        entityType: 'campaign',
        date: {
          gte: new Date(prevPeriod.start),
          lte: new Date(prevPeriod.end),
        },
      },
      _sum: {
        spend: true,
        impressions: true,
        clicks: true,
        leads: true,
        purchases: true,
        conversionValue: true,
      },
    })

    return NextResponse.json({
      period: {
        start: dateStart,
        end: dateEnd,
      },
      previousPeriod: {
        start: prevPeriod.start,
        end: prevPeriod.end,
      },
      kpis: {
        current: currentKpis._sum,
        previous: previousKpis._sum,
      },
      daily: currentDaily,
      campaigns: currentCampaigns,
    })
  } catch (error: any) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
