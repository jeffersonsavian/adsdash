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
  // Planos padrão (sempre roda, idempotente)
  await seedPlans(prisma)

  const existing = await prisma.user.findFirst({ where: { role: 'superadmin' } })
  if (existing) {
    console.log('⚠️  Superadmin já existe:', existing.email)
    return
  }

  const tempPassword = randomBytes(12).toString('hex')
  const superadmin = await prisma.user.create({
    data: {
      name: 'Super Admin',
      email: 'jefferson.savian@gmail.com',
      passwordHash: await hash(tempPassword, 10),
      role: 'superadmin',
    },
  })

  console.log('\n✅ Superadmin criado!')
  console.log(`   Email:  ${superadmin.email}`)
  console.log(`   Senha:  ${tempPassword}  ← anote e troque após o primeiro login!`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
