'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
} from 'recharts'
import { format, parseISO } from 'date-fns'

interface DailyTrendData {
  date: string | Date
  spend: number
  leads: number
  purchases: number
  cpl: number
  roas: number
}

interface Annotation {
  date: string
  title: string
  type: string
}

interface TrendChartProps {
  data: DailyTrendData[]
  title?: string
  height?: number
  annotations?: Annotation[]
}

export function TrendChart({
  data,
  title = 'Daily Trends',
  height = 350,
  annotations = [],
}: TrendChartProps) {
  // Formata data para exibição
  const formattedData = data.map((item) => ({
    ...item,
    date:
      item.date instanceof Date
        ? format(item.date, 'MMM dd')
        : format(parseISO(item.date as string), 'MMM dd'),
    rawDate:
      item.date instanceof Date
        ? format(item.date, 'yyyy-MM-dd')
        : item.date as string,
  }))

  // Mapeia anotações por data
  const annotationsByDate = new Map(
    annotations.map((a) => [a.date, a])
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                stroke="#888888"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#888888"
                style={{ fontSize: '12px' }}
                yAxisId="left"
              />
              <YAxis
                stroke="#888888"
                style={{ fontSize: '12px' }}
                yAxisId="right"
                orientation="right"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="spend"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Spend (R$)"
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="leads"
                stroke="#10b981"
                strokeWidth={2}
                name="Leads"
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="purchases"
                stroke="#f59e0b"
                strokeWidth={2}
                name="Purchases"
                dot={false}
              />
              {/* Render annotations as reference lines */}
              {formattedData.map((item) => {
                const annotation = annotationsByDate.get(item.rawDate)
                if (!annotation) return null
                return (
                  <ReferenceLine
                    key={`annotation-${item.rawDate}`}
                    x={item.date}
                    stroke="#ef4444"
                    strokeDasharray="3 3"
                    label={{ value: annotation.title, position: 'top' }}
                  />
                )
              })}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
