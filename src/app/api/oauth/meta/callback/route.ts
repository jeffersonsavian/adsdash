import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt, encrypt } from '@/lib/crypto'
import { getRedis } from '@/lib/redis'
import { publicUrl } from '@/lib/url'
import { getMetaGraphVersion } from '@/lib/meta-api'

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || getMetaGraphVersion()
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.redirect(publicUrl('/login', request))
  }

  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const errorParam = searchParams.get('error')

  if (errorParam) {
    // User denied OAuth
    const errorDesc = searchParams.get('error_description') || 'Acesso negado'
    return NextResponse.redirect(
      publicUrl(`/?oauth_error=${encodeURIComponent(errorDesc)}`, request)
    )
  }

  if (!code || !state) {
    return NextResponse.json({ error: 'Missing code or state' }, { status: 400 })
  }

  // Validate CSRF state from Redis
  const redis = getRedis()
  const stored = await redis.get(`oauth:meta:${state}`)
  if (!stored) {
    return NextResponse.json({ error: 'OAuth state expired or invalid' }, { status: 400 })
  }

  const { workspaceId, userId, slug } = JSON.parse(stored) as {
    workspaceId: string
    userId: string
    slug: string
  }

  // Verify the user in session matches the one who started OAuth
  if (userId !== session.user.id) {
    return NextResponse.json({ error: 'Session mismatch' }, { status: 403 })
  }

  // Delete state to prevent replay
  await redis.del(`oauth:meta:${state}`)

  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } })
  if (!workspace?.metaAppId || !workspace.metaAppSecret) {
    return NextResponse.json({ error: 'Workspace Meta App not configured' }, { status: 400 })
  }

  const metaAppSecret = decrypt(workspace.metaAppSecret)
  const callbackUrl = publicUrl('/api/oauth/meta/callback', request)

  // Exchange code for short-lived token
  const tokenRes = await fetch(
    `${GRAPH}/oauth/access_token?` + new URLSearchParams({
      client_id: workspace.metaAppId,
      client_secret: metaAppSecret,
      redirect_uri: callbackUrl,
      code,
    })
  )

  if (!tokenRes.ok) {
    const err = await tokenRes.json()
    console.error('[OAuth] Token exchange error:', err)
    return NextResponse.json({ error: 'Token exchange failed', detail: err.error?.message }, { status: 502 })
  }

  const { access_token: shortToken } = await tokenRes.json()

  // Extend to 60-day long-lived token
  const extendRes = await fetch(
    `${GRAPH}/oauth/access_token?` + new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: workspace.metaAppId,
      client_secret: metaAppSecret,
      fb_exchange_token: shortToken,
    })
  )

  if (!extendRes.ok) {
    const err = await extendRes.json()
    console.error('[OAuth] Token extend error:', err)
    return NextResponse.json({ error: 'Token extension failed', detail: err.error?.message }, { status: 502 })
  }

  const { access_token: longToken, expires_in } = await extendRes.json()

  // Fetch available ad accounts
  const accountsRes = await fetch(
    `${GRAPH}/me/adaccounts?fields=id,name,account_status&limit=50`,
    {
      headers: {
        Authorization: `Bearer ${longToken}`,
      },
    }
  )

  const accountsData = await accountsRes.json()
  const adAccounts: { id: string; name: string; account_status: number }[] =
    accountsData.data || []

  // Store token + accounts in Redis temporarily for the selection step (5 min)
  const selectionKey = `oauth:meta:select:${session.user.id}:${workspaceId}`
  await redis.setex(selectionKey, 300, JSON.stringify({
    longToken: encrypt(longToken),
    expiresAt: new Date(Date.now() + (expires_in || 5183944) * 1000).toISOString(),
    adAccounts,
    workspaceId,
    slug,
  }))

  // Redirect to settings with selection token
  const redirectUrl = new URL(publicUrl(`/${slug}/settings`, request))
  redirectUrl.searchParams.set('oauth', 'select')
  redirectUrl.searchParams.set('key', encodeURIComponent(selectionKey))
  return NextResponse.redirect(redirectUrl)
}
