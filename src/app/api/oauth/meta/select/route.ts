import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt, encrypt } from '@/lib/crypto'
import { getRedis } from '@/lib/redis'

// GET — retrieve pending OAuth selection data
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const key = request.nextUrl.searchParams.get('key')
  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 })

  const redis = getRedis()
  const raw = await redis.get(key)
  if (!raw) return NextResponse.json({ error: 'Selection expired or not found' }, { status: 404 })

  const data = JSON.parse(raw)

  // Return account list (never return the encrypted token)
  return NextResponse.json({
    adAccounts: data.adAccounts,
    expiresAt: data.expiresAt,
    workspaceId: data.workspaceId,
    slug: data.slug,
  })
}

// POST — connect selected ad accounts from OAuth
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { key, selectedAccountIds } = body as { key: string; selectedAccountIds: string[] }

  if (!key || !selectedAccountIds?.length) {
    return NextResponse.json({ error: 'key and selectedAccountIds required' }, { status: 400 })
  }

  const redis = getRedis()
  const raw = await redis.get(key)
  if (!raw) return NextResponse.json({ error: 'Selection expired' }, { status: 404 })

  const { longToken, expiresAt, adAccounts, workspaceId, slug } = JSON.parse(raw)

  // Validate workspace and plan limits
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } })
  const currentCount = await prisma.adAccount.count({ where: { workspaceId } })
  const available = workspace.maxAdAccounts - currentCount

  if (selectedAccountIds.length > available) {
    return NextResponse.json(
      { error: `Limite do plano: pode conectar apenas mais ${available} conta(s)` },
      { status: 402 }
    )
  }

  const token = decrypt(longToken)
  const tokenExpiresAt = new Date(expiresAt)

  // Connect each selected account (transaction-safe per account)
  const connected: string[] = []
  const errors: string[] = []

  for (const metaAccountId of selectedAccountIds) {
    const account = adAccounts.find((a: any) => a.id === metaAccountId)
    if (!account) continue

    // Remove "act_" prefix if present
    const externalId = metaAccountId.replace(/^act_/, '')

    try {
      await prisma.$transaction(async (tx) => {
        const count = await tx.adAccount.count({ where: { workspaceId } })
        if (count >= workspace.maxAdAccounts) {
          throw new Error('Limite atingido')
        }
        await tx.adAccount.upsert({
          where: { workspaceId_externalAccountId_platform: { workspaceId, externalAccountId: externalId, platform: 'meta' } },
          create: {
            workspaceId,
            externalAccountId: externalId,
            name: account.name,
            platform: 'meta',
            accessToken: encrypt(token),
            tokenExpiresAt,
            isActive: true,
          },
          update: {
            accessToken: encrypt(token),
            tokenExpiresAt,
            isActive: true,
            name: account.name,
          },
        })
      })
      connected.push(externalId)
    } catch (e: any) {
      errors.push(`${externalId}: ${e.message}`)
    }
  }

  // Delete Redis key after use
  await redis.del(key)

  return NextResponse.json({ connected, errors, slug })
}
