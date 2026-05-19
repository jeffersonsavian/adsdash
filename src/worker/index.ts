import { Worker } from 'bullmq'
import { connection } from '@/lib/queue'
import { syncMetaAccount } from '@/jobs/sync-meta'

const worker = new Worker(
  'sync-meta',
  async (job) => {
    const { adAccountId, dateStart, dateEnd } = job.data

    console.log(`[Worker] Starting sync for account ${adAccountId}`)

    const result = await syncMetaAccount({
      adAccountId,
      dateStart,
      dateEnd,
    })

    console.log(
      `[Worker] Sync completed: status=${result.status}, records=${result.recordsSynced}, duration=${result.durationMs}ms`
    )

    if (result.status === 'error') {
      throw new Error(result.errorMessage)
    }

    return result
  },
  { connection, concurrency: 3 }
)

worker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed`)
})

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message)
})

console.log('[Worker] AdsDash worker iniciado')

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Worker] SIGTERM received, shutting down...')
  await worker.close()
  process.exit(0)
})
