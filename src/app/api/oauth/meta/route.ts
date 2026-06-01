import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getWorkspaceOrFail } from '@/lib/workspace'
import { decrypt } from '@/lib/crypto'
import { getRedis } from '@/lib/redis'
import { createHmac, randomBytes } from 'crypto'

const OAUTH_STATE_TTL = 600 // 10 min

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const slug = request.nextUrl.searchParams.get('workspace')
  if (!slug) {
    return NextResponse.json({ error: 'workspace param required' }, { status: 400 })
  }

  const workspace = await getWorkspaceOrFail(slug, session.user.id)

  if (!workspace.metaAppId || !workspace.metaAppSecret) {
    const settingsUrl = new URL(`/${slug}/settings`, request.url)
    settingsUrl.searchParams.set('error', 'meta-app-not-configured')
    return NextResponse.redirect(settingsUrl)
  }

  const metaAppSecret = decrypt(workspace.metaAppSecret)

  // Generate CSRF state: HMAC of userId+workspaceId+timestamp
  const nonce = randomBytes(16).toString('hex')
  const statePayload = `${session.user.id}|${workspace.id}|${nonce}`
  const hmacKey = process.env.NEXTAUTH_SECRET || 'fallback-secret'
  const state = createHmac('sha256', hmacKey).update(statePayload).digest('base64url')

  // Store in Redis: state → workspaceId (10 min TTL)
  const redis = getRedis()
  await redis.setex(`oauth:meta:${state}`, OAUTH_STATE_TTL, JSON.stringify({
    workspaceId: workspace.id,
    userId: session.user.id,
    slug,
  }))

  const callbackUrl = new URL('/api/oauth/meta/callback', request.url).toString()

  const oauthUrl = new URL('https://www.facebook.com/dialog/oauth')
  oauthUrl.searchParams.set('client_id', workspace.metaAppId)
  oauthUrl.searchParams.set('redirect_uri', callbackUrl)
  oauthUrl.searchParams.set('scope', 'ads_read,ads_management,business_management')
  oauthUrl.searchParams.set('state', state)
  oauthUrl.searchParams.set('response_type', 'code')

  return NextResponse.redirect(oauthUrl.toString())
}
