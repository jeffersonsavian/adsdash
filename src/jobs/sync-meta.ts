import { prisma } from '@/lib/prisma'
import { fetchInsights, normalizeInsightRow } from '@/lib/meta-api'
import { decrypt } from '@/lib/crypto'

export interface SyncMetaPayload {
  adAccountId: string
  dateStart: string
  dateEnd: string
}

export interface SyncMetaResult {
  recordsSynced: number
  durationMs: number
  status: 'success' | 'error' | 'partial'
  errorMessage?: string
}

export async function syncMetaAccount(
  payload: SyncMetaPayload
): Promise<SyncMetaResult> {
  const { adAccountId, dateStart, dateEnd } = payload
  const startedAt = Date.now()
  let recordsSynced = 0

  try {
    const account = await prisma.adAccount.findUniqueOrThrow({
      where: { id: adAccountId },
    })

    const log = await prisma.syncLog.create({
      data: {
        workspaceId: account.workspaceId,
        adAccountId: account.id,
        platform: 'meta',
        status: 'running',
        dateRangeStart: new Date(dateStart),
        dateRangeEnd: new Date(dateEnd),
      },
    })

    try {
      const accessToken = decrypt(account.accessToken)

      // Maps externalId → internalId para evitar lookups repetidos
      const campaignIdMap = new Map<string, string>()
      const adsetIdMap = new Map<string, string>()

      for (const level of ['campaign', 'adset', 'ad'] as const) {
        const rows = await fetchInsights({
          accessToken,
          accountId: account.externalAccountId,
          dateStart,
          dateEnd,
          level,
        })

        for (const row of rows) {
          // ── Upsert Campaign ──────────────────────────────────────────
          if (level === 'campaign' && row.campaign_id && row.campaign_name) {
            const campaign = await prisma.campaign.upsert({
              where: {
                adAccountId_externalId: {
                  adAccountId: account.id,
                  externalId: row.campaign_id,
                },
              },
              update: { name: row.campaign_name },
              create: {
                workspaceId: account.workspaceId,
                adAccountId: account.id,
                externalId: row.campaign_id,
                platform: 'meta',
                name: row.campaign_name,
              },
            })
            campaignIdMap.set(row.campaign_id, campaign.id)
          }

          // ── Upsert AdSet ─────────────────────────────────────────────
          if (level === 'adset' && row.adset_id && row.adset_name) {
            let internalCampaignId = row.campaign_id
              ? campaignIdMap.get(row.campaign_id)
              : undefined

            if (!internalCampaignId && row.campaign_id) {
              const c = await prisma.campaign.findFirst({
                where: { adAccountId: account.id, externalId: row.campaign_id },
              })
              if (c) {
                internalCampaignId = c.id
                campaignIdMap.set(row.campaign_id, c.id)
              }
            }

            if (internalCampaignId) {
              const adset = await prisma.adSet.upsert({
                where: {
                  campaignId_externalId: {
                    campaignId: internalCampaignId,
                    externalId: row.adset_id,
                  },
                },
                update: { name: row.adset_name },
                create: {
                  workspaceId: account.workspaceId,
                  campaignId: internalCampaignId,
                  externalId: row.adset_id,
                  name: row.adset_name,
                },
              })
              adsetIdMap.set(row.adset_id, adset.id)
            }
          }

          // ── Upsert Ad ────────────────────────────────────────────────
          if (level === 'ad' && row.ad_id && row.ad_name) {
            let internalAdsetId = row.adset_id
              ? adsetIdMap.get(row.adset_id)
              : undefined

            if (!internalAdsetId && row.adset_id) {
              let internalCampaignId = row.campaign_id
                ? campaignIdMap.get(row.campaign_id)
                : undefined

              if (!internalCampaignId && row.campaign_id) {
                const c = await prisma.campaign.findFirst({
                  where: { adAccountId: account.id, externalId: row.campaign_id },
                })
                if (c) internalCampaignId = c.id
              }

              if (internalCampaignId) {
                const adset = await prisma.adSet.findFirst({
                  where: {
                    campaignId: internalCampaignId,
                    externalId: row.adset_id,
                  },
                })
                if (adset) {
                  internalAdsetId = adset.id
                  adsetIdMap.set(row.adset_id, adset.id)
                }
              }
            }

            if (internalAdsetId) {
              await prisma.ad.upsert({
                where: {
                  adSetId_externalId: {
                    adSetId: internalAdsetId,
                    externalId: row.ad_id,
                  },
                },
                update: { name: row.ad_name },
                create: {
                  workspaceId: account.workspaceId,
                  adSetId: internalAdsetId,
                  externalId: row.ad_id,
                  name: row.ad_name,
                },
              })
            }
          }

          // ── Upsert AdMetric ──────────────────────────────────────────
          const normalized = normalizeInsightRow(row, level)
          const { rawData, ...dbData } = normalized

          await prisma.adMetric.upsert({
            where: {
              entityType_entityId_date_platform: {
                entityType: normalized.entityType,
                entityId: normalized.externalEntityId,
                date: normalized.date,
                platform: normalized.platform,
              },
            },
            update: dbData,
            create: {
              ...dbData,
              workspaceId: account.workspaceId,
              adAccountId: account.id,
              entityId: normalized.externalEntityId,
              rawData: rawData as any,
            },
          })

          recordsSynced++
        }
      }

      await prisma.syncLog.update({
        where: { id: log.id },
        data: {
          status: 'success',
          recordsSynced,
          durationMs: Date.now() - startedAt,
          finishedAt: new Date(),
        },
      })

      await prisma.adAccount.update({
        where: { id: adAccountId },
        data: { lastSyncedAt: new Date() },
      })

      return {
        recordsSynced,
        durationMs: Date.now() - startedAt,
        status: 'success',
      }
    } catch (err: any) {
      await prisma.syncLog.update({
        where: { id: log.id },
        data: {
          status: 'error',
          errorMessage: err.message,
          durationMs: Date.now() - startedAt,
          finishedAt: new Date(),
        },
      })

      return {
        recordsSynced,
        durationMs: Date.now() - startedAt,
        status: 'error',
        errorMessage: err.message,
      }
    }
  } catch (err: any) {
    return {
      recordsSynced: 0,
      durationMs: Date.now() - startedAt,
      status: 'error',
      errorMessage: err.message,
    }
  }
}
