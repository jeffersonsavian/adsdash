import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { compare, hash } from 'bcryptjs'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { currentPassword, newPassword } = await request.json()

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    return NextResponse.json({ error: 'A nova senha deve ter ao menos 8 caracteres' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  // Se já existe senha, exige e valida a senha atual
  if (user.passwordHash) {
    if (!currentPassword) {
      return NextResponse.json({ error: 'Informe a senha atual' }, { status: 400 })
    }
    const ok = await compare(currentPassword, user.passwordHash)
    if (!ok) {
      return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 })
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hash(newPassword, 10) },
  })

  return NextResponse.json({ ok: true })
}
