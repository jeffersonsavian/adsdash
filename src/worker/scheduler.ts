import { prisma } from '@/lib/prisma'
import { enqueueSyncJob } from '@/lib/queue'

async function scheduleDaily() {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const date = yesterday.toISOString().split('T')[0]

  const accounts = await prisma.adAccount.findMany({
    where: { isActive: true, platform: 'meta' },
  })

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
