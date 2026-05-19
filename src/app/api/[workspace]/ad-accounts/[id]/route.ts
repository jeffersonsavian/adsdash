import { auth } from '@/lib/auth'
import { getWorkspaceOrFail } from '@/lib/workspace'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/crypto'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspace: string; id: string }> }
) {
  const { workspace: workspaceSlug, id } = await params

  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspace = await getWorkspaceOrFail(workspaceSlug, session.user.id)

    const account = await prisma.adAccount.findFirst({
      where: { id, workspaceId: workspace.id },
      select: {
        id: true,
        externalAccountId: true,
        name: true,
        platform: true,
        isActive: true,
        lastSyncedAt: true,
        createdAt: true,
      },
    })

    if (!account) {
      return NextResponse.json({ error: 'Ad account not found' }, { status: 404 })
    }

    return NextResponse.json(account)
  } catch (error: any) {
    console.error('Error fetching ad account:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch ad account' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspace: string; id: string }> }
) {
  const { workspace: workspaceSlug, id } = await params

  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspace = await getWorkspaceOrFail(workspaceSlug, session.user.id)

    // Check ownership
    const existingAccount = await prisma.adAccount.findFirst({
      where: { id, workspaceId: workspace.id },
    })

    if (!existingAccount) {
      return NextResponse.json({ error: 'Ad account not found' }, { status: 404 })
    }

    const body = await req.json()
    const updateData: any = {}

    if (body.name !== undefined) {
      updateData.name = body.name
    }

    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive
    }

    if (body.accessToken !== undefined) {
      updateData.accessToken = encrypt(body.accessToken)
    }

    const updated = await prisma.adAccount.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        externalAccountId: true,
        name: true,
        platform: true,
        isActive: true,
        lastSyncedAt: true,
        createdAt: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Error updating ad account:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update ad account' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ workspace: string; id: string }> }
) {
  const { workspace: workspaceSlug, id } = await params

  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspace = await getWorkspaceOrFail(workspaceSlug, session.user.id)

    const existingAccount = await prisma.adAccount.findFirst({
      where: { id, workspaceId: workspace.id },
    })

    if (!existingAccount) {
      return NextResponse.json({ error: 'Ad account not found' }, { status: 404 })
    }

    await prisma.adAccount.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting ad account:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete ad account' },
      { status: 500 }
    )
  }
}
