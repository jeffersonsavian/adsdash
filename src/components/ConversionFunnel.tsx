'use client'

import { ArrowDown } from 'lucide-react'

interface FunnelStep {
  label: string
  value: number
  color: string
}

interface ConversionFunnelProps {
  steps: FunnelStep[]
}

const Num = (n: number) =>
  new Intl.NumberFormat('pt-BR').format(Math.round(n))

const Pct = (n: number) =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: n >= 10 ? 1 : 2 }).format(n)

// Largura visual em escala sqrt: mantém etapas pequenas legíveis mesmo com
// impressões ordens de magnitude acima de compras (escala linear colapsa tudo).
const MIN_W = 22 // %
const MAX_W = 100 // %

export function ConversionFunnel({ steps }: ConversionFunnelProps) {
  if (!steps.length) return null

  const maxVal = Math.max(steps[0].value, 1)

  const bars = steps.map((step, i) => {
    const ratio = Math.sqrt(Math.max(step.value, 0) / maxVal)
    const width = step.value > 0 ? Math.max(ratio * MAX_W, MIN_W) : MIN_W
    // Taxa de conversão da etapa anterior para esta
    const prevValue = i > 0 ? steps[i - 1].value : null
    const stepRate =
      prevValue && prevValue > 0 ? (step.value / prevValue) * 100 : null
    // % acumulado vs topo do funil
    const totalRate = maxVal > 0 ? (step.value / maxVal) * 100 : 0
    return { ...step, width, stepRate, totalRate }
  })

  return (
    <div className="w-full flex flex-col items-center">
      {bars.map((bar, i) => (
        <div key={bar.label} className="w-full flex flex-col items-center">
          {/* Conector com taxa de conversão entre etapas */}
          {i > 0 && (
            <div className="flex items-center gap-1.5 py-1.5">
              <ArrowDown className="w-3 h-3" style={{ color: '#475569' }} />
              <span
                className="text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full border"
                style={{
                  color: bar.color,
                  borderColor: `${bar.color}40`,
                  backgroundColor: `${bar.color}14`,
                }}
              >
                {bar.stepRate != null ? `${Pct(bar.stepRate)}%` : '—'}
              </span>
            </div>
          )}

          {/* Barra da etapa */}
          <div
            className="relative rounded-lg transition-all duration-500 ease-out overflow-hidden"
            style={{
              width: `${bar.width}%`,
              background: `linear-gradient(90deg, ${bar.color}cc, ${bar.color}88)`,
              boxShadow: `0 0 18px ${bar.color}26`,
            }}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="text-xs font-medium text-white/90 whitespace-nowrap">
                {bar.label}
              </span>
              <span className="text-sm font-bold text-white tabular-nums whitespace-nowrap">
                {Num(bar.value)}
              </span>
            </div>
          </div>

          {/* % acumulado vs topo, discreto, só nas etapas finais */}
          {i === bars.length - 1 && bar.value > 0 && (
            <p className="text-[11px] mt-2 tabular-nums" style={{ color: '#475569' }}>
              {Pct(bar.totalRate)}% do topo do funil
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
