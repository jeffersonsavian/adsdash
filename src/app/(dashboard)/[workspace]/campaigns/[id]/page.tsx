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

interface Entity {
  id: string
  externalId: string
  name: string
  status: string | null
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

interface Ad extends Entity {
  creativeType: string | null
  thumbnailUrl: string | null
}

interface Campaign {
  id: string
  name: string
  status: string | null
  objective: string | null
  dailyBudget: number | null
  lifetimeBudget: number | null
  createdAt: string
}

interface CampaignDetail {
  campaign: Campaign
  adSets: Entity[]
  ads: Ad[]
}

export default function CampaignDetailPage() {
  const params = useParams()
  const workspaceSlug = params.workspace as string
  const campaignId = params.id as string

  const [data, setData] = useState<CampaignDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateStart, setDateStart] = useState(periodPresets.last30Days().start)
  const [dateEnd, setDateEnd] = useState(periodPresets.last30Days().end)

  useEffect(() => {
    fetchCampaignDetail()
  }, [dateStart, dateEnd])

  async function fetchCampaignDetail() {
    try {
      setLoading(true)
      setError(null)

      const queryParams = new URLSearchParams({
        dateStart,
        dateEnd,
      })

      const res = await fetch(
        `/api/${workspaceSlug}/campaigns/${campaignId}?${queryParams}`
      )

      if (!res.ok) {
        throw new Error('Failed to fetch campaign detail')
      }

      const detail = await res.json()
      setData(detail)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !data) {
    return <p className="text-muted-foreground">Carregando...</p>
  }

  if (error || !data) {
    return <p className="text-red-500">{error || 'Campanha não encontrada'}</p>
  }

  const campaign = data.campaign

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" className="mb-4">
          <Link href={`/${workspaceSlug}/campaigns`}>← Voltar</Link>
        </Button>
        <h1 className="text-3xl font-bold">{campaign.name}</h1>
        <p className="text-muted-foreground">{campaign.objective || 'Sem objetivo definido'}</p>
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

      {/* Ad Sets Section */}
      <Card>
        <CardHeader>
          <CardTitle>Conjuntos de Anúncios</CardTitle>
          <CardDescription>
            {data.adSets.length} conjunto{data.adSets.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.adSets.map((adSet) => (
                  <TableRow key={adSet.id}>
                    <TableCell className="font-medium">{adSet.name}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded ${
                        adSet.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : adSet.status === 'PAUSED'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {adSet.status || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(adSet.spend)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(adSet.impressions)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(adSet.clicks)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(adSet.leads)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(adSet.purchases)}
                    </TableCell>
                    <TableCell className="text-right">
                      {adSet.cpa ? formatCurrency(adSet.cpa) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {adSet.roas ? formatDecimal(adSet.roas) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {data.adSets.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Nenhum conjunto de anúncios encontrado
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ads Section */}
      <Card>
        <CardHeader>
          <CardTitle>Anúncios</CardTitle>
          <CardDescription>{data.ads.length} anúncio(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Gasto</TableHead>
                  <TableHead className="text-right">Impressões</TableHead>
                  <TableHead className="text-right">Cliques</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Conversões</TableHead>
                  <TableHead className="text-right">CPA</TableHead>
                  <TableHead className="text-right">ROAS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.ads.map((ad) => (
                  <TableRow key={ad.id}>
                    <TableCell className="font-medium">{ad.name}</TableCell>
                    <TableCell>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {ad.creativeType || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded ${
                        ad.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : ad.status === 'PAUSED'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {ad.status || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(ad.spend)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(ad.impressions)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(ad.clicks)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(ad.leads)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(ad.purchases)}
                    </TableCell>
                    <TableCell className="text-right">
                      {ad.cpa ? formatCurrency(ad.cpa) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {ad.roas ? formatDecimal(ad.roas) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {data.ads.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Nenhum anúncio encontrado
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
