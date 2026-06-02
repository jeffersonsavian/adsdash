'use client'

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

const STAGE_W = 80
const GAP = 22
const FUNNEL_H = 140
const MIN_RATIO = 0.06
const CENTER_Y = FUNNEL_H / 2

export function ConversionFunnel({ steps }: ConversionFunnelProps) {
  if (!steps.length) return null

  const maxVal = steps[0].value || 1
  const N = steps.length
  const totalW = N * STAGE_W + (N - 1) * GAP
  const SVG_W = totalW + 80
  const PAD = (SVG_W - totalW) / 2

  const bars = steps.map((step, i) => {
    const ratio = Math.max(step.value / maxVal, MIN_RATIO)
    const h = ratio * FUNNEL_H
    const x = PAD + i * (STAGE_W + GAP)
    const yTop = CENTER_Y - h / 2
    const yBot = CENTER_Y + h / 2
    const pct = (step.value / maxVal) * 100
    return { ...step, x, yTop, yBot, h, pct }
  })

  return (
    <div className="w-full">
      {/* Stage labels */}
      <div className="flex" style={{ paddingLeft: PAD, gap: GAP }}>
        {bars.map(bar => (
          <div
            key={bar.label}
            className="text-xs font-medium text-center"
            style={{ width: STAGE_W, color: '#64748b', flexShrink: 0 }}
          >
            {bar.label}
          </div>
        ))}
      </div>

      {/* SVG funnel */}
      <svg
        viewBox={`0 0 ${SVG_W} ${FUNNEL_H}`}
        style={{ width: '100%', height: FUNNEL_H, display: 'block' }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {bars.slice(0, -1).map((bar, i) => (
            <linearGradient
              key={`lg-${i}`}
              id={`funnelGrad-${i}`}
              x1="0" y1="0" x2="1" y2="0"
            >
              <stop offset="0%" stopColor={bar.color} stopOpacity={0.9} />
              <stop offset="100%" stopColor={bars[i + 1].color} stopOpacity={0.9} />
            </linearGradient>
          ))}
        </defs>

        {/* Trapezoid connectors */}
        {bars.slice(0, -1).map((bar, i) => {
          const next = bars[i + 1]
          const x1 = bar.x + STAGE_W
          const x2 = next.x
          return (
            <path
              key={`trap-${i}`}
              d={`M ${x1} ${bar.yTop} L ${x2} ${next.yTop} L ${x2} ${next.yBot} L ${x1} ${bar.yBot} Z`}
              fill={`url(#funnelGrad-${i})`}
              opacity={0.55}
            />
          )
        })}

        {/* Bars */}
        {bars.map((bar, i) => (
          <g key={bar.label}>
            <rect
              x={bar.x}
              y={bar.yTop}
              width={STAGE_W}
              height={bar.h}
              rx={4}
              fill={bar.color}
              opacity={0.92}
            />
            {/* Percentage label — only if bar is tall enough */}
            {bar.h > 22 && (
              <text
                x={bar.x + STAGE_W / 2}
                y={CENTER_Y + 5}
                textAnchor="middle"
                fill="white"
                fontSize={bar.h > 40 ? 13 : 10}
                fontWeight="700"
                fontFamily="system-ui, sans-serif"
              >
                {bar.pct.toFixed(1)}%
              </text>
            )}
          </g>
        ))}
      </svg>

      {/* Absolute values */}
      <div className="flex mt-1" style={{ paddingLeft: PAD, gap: GAP }}>
        {bars.map(bar => (
          <div
            key={bar.label}
            className="text-xs tabular-nums text-center"
            style={{ width: STAGE_W, color: '#64748b', flexShrink: 0 }}
          >
            {Num(bar.value)}
          </div>
        ))}
      </div>
    </div>
  )
}
