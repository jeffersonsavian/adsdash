import { subDays, startOfMonth, endOfMonth, format } from 'date-fns'

/**
 * Presets de período com datas de início e fim
 */
export const periodPresets = {
  today: () => {
    const now = new Date()
    const start = format(now, 'yyyy-MM-dd')
    const end = format(now, 'yyyy-MM-dd')
    return { start, end, label: 'Today', key: 'today' }
  },
  last7Days: () => {
    const end = new Date()
    const start = subDays(end, 6)
    return {
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
      label: 'Last 7 days',
      key: 'last7days',
    }
  },
  last30Days: () => {
    const end = new Date()
    const start = subDays(end, 29)
    return {
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
      label: 'Last 30 days',
      key: 'last30days',
    }
  },
  currentMonth: () => {
    const now = new Date()
    const start = startOfMonth(now)
    const end = endOfMonth(now)
    return {
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
      label: 'Current month',
      key: 'currentmonth',
    }
  },
}

/**
 * Calcula o período anterior equivalente para comparativo
 */
export function getPreviousPeriod(
  dateStart: string,
  dateEnd: string
): { start: string; end: string } {
  const start = new Date(dateStart)
  const end = new Date(dateEnd)

  // Número de dias no período
  const days = Math.floor(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1

  // Período anterior com mesmo tamanho
  const prevEnd = subDays(start, 1)
  const prevStart = subDays(prevEnd, days - 1)

  return {
    start: format(prevStart, 'yyyy-MM-dd'),
    end: format(prevEnd, 'yyyy-MM-dd'),
  }
}

/**
 * Formata um número como moeda BRL
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

/**
 * Formata um número com separador de milhares
 */
export function formatNumber(value: number | null | undefined): string {
  if (value == null) return '0'
  return new Intl.NumberFormat('pt-BR').format(Math.round(value))
}

/**
 * Formata um decimal com 2 casas
 */
export function formatDecimal(value: number | null | undefined): string {
  if (value == null) return '0,00'
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Calcula a variação percentual entre dois valores
 */
export function calculateDelta(
  current: number | null,
  previous: number | null
): number | null {
  if (current == null || previous == null) return null
  if (previous === 0) return current === 0 ? 0 : 100
  return ((current - previous) / previous) * 100
}

/**
 * Formata delta para exibição (com símbolo +/- e cor)
 */
export function formatDelta(delta: number | null | undefined): {
  text: string
  color: string
  sign: string
} {
  if (delta == null) {
    return { text: '—', color: 'text-gray-500', sign: '' }
  }

  const sign = delta > 0 ? '+' : delta < 0 ? '−' : ''
  const color =
    delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : 'text-gray-500'

  return {
    text: `${sign}${Math.abs(delta).toFixed(1)}%`,
    color,
    sign,
  }
}

/**
 * Verifica se CPA está acima do limite
 */
export function isCpaAboveThreshold(
  cpa: number | null | undefined,
  threshold: number | null | undefined
): boolean {
  if (cpa == null || threshold == null) return false
  return cpa > threshold
}
