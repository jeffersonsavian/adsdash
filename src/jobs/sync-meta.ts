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

    // Criar SyncLog
    const log = await prisma.syncLog.create({
      data: {
        workspaceId: account.workspaceId,
        adAccountId: account.id,
        platform: 'meta',
        status: 'success',
        dateRangeStart: new Date(dateStart),
        dateRangeEnd: new Date(dateEnd),
      },
    })

    try {
      const accessToken = decrypt(account.accessToken)

      // Sync em três níveis: campaign, adset, ad
      for (const level of ['campaign', 'adset', 'ad'] as const) {
        const rows = await fetchInsights({
          accessToken,
          accountId: account.externalAccountId,
          dateStart,
          dateEnd,
          level,
        })

        for (const row of rows) {
          const normalized = normalizeInsightRow(row, level)

          // Prepare data for database (exclude rawData for now, extract only JSON-compatible fields)
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

      // Atualizar SyncLog com sucesso
      await prisma.syncLog.update({
        where: { id: log.id },
        data: {
          status: 'success',
          recordsSynced,
          durationMs: Date.now() - startedAt,
          finishedAt: new Date(),
        },
      })

      // Atualizar lastSyncedAt da conta
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
      // Atualizar SyncLog com erro
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
