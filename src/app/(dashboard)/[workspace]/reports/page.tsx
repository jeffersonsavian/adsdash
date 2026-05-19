'use client'

import { useParams } from 'next/navigation'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DateRangePicker } from '@/components/DateRangePicker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { periodPresets } from '@/lib/metrics'

export default function ReportsPage() {
  const params = useParams()
  const workspaceSlug = params.workspace as string

  const [dateStart, setDateStart] = useState(periodPresets.last30Days().start)
  const [dateEnd, setDateEnd] = useState(periodPresets.last30Days().end)
  const [entityType, setEntityType] = useState('campaign')
  const [loading, setLoading] = useState(false)

  async function handleExportCSV() {
    try {
      setLoading(true)

      const queryParams = new URLSearchParams({
        dateStart,
        dateEnd,
        entityType,
      })

      const res = await fetch(`/api/${workspaceSlug}/reports?${queryParams}`)

      if (!res.ok) {
        throw new Error('Failed to export report')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `relatorio-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      alert(`Erro ao exportar relatório: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Relatórios</h1>
        <p className="text-muted-foreground">
          Exporte dados de métricas em CSV para análise
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exportar Relatório</CardTitle>
          <CardDescription>
            Selecione o período e o tipo de entidade para exportar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Período</label>
              <DateRangePicker
                onDateRangeChange={(start, end) => {
                  setDateStart(start)
                  setDateEnd(end)
                }}
                currentStart={dateStart}
                currentEnd={dateEnd}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Tipo de Entidade</label>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="campaign">Campanha</SelectItem>
                  <SelectItem value="adset">Conjunto de Anúncios</SelectItem>
                  <SelectItem value="ad">Anúncio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleExportCSV}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Exportando...' : 'Exportar CSV'}
              </Button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Formato do CSV</h3>
            <p className="text-sm text-blue-800">
              O arquivo será exportado com as seguintes colunas: Data, Entidade, Impressões, Alcance, Cliques, Gasto, CPM, CPC, CTR, Leads, Conversões, Valor de Conversão, CPL, CPA, ROAS.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
