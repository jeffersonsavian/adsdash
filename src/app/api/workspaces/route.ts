import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const workspaces = await prisma.workspaceUser.findMany({
    where: { userId: session.user.id },
    include: { workspace: true },
  })

  return NextResponse.json(
    workspaces.map((wu: any) => ({
      id: wu.workspace.id,
      name: wu.workspace.name,
      slug: wu.workspace.slug,
      role: wu.role,
      logoUrl: wu.workspace.logoUrl,
    }))
  )
}

export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Owners and superadmins can create workspaces
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  })

  if (user?.role !== 'owner' && user?.role !== 'superadmin') {
    return NextResponse.json(
      { error: 'Only owners can create workspaces' },
      { status: 403 }
    )
  }

  const body = await request.json()
  const { name, slug } = body

  if (!name || !slug) {
    return NextResponse.json(
      { error: 'Name and slug are required' },
      { status: 400 }
    )
  }

  // Plano padrão (Free) — denormaliza nome/limite no workspace
  const freePlan = await prisma.plan.findUnique({ where: { slug: 'free' } })

  try {
    const workspace = await prisma.workspace.create({
      data: {
        name,
        slug,
        timezone: 'America/Sao_Paulo',
        currency: 'BRL',
        planId: freePlan?.id ?? null,
        planName: freePlan?.name ?? 'Free',
        maxAdAccounts: freePlan?.maxAdAccounts ?? 1,
      },
    })

    // Create WorkspaceUser with owner role
    await prisma.workspaceUser.create({
      data: {
        workspaceId: workspace.id,
        userId: session.user.id,
        role: 'owner',
      },
    })

    return NextResponse.json(workspace, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Workspace slug already exists' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create workspace' },
      { status: 500 }
    )
  }
}
