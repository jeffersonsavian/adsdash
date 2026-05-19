import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getWorkspaceOrFail } from '@/lib/workspace'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  req: Request,
  { params: paramsPromise }: { params: Promise<{ workspace: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { workspace } = await paramsPromise
    const workspaceRecord = await getWorkspaceOrFail(workspace, session.user.id)

    const members = await prisma.workspaceUser.findMany({
      where: { workspaceId: workspaceRecord.id },
      include: { user: true },
    })

    return NextResponse.json({ members })
  } catch (error) {
    console.error('Error fetching members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: Request,
  { params: paramsPromise }: { params: Promise<{ workspace: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { workspace } = await paramsPromise
    const workspaceRecord = await getWorkspaceOrFail(workspace, session.user.id)

    // Check if user has permission to manage members (owner or manager)
    const currentMember = await prisma.workspaceUser.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: workspaceRecord.id,
          userId: session.user.id,
        },
      },
    })

    if (!currentMember || (currentMember.role !== 'owner' && currentMember.role !== 'manager')) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { email, role } = body

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!['client', 'manager'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found. Workspace user must be created first.' },
        { status: 404 }
      )
    }

    // Check if user is already in workspace
    const existing = await prisma.workspaceUser.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: workspaceRecord.id,
          userId: user.id,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'User already in workspace' },
        { status: 409 }
      )
    }

    // Add user to workspace
    const member = await prisma.workspaceUser.create({
      data: {
        workspaceId: workspaceRecord.id,
        userId: user.id,
        role,
      },
      include: { user: true },
    })

    return NextResponse.json({ member }, { status: 201 })
  } catch (error) {
    console.error('Error creating member:', error)
    return NextResponse.json(
      { error: 'Failed to create member' },
      { status: 500 }
    )
  }
}
