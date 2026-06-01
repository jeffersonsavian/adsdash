import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'
import { validateApiToken, unauthorized } from '../../_auth'

type Params = { params: Promise<{ id: string }> }

// GET /api/v1/users/:id
export async function GET(request: NextRequest, { params }: Params) {
  if (!validateApiToken(request)) return unauthorized()

  const { id } = await params
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, role: true, isActive: true, createdAt: true,
      workspaces: {
        select: {
          role: true,
          workspace: { select: { id: true, name: true, slug: true, planName: true, maxAdAccounts: true } },
        },
      },
    },
  })

  if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  return NextResponse.json({ data: user })
}

// PATCH /api/v1/users/:id — update name, role, isActive, password
export async function PATCH(request: NextRequest, { params }: Params) {
  if (!validateApiToken(request)) return unauthorized()

  const { id } = await params
  const body = await request.json()
  const { name, role, isActive, password } = body

  const validRoles = ['client', 'owner', 'superadmin']
  if (role && !validRoles.includes(role)) {
    return NextResponse.json({ error: `role inválido. Valores: ${validRoles.join(', ')}` }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (name !== undefined) data.name = name
  if (role !== undefined) data.role = role
  if (isActive !== undefined) data.isActive = Boolean(isActive)
  if (password) data.passwordHash = await hash(password, 10)

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  })

  return NextResponse.json({ data: user })
}

// DELETE /api/v1/users/:id
export async function DELETE(request: NextRequest, { params }: Params) {
  if (!validateApiToken(request)) return unauthorized()

  const { id } = await params
  await prisma.user.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
