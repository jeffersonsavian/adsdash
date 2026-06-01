import { auth } from '@/lib/auth'
import { getWorkspaceOrFail } from '@/lib/workspace'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/crypto'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspace: string }> }
) {
  const { workspace: workspaceSlug } = await params
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspace = await getWorkspaceOrFail(workspaceSlug, session.user.id)

    const accounts = await prisma.adAccount.findMany({
      where: { workspaceId: workspace.id },
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

    return NextResponse.json(accounts)
  } catch (error: any) {
    console.error('Error fetching ad accounts:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch ad accounts' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspace: string }> }
) {
  const { workspace: workspaceSlug } = await params
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspace = await getWorkspaceOrFail(workspaceSlug, session.user.id)

    const body = await req.json()
    const { externalAccountId, accessToken, name, platform = 'meta', tokenExpiresAt } = body

    if (!externalAccountId || !accessToken) {
      return NextResponse.json(
        { error: 'Missing externalAccountId or accessToken' },
        { status: 400 }
      )
    }

    // Encrypt the token before storing
    const encryptedToken = encrypt(accessToken)

    // Enforce maxAdAccounts limit inside a transaction to prevent race conditions
    const account = await prisma.$transaction(async (tx) => {
      const ws = await tx.workspace.findUniqueOrThrow({ where: { id: workspace.id } })
      const count = await tx.adAccount.count({ where: { workspaceId: workspace.id } })

      if (count >= ws.maxAdAccounts) {
        throw Object.assign(new Error(`Limite de contas atingido (${count}/${ws.maxAdAccounts}). Upgrade de plano necessário.`), { code: 'LIMIT_REACHED' })
      }

      return tx.adAccount.create({
        data: {
          workspaceId: workspace.id,
          externalAccountId,
          accessToken: encryptedToken,
          name: name || undefined,
          platform,
          isActive: true,
          tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt) : undefined,
        },
        select: {
          id: true,
          externalAccountId: true,
          name: true,
          platform: true,
          isActive: true,
          tokenExpiresAt: true,
          createdAt: true,
        },
      })
    })

    return NextResponse.json(account, { status: 201 })
  } catch (error: any) {
    console.error('Error creating ad account:', error)
    const status = error.code === 'LIMIT_REACHED' ? 402 : 500
    return NextResponse.json(
      { error: error.message || 'Failed to create ad account' },
      { status }
    )
  }
}
