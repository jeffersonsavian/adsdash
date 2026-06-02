import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin, slugify } from '@/lib/admin'

export async function GET() {
  if (!await requireSuperAdmin()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const plans = await prisma.plan.findMany({
    orderBy: { maxAdAccounts: 'asc' },
    include: { _count: { select: { workspaces: true } } },
  })

  return NextResponse.json(plans)
}

export async function POST(request: NextRequest) {
  if (!await requireSuperAdmin()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { name, description, maxAdAccounts = 1, price, isActive = true } = body

  if (!name) {
    return NextResponse.json({ error: 'name é obrigatório' }, { status: 400 })
  }

  const baseSlug = slugify(name)
  let slug = baseSlug
  let suffix = 1
  while (await prisma.plan.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix++}`
  }

  const plan = await prisma.plan.create({
    data: {
      name,
      slug,
      description: description || null,
      maxAdAccounts: Number(maxAdAccounts),
      price: price === undefined || price === null || price === '' ? null : Number(price),
      isActive: Boolean(isActive),
    },
  })

  return NextResponse.json(plan, { status: 201 })
}
