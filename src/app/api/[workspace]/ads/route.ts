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
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { workspace } = await paramsPromise
    const ws = await getWorkspaceOrFail(workspace, session.user.id)

    const { searchParams } = new URL(req.url)
    const dateStart = searchParams.get('dateStart') || '2024-01-01'
    const dateEnd = searchParams.get('dateEnd') || new Date().toISOString().split('T')[0]

    const ads = await prisma.$queryRaw<any[]>`
      SELECT
        a.id,
        a."externalId",
        a.name,
        a.status,
        s.name AS "adsetName",
        c.name AS "campaignName",
        COALESCE(SUM(CAST(m.spend AS FLOAT)), 0) AS spend,
        COALESCE(SUM(CAST(m.impressions AS BIGINT)), 0) AS impressions,
        COALESCE(SUM(CAST(m.clicks AS BIGINT)), 0) AS clicks,
        COALESCE(SUM(CAST(m.leads AS BIGINT)), 0) AS leads,
        COALESCE(SUM(CAST(m.purchases AS BIGINT)), 0) AS purchases,
        CASE WHEN COALESCE(SUM(CAST(m.leads AS BIGINT)), 0) > 0
          THEN (SUM(CAST(m.spend AS FLOAT)) / SUM(CAST(m.leads AS BIGINT)))
          ELSE NULL END AS cpl,
        CASE WHEN COALESCE(SUM(CAST(m.spend AS FLOAT)), 0) > 0
          THEN (SUM(CAST(m."conversionValue" AS FLOAT)) / SUM(CAST(m.spend AS FLOAT)))
          ELSE NULL END AS roas
      FROM ads a
      LEFT JOIN ad_sets s ON s.id = a."adSetId"
      LEFT JOIN campaigns c ON c.id = s."campaignId"
      LEFT JOIN ad_metrics m
        ON m."entityId" = a."externalId"
        AND m."entityType" = 'ad'
        AND m."workspaceId" = ${ws.id}
        AND m.date BETWEEN ${new Date(dateStart)} AND ${new Date(dateEnd)}
      WHERE a."workspaceId" = ${ws.id}
      GROUP BY a.id, a."externalId", a.name, a.status, s.name, c.name
      ORDER BY spend DESC NULLS LAST
    `

    return NextResponse.json({ ads })
  } catch (error: any) {
    console.error('Error fetching ads:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch ads' }, { status: 500 })
  }
}
