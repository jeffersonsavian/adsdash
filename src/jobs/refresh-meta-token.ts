import { prisma } from '@/lib/prisma'
import { decrypt, encrypt } from '@/lib/crypto'
import { getMetaGraphVersion } from '@/lib/meta-api'

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || getMetaGraphVersion()
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`

export async function refreshMetaToken(adAccountId: string): Promise<{ success: boolean; message: string }> {
  const adAccount = await prisma.adAccount.findUniqueOrThrow({
    where: { id: adAccountId },
    include: { workspace: { select: { metaAppId: true, metaAppSecret: true } } },
  })

  if (!adAccount.workspace.metaAppId || !adAccount.workspace.metaAppSecret) {
    return { success: false, message: 'Workspace has no Meta App configured' }
  }

  const metaAppSecret = decrypt(adAccount.workspace.metaAppSecret)
  const currentToken = decrypt(adAccount.accessToken)

  const res = await fetch(
    `${GRAPH}/oauth/access_token?` + new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: adAccount.workspace.metaAppId,
      client_secret: metaAppSecret,
      fb_exchange_token: currentToken,
    })
  )

  if (!res.ok) {
    const err = await res.json()
    const msg = `Token refresh failed: ${err.error?.message || res.statusText}`
    await prisma.syncLog.create({
      data: {
        workspaceId: adAccount.workspaceId,
        adAccountId: adAccount.id,
        platform: 'meta',
        status: 'error',
        errorMessage: msg,
      },
    })
    return { success: false, message: msg }
  }

  const { access_token, expires_in } = await res.json()
  const tokenExpiresAt = new Date(Date.now() + (expires_in || 5183944) * 1000)

  await prisma.adAccount.update({
    where: { id: adAccountId },
    data: {
      accessToken: encrypt(access_token),
      tokenExpiresAt,
    },
  })

  await prisma.syncLog.create({
    data: {
      workspaceId: adAccount.workspaceId,
      adAccountId: adAccount.id,
      platform: 'meta',
      status: 'success',
      errorMessage: `Token refreshed. Expires: ${tokenExpiresAt.toISOString()}`,
    },
  })

  return { success: true, message: `Token refreshed. Expires: ${tokenExpiresAt.toISOString()}` }
}
