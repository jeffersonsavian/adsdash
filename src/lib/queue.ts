import { Queue } from 'bullmq'
import Redis from 'ioredis'

export const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
})

export const syncQueue = new Queue('sync-meta', { connection })

export interface SyncJobPayload {
  adAccountId: string
  dateStart: string
  dateEnd: string
}

// Adicionar job de sync
export async function enqueueSyncJob(payload: SyncJobPayload) {
  await syncQueue.add('sync', payload, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  })
}
