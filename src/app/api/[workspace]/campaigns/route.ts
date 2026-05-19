import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getWorkspaceOrFail } from '@/lib/workspace'
import { NextResponse } from 'next/server'

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
    const workspaceRecord = await getWorkspaceOrFail(workspace, session.user.id)

    const { searchParams } = new URL(req.url)
    const dateStart = searchParams.get('dateStart') || '2024-01-01'
    const dateEnd = searchParams.get('dateEnd') || new Date().toISOString().split('T')[0]

    // Get campaigns with aggregated metrics
    const campaigns = await prisma.$queryRaw`
      SELECT
        c.id,
        c."externalId",
        c.name,
        c.status,
        c.objective,
        c."dailyBudget",
        c."lifetimeBudget",
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
      FROM campaigns c
      LEFT JOIN ad_metrics m ON m."entityId" = c."externalId"
        AND m."entityType" = 'campaign'
        AND m."workspaceId" = ${workspaceRecord.id}
      WHERE c."workspaceId" = ${workspaceRecord.id}
        AND m.date BETWEEN ${new Date(dateStart)} AND ${new Date(dateEnd)}
      GROUP BY c.id, c."externalId", c.name, c.status, c.objective, c."dailyBudget", c."lifetimeBudget"
      ORDER BY spend DESC NULLS LAST
    `

    return NextResponse.json({ campaigns })
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    )
  }
}
