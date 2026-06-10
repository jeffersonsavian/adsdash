import { prisma } from '@/lib/prisma'
import { parseUtmPair, normalizeHotmartStatus } from '@/lib/integrations'
import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'

export const dynamic = 'force-dynamic'

// Hotmart envia o hottok no header X-Hotmart-Hottok
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

  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, platform: 'hotmart', isActive: true },
    include: { adAccount: { select: { id: true } } },
  })

  if (!integration) {
    return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
  }

  // Hotmart valida via header X-Hotmart-Hottok (timing-safe comparison)
  const hottok = req.headers.get('x-hotmart-hottok') ?? body?.hottok
  let tokenValid = false
  if (hottok) {
    try {
      tokenValid = timingSafeEqual(
        Buffer.from(hottok, 'utf8'),
        Buffer.from(integration.webhookToken, 'utf8')
      )
    } catch { tokenValid = false }
  }
  if (!tokenValid) {
    console.warn(`[Hotmart] Invalid hottok for integration ${integrationId}`)
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const event: string = body?.event ?? ''
  const relevantEvents = ['PURCHASE_APPROVED', 'PURCHASE_COMPLETE', 'PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK', 'PURCHASE_CANCELED']
  if (!relevantEvents.includes(event)) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const purchase = body?.data?.purchase ?? {}
  const product = body?.data?.product ?? {}
  const buyer = body?.data?.buyer ?? {}
  const tracking = body?.data?.trackingParameters ?? {}

  // Hotmart também usa o formato Nome|ID nas UTMs
  const campaign = parseUtmPair(tracking.utm_campaign ?? tracking.utmCampaign)
  const adset = parseUtmPair(tracking.utm_medium ?? tracking.utmMedium)
  const ad = parseUtmPair(tracking.utm_content ?? tracking.utmContent)

  const status = normalizeHotmartStatus(event)

  // Hotmart envia valores em reais (float), convertemos para centavos
  const grossCents = Math.round(Number(purchase.price?.value ?? 0) * 100)
  const feeCents = Math.round(Number(purchase.fee?.base ?? 0) * 100)

  // Comissão líquida do produtor, quando informada (desconta afiliados/coprodutores)
  let netCents = grossCents - feeCents
  const commissions = body?.data?.commissions ?? []
  if (Array.isArray(commissions)) {
    const producerComm = commissions.find((c: any) => c.source === 'PRODUCER')
    if (producerComm && producerComm.value) {
      // producerComm.value pode ser string ou número, em reais
      const producerCommCents = Math.round(Number(producerComm.value) * 100)
      netCents = producerCommCents
    }
  }

  const externalId: string = purchase.transaction ?? body?.id ?? ''
  if (!externalId) {
    return NextResponse.json({ error: 'Missing transaction ID' }, { status: 400 })
  }

  // Datas Hotmart podem vir como epoch millis numérico ou string ISO.
  // saleDate usa apenas campos estáveis do pedido (approved_date/order_date) —
  // nunca body.creation_date, que é a data do evento e mudaria num refund.
  const parseHotmartDate = (raw: unknown): Date | null => {
    if (typeof raw === 'number' || typeof raw === 'string') {
      const d = new Date(raw)
      return isNaN(d.getTime()) ? null : d
    }
    return null
  }
  const approvedAt = parseHotmartDate(purchase.approved_date)
  const saleDate = approvedAt ?? parseHotmartDate(purchase.order_date) ?? new Date()

  // Dados comuns para create e update
  const commonData = {
    status,
    event,
    grossAmount: grossCents,
    netAmount: netCents,
    platformFee: feeCents,
    currency: purchase.price?.currencyCode ?? 'BRL',
    paymentMethod: purchase.payment?.type ?? null,
    installments: Number(purchase.payment?.installmentsNumber ?? 1),
    productId: String(product.id ?? ''),
    productName: product.name ?? null,
    offerName: product.offer?.code ?? null,
    customerEmail: buyer.email ?? null,
    customerName: buyer.name ?? null,
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
    approvedAt,
    saleDate,
    rawData: body,
  }

  try {
    await prisma.sale.upsert({
      where: { platform_externalId: { platform: 'hotmart', externalId } },
      update: commonData,
      create: {
        workspaceId: integration.workspaceId,
        integrationId: integration.id,
        adAccountId: integration.adAccount?.id ?? null,
        platform: 'hotmart',
        externalId,
        ...commonData,
      },
    })

    console.log(`[Hotmart] Sale ${externalId} (${event}) saved for workspace ${integration.workspaceId}`)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[Hotmart] Error saving sale:', err.message)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
