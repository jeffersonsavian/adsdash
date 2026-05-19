'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDelta } from '@/lib/metrics'

interface MetricCardProps {
  label: string
  value: string | number
  delta?: number | null | undefined
  unit?: string
  description?: string
}

export function MetricCard({
  label,
  value,
  delta,
  unit,
  description,
}: MetricCardProps) {
  const deltaInfo = formatDelta(delta)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold">
              {value}
              {unit && <span className="text-sm font-normal ml-1">{unit}</span>}
            </div>
            {delta != null && (
              <div className={`text-sm font-medium ${deltaInfo.color}`}>
                {deltaInfo.text}
              </div>
            )}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
