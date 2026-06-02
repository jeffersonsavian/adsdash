import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { hash } from 'bcryptjs'
import { randomBytes } from 'crypto'
import { seedPlans } from './_plans'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

async function main() {
  // Clean existing data (dev only) — order respects FK constraints
  await prisma.sale.deleteMany()
  await prisma.syncLog.deleteMany()
  await prisma.adMetric.deleteMany()
  await prisma.annotation.deleteMany()
  await prisma.integration.deleteMany()
  await prisma.adAccount.deleteMany()
  await prisma.ad.deleteMany()
  await prisma.adSet.deleteMany()
  await prisma.campaign.deleteMany()
  await prisma.workspaceUser.deleteMany()
  await prisma.workspace.deleteMany()
  await prisma.user.deleteMany()

  // Seed default plans
  await seedPlans(prisma)
  const proPlan = await prisma.plan.findUnique({ where: { slug: 'pro' } })

  // Create default owner user
  const ownerUser = await prisma.user.create({
    data: {
      name: 'Owner',
      email: 'owner@example.com',
      passwordHash: await hash('password123', 10),
      role: 'owner',
    },
  })

  // Create superadmin — passwordHash null so first login forces password setup
  // In dev, generate a temp password and print to console
  const tempPassword = randomBytes(12).toString('hex')
  const superadmin = await prisma.user.create({
    data: {
      name: 'Super Admin',
      email: 'superadmin@adsdash.com',
      passwordHash: await hash(tempPassword, 10),
      role: 'superadmin',
    },
  })

  // Create a sample workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Coach Jack',
      slug: 'coach-jack',
      timezone: 'America/Sao_Paulo',
      currency: 'BRL',
      planId: proPlan?.id,
      planName: 'Pro',
      maxAdAccounts: 5,
    },
  })

  // Link owner to workspace with owner role
  await prisma.workspaceUser.create({
    data: {
      workspaceId: workspace.id,
      userId: ownerUser.id,
      role: 'owner',
    },
  })

  console.log('\n✅ Seed completed!')
  console.log(`   Owner:      ${ownerUser.email} / password123`)
  console.log(`   Superadmin: ${superadmin.email} / ${tempPassword}  ← change after first login!`)
  console.log(`   Workspace:  /${workspace.slug}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
