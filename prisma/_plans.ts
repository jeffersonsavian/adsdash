import type { PrismaClient } from '@prisma/client'

/** Planos padrão do sistema. Usado nos seeds (dev e prod). */
export const DEFAULT_PLANS = [
  { slug: 'free', name: 'Free', description: 'Plano gratuito', maxAdAccounts: 1, price: 0 },
  { slug: 'starter', name: 'Starter', description: 'Para começar', maxAdAccounts: 2, price: 49.9 },
  { slug: 'pro', name: 'Pro', description: 'Para gestores em crescimento', maxAdAccounts: 5, price: 199.9 },
  { slug: 'enterprise', name: 'Enterprise', description: 'Alto volume', maxAdAccounts: 20, price: 599.9 },
] as const

/**
 * Cria os planos padrão (idempotente via upsert por slug) e vincula workspaces
 * existentes que ainda não têm planId, casando pelo planName/slug.
 */
export async function seedPlans(prisma: PrismaClient) {
  for (const p of DEFAULT_PLANS) {
    await prisma.plan.upsert({
      where: { slug: p.slug },
      update: {}, // não sobrescreve edições feitas pelo super admin
      create: {
        slug: p.slug,
        name: p.name,
        description: p.description,
        maxAdAccounts: p.maxAdAccounts,
        price: p.price,
      },
    })
  }

  // Backfill: vincular workspaces sem planId ao plano correspondente
  const plans = await prisma.plan.findMany()
  const bySlug = new Map(plans.map((pl) => [pl.slug, pl]))

  const orphanWorkspaces = await prisma.workspace.findMany({ where: { planId: null } })
  for (const ws of orphanWorkspaces) {
    const match = bySlug.get((ws.planName || 'free').toLowerCase()) ?? bySlug.get('free')
    if (match) {
      await prisma.workspace.update({
        where: { id: ws.id },
        data: { planId: match.id, planName: match.name, maxAdAccounts: match.maxAdAccounts },
      })
    }
  }

  console.log(`✅ Planos sincronizados (${plans.length})`)
}
