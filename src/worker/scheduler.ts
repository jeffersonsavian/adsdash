import 'dotenv/config'
import { prisma } from '@/lib/prisma'
import { enqueueSyncJob } from '@/lib/queue'
import { refreshMetaToken } from '@/jobs/refresh-meta-token'

async function scheduleDaily() {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const date = yesterday.toISOString().split('T')[0]

  const accounts = await prisma.adAccount.findMany({
    where: { isActive: true, platform: 'meta' },
  })

  // Refresh tokens expiring in the next 7 days before syncing
  const sevenDaysFromNow = new Date(Date.now() + 7 * 86400 * 1000)
  const expiringSoon = accounts.filter(
    a => a.tokenExpiresAt && a.tokenExpiresAt <= sevenDaysFromNow
  )

  if (expiringSoon.length > 0) {
    console.log(`Refreshing tokens for ${expiringSoon.length} account(s) expiring soon...`)
    for (const account of expiringSoon) {
      const result = await refreshMetaToken(account.id)
      console.log(`[Refresh] ${account.id}: ${result.message}`)
    }
  }

  // Enqueue daily sync
  for (const account of accounts) {
    await enqueueSyncJob({
      adAccountId: account.id,
      dateStart: date,
      dateEnd: date,
    })
  }

  console.log(`Scheduled sync for ${accounts.length} active accounts for ${date}`)
  process.exit(0)
}

scheduleDaily().catch((err) => {
  console.error('Scheduler error:', err)
  process.exit(1)
})
