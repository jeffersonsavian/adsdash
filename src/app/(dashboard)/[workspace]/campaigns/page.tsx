'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DateRangePicker } from '@/components/DateRangePicker'
import {
  formatCurrency,
  formatNumber,
  formatDecimal,
  periodPresets,
} from '@/lib/metrics'

interface Campaign {
  id: string
  externalId: string
  name: string
  status: string | null
  objective: string | null
  dailyBudget: number | null
  lifetimeBudget: number | null
  spend: number
  impressions: number
  clicks: number
  leads: number
  purchases: number
  conversionValue: number
  cpl: number | null
  cpa: number | null
  roas: number | null
}

export default function CampaignsPage() {
  const params = useParams()
  const workspaceSlug = params.workspace as string

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateStart, setDateStart] = useState(periodPresets.last30Days().start)
  const [dateEnd, setDateEnd] = useState(periodPresets.last30Days().end)

  useEffect(() => {
    fetchCampaigns()
  }, [dateStart, dateEnd])

  async function fetchCampaigns() {
    try {
      setLoading(true)
      setError(null)

      const queryParams = new URLSearchParams({
        dateStart,
        dateEnd,
      })

      const res = await fetch(`/api/${workspaceSlug}/campaigns?${queryParams}`)

      if (!res.ok) {
        throw new Error('Failed to fetch campaigns')
      }

      const { campaigns } = await res.json()
      setCampaigns(campaigns || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setCampaigns([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Campanhas</h1>
        <p className="text-muted-foreground">
          Análise de desempenho de campanhas por período
        </p>
      </div>

      <div className="flex items-center gap-4">
        <DateRangePicker
          onDateRangeChange={(start, end) => {
            setDateStart(start)
            setDateEnd(end)
          }}
          currentStart={dateStart}
          currentEnd={dateEnd}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campanhas</CardTitle>
          <CardDescription>
            {campaigns.length} campanha{campaigns.length !== 1 ? 's' : ''} encontrada
            {campaigns.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-muted-foreground">Carregando...</p>}
          {error && <p className="text-red-500">{error}</p>}
          {!loading && !error && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Gasto</TableHead>
                    <TableHead className="text-right">Impressões</TableHead>
                    <TableHead className="text-right">Cliques</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">Conversões</TableHead>
                    <TableHead className="text-right">CPA</TableHead>
                    <TableHead className="text-right">ROAS</TableHead>
                    <TableHead>Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">{campaign.name}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded ${
                          campaign.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800'
                            : campaign.status === 'PAUSED'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {campaign.status || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(campaign.spend)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(campaign.impressions)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(campaign.clicks)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(campaign.leads)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(campaign.purchases)}
                      </TableCell>
                      <TableCell className="text-right">
                        {campaign.cpa ? formatCurrency(campaign.cpa) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {campaign.roas ? formatDecimal(campaign.roas) : '—'}
                      </TableCell>
                      <TableCell>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/${workspaceSlug}/campaigns/${campaign.id}`}>
                            Detalhe
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {campaigns.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma campanha encontrada
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
