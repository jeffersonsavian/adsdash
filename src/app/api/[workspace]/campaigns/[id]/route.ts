import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getWorkspaceOrFail } from '@/lib/workspace'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  req: Request,
  { params: paramsPromise }: { params: Promise<{ workspace: string; id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { workspace, id } = await paramsPromise
    const workspaceRecord = await getWorkspaceOrFail(workspace, session.user.id)

    const { searchParams } = new URL(req.url)
    const dateStart = searchParams.get('dateStart') || '2024-01-01'
    const dateEnd = searchParams.get('dateEnd') || new Date().toISOString().split('T')[0]

    // Get campaign
    const campaign = await prisma.campaign.findUnique({
      where: { id },
    })

    if (!campaign || campaign.workspaceId !== workspaceRecord.id) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Get ad sets with metrics
    const adSets = await prisma.$queryRaw`
      SELECT
        s.id,
        s."externalId",
        s.name,
        s.status,
        s."dailyBudget",
        SUM(m.spend)::float AS spend,
        SUM(m.impressions)::int AS impressions,
        SUM(m.clicks)::int AS clicks,
        SUM(m.leads)::int AS leads,
        SUM(m.purchases)::int AS purchases,
        SUM(m."conversionValue")::float AS "conversionValue",
        CASE WHEN SUM(m.leads) > 0
          THEN (SUM(m.spend) / SUM(m.leads))::float ELSE NULL END AS cpl,
        CASE WHEN SUM(m.purchases) > 0
          THEN (SUM(m.spend) / SUM(m.purchases))::float ELSE NULL END AS cpa,
        CASE WHEN SUM(m.spend) > 0
          THEN (SUM(m."conversionValue") / SUM(m.spend))::float ELSE NULL END AS roas
      FROM ad_sets s
      LEFT JOIN ad_metrics m ON m."entityId" = s."externalId"
        AND m."entityType" = 'adset'
        AND m."workspaceId" = ${workspaceRecord.id}
      WHERE s."campaignId" = ${campaign.id}
        AND m.date BETWEEN ${new Date(dateStart)} AND ${new Date(dateEnd)}
      GROUP BY s.id, s."externalId", s.name, s.status, s."dailyBudget"
      ORDER BY spend DESC NULLS LAST
    `

    // Get ads with metrics
    const ads = await prisma.$queryRaw`
      SELECT
        a.id,
        a."externalId",
        a.name,
        a.status,
        a."creativeType",
        a."thumbnailUrl",
        SUM(m.spend)::float AS spend,
        SUM(m.impressions)::int AS impressions,
        SUM(m.clicks)::int AS clicks,
        SUM(m.leads)::int AS leads,
        SUM(m.purchases)::int AS purchases,
        SUM(m."conversionValue")::float AS "conversionValue",
        CASE WHEN SUM(m.leads) > 0
          THEN (SUM(m.spend) / SUM(m.leads))::float ELSE NULL END AS cpl,
        CASE WHEN SUM(m.purchases) > 0
          THEN (SUM(m.spend) / SUM(m.purchases))::float ELSE NULL END AS cpa,
        CASE WHEN SUM(m.spend) > 0
          THEN (SUM(m."conversionValue") / SUM(m.spend))::float ELSE NULL END AS roas
      FROM ads a
      JOIN ad_sets s ON a."adSetId" = s.id
      LEFT JOIN ad_metrics m ON m."entityId" = a."externalId"
        AND m."entityType" = 'ad'
        AND m."workspaceId" = ${workspaceRecord.id}
      WHERE s."campaignId" = ${campaign.id}
        AND m.date BETWEEN ${new Date(dateStart)} AND ${new Date(dateEnd)}
      GROUP BY a.id, a."externalId", a.name, a.status, a."creativeType", a."thumbnailUrl"
      ORDER BY spend DESC NULLS LAST
    `

    return NextResponse.json({
      campaign,
      adSets,
      ads,
    })
  } catch (error) {
    console.error('Error fetching campaign detail:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaign detail' },
      { status: 500 }
    )
  }
}
