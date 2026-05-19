import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Clean existing data (dev only)
  await prisma.workspaceUser.deleteMany()
  await prisma.workspace.deleteMany()
  await prisma.user.deleteMany()

  // Create default owner user
  const ownerUser = await prisma.user.create({
    data: {
      name: 'Owner',
      email: 'owner@example.com',
      passwordHash: await hash('password123', 10),
      role: 'owner',
    },
  })

  // Create a sample workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Coach Jack',
      slug: 'coach-jack',
      timezone: 'America/Sao_Paulo',
      currency: 'BRL',
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

  console.log('Seed completed!')
  console.log(`Created user: ${ownerUser.email}`)
  console.log(`Created workspace: ${workspace.slug}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
