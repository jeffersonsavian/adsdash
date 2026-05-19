const BASE_URL = 'https://graph.facebook.com/v19.0'

const INSIGHT_FIELDS = [
  'campaign_id',
  'campaign_name',
  'adset_id',
  'adset_name',
  'ad_id',
  'ad_name',
  'impressions',
  'reach',
  'frequency',
  'clicks',
  'unique_clicks',
  'inline_link_clicks',
  'spend',
  'cpm',
  'cpc',
  'ctr',
  'actions',
  'action_values',
  'cost_per_action_type',
].join(',')

export interface MetaAction {
  action_type: string
  value: string
}

export interface MetaInsightRow {
  campaign_id?: string
  campaign_name?: string
  adset_id?: string
  adset_name?: string
  ad_id?: string
  ad_name?: string
  impressions?: string
  reach?: string
  frequency?: string
  clicks?: string
  unique_clicks?: string
  inline_link_clicks?: string
  spend?: string
  cpm?: string
  cpc?: string
  ctr?: string
  date_start?: string
  actions?: MetaAction[]
  action_values?: MetaAction[]
  cost_per_action_type?: MetaAction[]
}

export async function fetchInsights({
  accessToken,
  accountId,
  dateStart,
  dateEnd,
  level = 'campaign',
}: {
  accessToken: string
  accountId: string
  dateStart: string // 'YYYY-MM-DD'
  dateEnd: string
  level?: 'campaign' | 'adset' | 'ad'
}): Promise<MetaInsightRow[]> {
  const params = new URLSearchParams({
    access_token: accessToken,
    fields: INSIGHT_FIELDS,
    level,
    time_range: JSON.stringify({ since: dateStart, until: dateEnd }),
    time_increment: '1',
    limit: '500',
  })

  const res = await fetch(`${BASE_URL}/act_${accountId}/insights?${params}`)

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Meta API error: ${err.error?.message}`)
  }

  const data = await res.json()
  return (data.data || []) as MetaInsightRow[]
}

// Extrai valor de uma action específica (ex: 'lead', 'purchase')
export function getActionValue(
  actions: MetaAction[] | undefined,
  actionType: string
): number {
  if (!actions) return 0
  const action = actions.find((a) => a.action_type === actionType)
  return action ? Number(action.value) : 0
}

// Normaliza uma linha da API para o formato do banco
export function normalizeInsightRow(
  row: MetaInsightRow,
  level: 'campaign' | 'adset' | 'ad'
) {
  const leads = getActionValue(row.actions, 'lead')
  const purchases = getActionValue(row.actions, 'purchase')
  const addToCart = getActionValue(row.actions, 'add_to_cart')
  const spend = Number(row.spend) || 0
  const convValue = getActionValue(row.action_values, 'purchase')

  const externalEntityId = row[`${level}_id`]

  return {
    entityType: level,
    externalEntityId: externalEntityId || '',
    date: row.date_start ? new Date(row.date_start) : new Date(),
    platform: 'meta' as const,
    impressions: Number(row.impressions) || 0,
    reach: Number(row.reach) || 0,
    frequency: Number(row.frequency) || null,
    clicks: Number(row.clicks) || 0,
    uniqueClicks: Number(row.unique_clicks) || 0,
    linkClicks: Number(row.inline_link_clicks) || 0,
    spend,
    cpm: Number(row.cpm) || null,
    cpc: Number(row.cpc) || null,
    ctr: Number(row.ctr) || null,
    leads,
    purchases,
    addToCart,
    conversions: purchases, // usar purchases como proxy
    conversionValue: convValue,
    cpl: leads > 0 ? spend / leads : null,
    cpa: purchases > 0 ? spend / purchases : null,
    roas: spend > 0 ? convValue / spend : null,
    rawData: row,
  }
}
