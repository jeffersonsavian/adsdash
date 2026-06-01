import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function requireSuperAdmin() {
  const session = await auth()
  if (!session?.user) return null
  if ((session.user as any).role !== 'superadmin') return null
  return session
}

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

export async function GET() {
  if (!await requireSuperAdmin()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const workspaces = await prisma.workspace.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { users: true, adAccounts: true, sales: true },
      },
    },
  })

  return NextResponse.json(workspaces)
}

export async function POST(request: NextRequest) {
  const session = await requireSuperAdmin()
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { name, ownerUserId, planName = 'free', maxAdAccounts = 1, timezone = 'America/Sao_Paulo', currency = 'BRL' } = body

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
        users: {
          create: { userId: ownerUserId, role: 'owner' },
        },
      }),
    },
    include: {
      _count: { select: { users: true, adAccounts: true } },
    },
  })

  return NextResponse.json(workspace, { status: 201 })
}
