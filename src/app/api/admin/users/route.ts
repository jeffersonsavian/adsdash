import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'

async function requireSuperAdmin() {
  const session = await auth()
  if (!session?.user) return null
  if ((session.user as any).role !== 'superadmin') return null
  return session
}

export async function GET() {
  if (!await requireSuperAdmin()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      passwordHash: false,
      workspaces: {
        select: {
          role: true,
          workspace: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  })

  return NextResponse.json(users)
}

export async function POST(request: NextRequest) {
  if (!await requireSuperAdmin()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { name, email, password, role = 'client' } = body

  if (!name || !email) {
    return NextResponse.json({ error: 'name e email são obrigatórios' }, { status: 400 })
  }

  const validRoles = ['client', 'owner', 'superadmin']
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: 'Role inválido' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 })
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: password ? await hash(password, 10) : null,
      role,
    },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  })

  return NextResponse.json(user, { status: 201 })
}
