import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiToken, unauthorized } from '../_auth'

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

// GET /api/v1/workspaces
export async function GET(request: NextRequest) {
  if (!validateApiToken(request)) return unauthorized()

  const workspaces = await prisma.workspace.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { users: true, adAccounts: true, sales: true } },
    },
  })

  return NextResponse.json({ data: workspaces, total: workspaces.length })
}

// POST /api/v1/workspaces — create workspace and optionally assign owner
export async function POST(request: NextRequest) {
  if (!validateApiToken(request)) return unauthorized()

  const body = await request.json()
  const {
    name,
    ownerUserId,
    planName = 'free',
    maxAdAccounts = 1,
    timezone = 'America/Sao_Paulo',
    currency = 'BRL',
  } = body

  if (!name) {
    return NextResponse.json({ error: 'name é obrigatório' }, { status: 400 })
  }

  const baseSlug = slugify(name)
  let slug = baseSlug
  let suffix = 1
  while (await prisma.workspace.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix++}`
  }

  const workspace = await prisma.workspace.create({
    data: {
      name,
      slug,
      timezone,
      currency,
      planName,
      maxAdAccounts,
      ...(ownerUserId && {
        users: { create: { userId: ownerUserId, role: 'owner' } },
      }),
    },
    select: {
      id: true, name: true, slug: true, planName: true, maxAdAccounts: true,
      timezone: true, currency: true, createdAt: true,
    },
  })

  return NextResponse.json({ data: workspace }, { status: 201 })
}
