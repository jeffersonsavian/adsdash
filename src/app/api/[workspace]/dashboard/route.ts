import { auth } from '@/lib/auth'
import { getWorkspaceOrFail } from '@/lib/workspace'
import { prisma } from '@/lib/prisma'
import { periodPresets, getPreviousPeriod } from '@/lib/metrics'
import { dayRangeUtc } from '@/lib/dates'
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

    // Sales date range with timezone conversion
    const saleDateRange = dayRangeUtc(dateStart, dateEnd, workspace.timezone)
    const prevSaleDateRange = dayRangeUtc(prevPeriod.start, prevPeriod.end, workspace.timezone)

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
        SUM(CAST(leads AS BIGINT)) AS leads,
        SUM(CAST(purchases AS BIGINT)) AS purchases,
        CASE WHEN SUM(CAST(leads AS BIGINT)) > 0
          THEN (SUM(CAST(spend AS FLOAT)) / SUM(CAST(leads AS BIGINT))) ELSE 0 END AS cpl,
        CASE WHEN SUM(CAST(spend AS FLOAT)) > 0
          THEN (SUM(CAST("conversionValue" AS FLOAT)) / SUM(CAST(spend AS FLOAT))) ELSE 0 END AS roas
      FROM ad_metrics
      WHERE "workspaceId" = ${workspace.id}
        AND "entityType" = 'campaign'
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
        SUM(CAST(m.impressions AS BIGINT)) AS impressions,
        SUM(CAST(m.clicks AS BIGINT)) AS clicks,
        SUM(CAST(m.leads AS BIGINT)) AS leads,
        SUM(CAST(m.purchases AS BIGINT)) AS purchases,
        CASE WHEN SUM(CAST(m.leads AS BIGINT)) > 0
          THEN (SUM(CAST(m.spend AS FLOAT)) / SUM(CAST(m.leads AS BIGINT))) ELSE NULL END AS cpl,
        CASE WHEN SUM(CAST(m.spend AS FLOAT)) > 0
          THEN (SUM(CAST(m."conversionValue" AS FLOAT)) / SUM(CAST(m.spend AS FLOAT))) ELSE NULL END AS roas
      FROM ad_metrics m
      JOIN campaigns c ON c."externalId" = m."externalEntityId"
        AND c."workspaceId" = ${workspace.id}
      WHERE m."workspaceId" = ${workspace.id}
        AND m."entityType" = 'campaign'
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

    // ===== SALES KPIs — CURRENT PERIOD =====
    // Faturamento considera apenas vendas pagas
    const currentSalesKpis = await prisma.sale.aggregate({
      where: {
        workspaceId: workspace.id,
        saleDate: { gte: saleDateRange.gte, lte: saleDateRange.lte },
        status: 'paid',
      },
      _sum: { grossAmount: true, netAmount: true },
      _count: { id: true },
    })

    const paidSalesCount = currentSalesKpis._count.id

    const refundedSalesData = await prisma.sale.aggregate({
      where: {
        workspaceId: workspace.id,
        saleDate: { gte: saleDateRange.gte, lte: saleDateRange.lte },
        status: 'refunded',
      },
      _sum: { netAmount: true },
      _count: { id: true },
    })

    // Calculate real ROAS: netAmount (in cents) / 100 / spend (in reals)
    const currentSpendReals = Number(currentKpis._sum.spend ?? 0)
    const currentNetReais = (Number(currentSalesKpis._sum.netAmount ?? 0)) / 100
    const currentRealRoas = currentSpendReals > 0 ? currentNetReais / currentSpendReals : 0

    // ===== SALES KPIs — PREVIOUS PERIOD =====
    const prevSalesKpis = await prisma.sale.aggregate({
      where: {
        workspaceId: workspace.id,
        saleDate: { gte: prevSaleDateRange.gte, lte: prevSaleDateRange.lte },
        status: 'paid',
      },
      _sum: { grossAmount: true, netAmount: true },
      _count: { id: true },
    })

    const prevRefunded = await prisma.sale.aggregate({
      where: {
        workspaceId: workspace.id,
        saleDate: { gte: prevSaleDateRange.gte, lte: prevSaleDateRange.lte },
        status: 'refunded',
      },
      _sum: { netAmount: true },
      _count: { id: true },
    })

    const prevSpendReals = Number(previousKpis._sum.spend ?? 0)
    const prevNetReais = (Number(prevSalesKpis._sum.netAmount ?? 0)) / 100
    const prevRealRoas = prevSpendReals > 0 ? prevNetReais / prevSpendReals : 0

    // ===== SALES BY CAMPAIGN =====
    const salesByCampaign = await prisma.sale.groupBy({
      by: ['metaCampaignId'],
      where: {
        workspaceId: workspace.id,
        saleDate: { gte: saleDateRange.gte, lte: saleDateRange.lte },
        status: 'paid',
      },
      _sum: { netAmount: true },
      _count: { id: true },
    })

    // Map sales to campaigns by metaCampaignId
    const salesByMetaCampaignId = new Map<string, { count: number; revenueNet: number }>()
    for (const sale of salesByCampaign) {
      if (sale.metaCampaignId) {
        const existing = salesByMetaCampaignId.get(sale.metaCampaignId) || { count: 0, revenueNet: 0 }
        salesByMetaCampaignId.set(sale.metaCampaignId, {
          count: existing.count + (sale._count.id || 0),
          revenueNet: existing.revenueNet + (Number(sale._sum.netAmount ?? 0)) / 100,
        })
      }
    }

    // Enhance campaigns with sales data
    const campaignsWithSales = currentCampaigns.map(c => {
      const salesData = salesByMetaCampaignId.get(c.id) || { count: 0, revenueNet: 0 }
      const realRoas = salesData.revenueNet > 0 && Number(c.spend) > 0
        ? salesData.revenueNet / Number(c.spend)
        : null
      return {
        ...c,
        salesCount: salesData.count,
        revenueNet: salesData.revenueNet,
        realRoas,
      }
    })

    // ===== DAILY REVENUE =====
    // Agrupa por dia no fuso do workspace (saleDate é timestamp em UTC)
    const currentDailyRevenue = await prisma.$queryRaw<
      Array<{ day: Date; revenueNet: number }>
    >`
      SELECT
        (("saleDate" AT TIME ZONE 'UTC') AT TIME ZONE ${workspace.timezone})::date AS day,
        SUM(CAST("netAmount" AS BIGINT)) / 100.0 AS "revenueNet"
      FROM sales
      WHERE "workspaceId" = ${workspace.id}
        AND status = 'paid'
        AND "saleDate" >= ${saleDateRange.gte}
        AND "saleDate" <= ${saleDateRange.lte}
      GROUP BY day
      ORDER BY day ASC
    `

    // Merge daily revenue into daily metrics
    const dailyRevenueMap = new Map<string, number>()
    for (const row of currentDailyRevenue) {
      const dateStr = new Date(row.day).toISOString().split('T')[0]
      dailyRevenueMap.set(dateStr, Number(row.revenueNet))
    }

    const currentDailyWithRevenue = currentDaily.map(d => {
      const dateStr = new Date(d.date).toISOString().split('T')[0]
      return {
        ...d,
        revenue: dailyRevenueMap.get(dateStr) ?? 0,
      }
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
        current: {
          ...currentKpis._sum,
          salesKpis: {
            revenueGross: Number(currentSalesKpis._sum.grossAmount ?? 0) / 100,
            revenueNet: currentNetReais,
            salesCount: paidSalesCount,
            refundedCount: refundedSalesData._count.id,
            refundedAmount: (Number(refundedSalesData._sum.netAmount ?? 0)) / 100,
            realRoas: currentRealRoas,
          },
        },
        previous: {
          ...previousKpis._sum,
          salesKpis: {
            revenueGross: Number(prevSalesKpis._sum.grossAmount ?? 0) / 100,
            revenueNet: prevNetReais,
            salesCount: prevSalesKpis._count.id,
            refundedCount: prevRefunded._count.id,
            refundedAmount: (Number(prevRefunded._sum.netAmount ?? 0)) / 100,
            realRoas: prevRealRoas,
          },
        },
      },
      daily: currentDailyWithRevenue,
      campaigns: campaignsWithSales,
    })
  } catch (error: any) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
