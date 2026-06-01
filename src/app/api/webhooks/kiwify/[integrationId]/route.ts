import { prisma } from '@/lib/prisma'
import { parseUtmPair, normalizeKiwifyStatus } from '@/lib/integrations'
import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ integrationId: string }> }
) {
  const { integrationId } = await params

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Buscar integração com adAccount para popular Sale.adAccountId
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, platform: 'kiwify', isActive: true },
    include: { adAccount: { select: { id: true } } },
  })

  if (!integration) {
    return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
  }

  // Validar signature com timing-safe comparison (previne timing attacks)
  const signature = body?.signature
  let signatureValid = false
  if (signature) {
    try {
      signatureValid = timingSafeEqual(
        Buffer.from(signature, 'utf8'),
        Buffer.from(integration.webhookToken, 'utf8')
      )
    } catch { signatureValid = false }
  }
  if (!signatureValid) {
    console.warn(`[Kiwify] Invalid signature for integration ${integrationId}`)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const order = body?.order
  if (!order) {
    return NextResponse.json({ error: 'Missing order' }, { status: 400 })
  }

  // Ignorar eventos não relevantes
  const event: string = order.webhook_event_type ?? ''
  const relevantEvents = ['order_approved', 'order_refunded', 'order_chargeback', 'order_canceled']
  if (!relevantEvents.includes(event)) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  // Parsear UTMs
  const tracking = order.TrackingParameters ?? {}
  const campaign = parseUtmPair(tracking.utm_campaign)
  const adset = parseUtmPair(tracking.utm_medium)
  const ad = parseUtmPair(tracking.utm_content)

  const status = normalizeKiwifyStatus(order.order_status ?? '', event)
  const commissions = order.Commissions ?? {}

  try {
    await prisma.sale.upsert({
      where: {
        platform_externalId: {
          platform: 'kiwify',
          externalId: order.order_id,
        },
      },
      update: {
        status,
        event,
        fundsStatus: commissions.funds_status ?? null,
        refundedAt: order.refunded_at ? new Date(order.refunded_at) : null,
        rawData: body,
      },
      create: {
        workspaceId: integration.workspaceId,
        integrationId: integration.id,
        adAccountId: integration.adAccount?.id ?? null,
        platform: 'kiwify',
        externalId: order.order_id,
        status,
        event,

        grossAmount: Number(commissions.charge_amount ?? 0),
        netAmount: Number(commissions.my_commission ?? 0),
        platformFee: Number(commissions.kiwify_fee ?? 0),
        currency: commissions.product_base_price_currency ?? 'BRL',

        paymentMethod: order.payment_method ?? null,
        installments: Number(order.installments ?? 1),

        productId: order.Product?.product_id ?? null,
        productName: order.Product?.product_name ?? null,
        offerName: order.Product?.product_offer_name ?? null,

        customerEmail: order.Customer?.email ?? null,
        customerName: order.Customer?.full_name ?? null,

        utmSource: tracking.utm_source ?? null,
        utmMedium: tracking.utm_medium ?? null,
        utmCampaign: tracking.utm_campaign ?? null,
        utmContent: tracking.utm_content ?? null,
        utmTerm: tracking.utm_term ?? null,

        metaCampaignId: campaign.id,
        metaCampaignName: campaign.name,
        metaAdsetId: adset.id,
        metaAdsetName: adset.name,
        metaAdId: ad.id,
        metaAdName: ad.name,

        fundsStatus: commissions.funds_status ?? null,
        approvedAt: order.approved_date ? new Date(order.approved_date) : null,
        refundedAt: order.refunded_at ? new Date(order.refunded_at) : null,

        rawData: body,
      },
    })

    console.log(`[Kiwify] Sale ${order.order_id} (${event}) saved for workspace ${integration.workspaceId}`)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[Kiwify] Error saving sale:', err.message)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
