'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatNumber, formatDecimal, isCpaAboveThreshold } from '@/lib/metrics'

interface Campaign {
  id: string
  name: string
  status: string | null
  spend: number
  impressions: number
  clicks: number
  leads: number
  purchases: number
  cpl: number | null
  cpa?: number | null
  roas: number | null
}

type SortKey = keyof Campaign
type SortOrder = 'asc' | 'desc'

interface CampaignTableProps {
  campaigns: Campaign[]
  title?: string
  cpaAlertThreshold?: number | null
}

export function CampaignTable({
  campaigns,
  title = 'Top Campaigns',
  cpaAlertThreshold,
}: CampaignTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('spend')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('desc')
    }
  }

  const getSortIcon = (key: SortKey) => {
    if (sortKey !== key) return ' ⇅'
    return sortOrder === 'asc' ? ' ↑' : ' ↓'
  }

  const sortedCampaigns = [...campaigns].sort((a, b) => {
    const aVal = a[sortKey]
    const bVal = b[sortKey]

    if (aVal == null && bVal == null) return 0
    if (aVal == null) return 1
    if (bVal == null) return -1

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortOrder === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal)
    }

    return 0
  })

  const statusColor = (status: string | null) => {
    if (!status) return 'text-gray-500'
    if (status === 'ACTIVE') return 'text-green-600'
    if (status === 'PAUSED') return 'text-yellow-600'
    return 'text-gray-500'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {campaigns.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No campaigns found
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer hover:bg-muted/70">
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-1"
                    >
                      Campaign
                      {getSortIcon('name')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <span>Status</span>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer hover:bg-muted/70">
                    <button
                      onClick={() => handleSort('spend')}
                      className="flex items-center justify-end gap-1 w-full"
                    >
                      Spend
                      {getSortIcon('spend')}
                    </button>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer hover:bg-muted/70">
                    <button
                      onClick={() => handleSort('impressions')}
                      className="flex items-center justify-end gap-1 w-full"
                    >
                      Impressions
                      {getSortIcon('impressions')}
                    </button>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer hover:bg-muted/70">
                    <button
                      onClick={() => handleSort('clicks')}
                      className="flex items-center justify-end gap-1 w-full"
                    >
                      Clicks
                      {getSortIcon('clicks')}
                    </button>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer hover:bg-muted/70">
                    <button
                      onClick={() => handleSort('leads')}
                      className="flex items-center justify-end gap-1 w-full"
                    >
                      Leads
                      {getSortIcon('leads')}
                    </button>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer hover:bg-muted/70">
                    <button
                      onClick={() => handleSort('purchases')}
                      className="flex items-center justify-end gap-1 w-full"
                    >
                      Purchases
                      {getSortIcon('purchases')}
                    </button>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer hover:bg-muted/70">
                    <button
                      onClick={() => handleSort('cpl')}
                      className="flex items-center justify-end gap-1 w-full"
                    >
                      CPL
                      {getSortIcon('cpl')}
                    </button>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer hover:bg-muted/70">
                    <button
                      onClick={() => handleSort('roas')}
                      className="flex items-center justify-end gap-1 w-full"
                    >
                      ROAS
                      {getSortIcon('roas')}
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCampaigns.map((campaign) => {
                  const isCpaAlert = isCpaAboveThreshold(campaign.cpa, cpaAlertThreshold)
                  return (
                    <TableRow
                      key={campaign.id}
                      className={isCpaAlert ? 'bg-red-50' : ''}
                    >
                      <TableCell className="font-medium">{campaign.name}</TableCell>
                      <TableCell>
                        <span className={`text-sm font-medium ${statusColor(campaign.status)}`}>
                          {campaign.status || '—'}
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
                        {formatCurrency(campaign.cpl)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatDecimal(campaign.roas)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
