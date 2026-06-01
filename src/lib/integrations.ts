// Parseia o formato "Nome|ID" usado nas UTMs dos anúncios Meta
export function parseUtmPair(value: string | null | undefined): {
  name: string | null
  id: string | null
} {
  if (!value) return { name: null, id: null }
  const parts = value.split('|')
  return {
    name: parts[0]?.trim() || null,
    id: parts[1]?.trim() || null,
  }
}

// Mapeia status da Kiwify para status interno
export function normalizeKiwifyStatus(orderStatus: string, event: string): string {
  if (event === 'order_refunded' || orderStatus === 'refunded') return 'refunded'
  if (event === 'order_chargeback' || orderStatus === 'chargedback') return 'chargeback'
  if (orderStatus === 'paid' || event === 'order_approved') return 'paid'
  if (orderStatus === 'waiting_payment') return 'waiting_payment'
  if (orderStatus === 'canceled') return 'canceled'
  return orderStatus
}

// Mapeia status da Hotmart para status interno
export function normalizeHotmartStatus(event: string): string {
  switch (event) {
    case 'PURCHASE_APPROVED':
    case 'PURCHASE_COMPLETE':  return 'paid'
    case 'PURCHASE_REFUNDED':  return 'refunded'
    case 'PURCHASE_CHARGEBACK': return 'chargeback'
    case 'PURCHASE_CANCELED':  return 'canceled'
    case 'PURCHASE_BILLET_PRINTED': return 'waiting_payment'
    default: return event.toLowerCase()
  }
}

// Formata valor em centavos para reais
export function centsToBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
}
