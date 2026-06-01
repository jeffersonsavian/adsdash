import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'
import { validateApiToken, unauthorized } from '../_auth'

// GET /api/v1/users — list all users
export async function GET(request: NextRequest) {
  if (!validateApiToken(request)) return unauthorized()

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      workspaces: {
        select: {
          role: true,
          workspace: { select: { id: true, name: true, slug: true, planName: true } },
        },
      },
    },
  })

  return NextResponse.json({ data: users, total: users.length })
}

// POST /api/v1/users — create user
export async function POST(request: NextRequest) {
  if (!validateApiToken(request)) return unauthorized()

  const body = await request.json()
  const { name, email, password, role = 'client' } = body

  if (!name || !email) {
    return NextResponse.json({ error: 'name e email são obrigatórios' }, { status: 400 })
  }

  const validRoles = ['client', 'owner', 'superadmin']
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: `role inválido. Valores: ${validRoles.join(', ')}` }, { status: 400 })
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

  return NextResponse.json({ data: user }, { status: 201 })
}
