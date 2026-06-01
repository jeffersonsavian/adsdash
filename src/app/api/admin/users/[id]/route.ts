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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireSuperAdmin()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const { name, role, isActive, password } = body

  const validRoles = ['client', 'owner', 'superadmin']
  if (role && !validRoles.includes(role)) {
    return NextResponse.json({ error: 'Role inválido' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (name !== undefined) data.name = name
  if (role !== undefined) data.role = role
  if (isActive !== undefined) data.isActive = isActive
  if (password) data.passwordHash = await hash(password, 10)

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  })

  return NextResponse.json(user)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireSuperAdmin()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const session = await auth()

  // Prevent self-deletion
  if (session?.user?.id === id) {
    return NextResponse.json({ error: 'Não é possível deletar a própria conta' }, { status: 400 })
  }

  await prisma.user.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
