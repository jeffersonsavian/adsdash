'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { MetricCard } from '@/components/MetricCard'
import { TrendChart } from '@/components/TrendChart'
import { CampaignTable } from '@/components/CampaignTable'
import { DateRangePicker } from '@/components/DateRangePicker'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  formatCurrency,
  formatNumber,
  calculateDelta,
  periodPresets,
} from '@/lib/metrics'

interface DashboardData {
  period: { start: string; end: string }
  previousPeriod: { start: string; end: string }
  kpis: {
    current: {
      spend: number | null
      impressions: number | null
      clicks: number | null
      leads: number | null
      purchases: number | null
      conversionValue: number | null
    }
    previous: {
      spend: number | null
      impressions: number | null
      clicks: number | null
      leads: number | null
      purchases: number | null
      conversionValue: number | null
    }
  }
  daily: Array<{
    date: string | Date
    spend: number
    leads: number
    purchases: number
    cpl: number
    roas: number
  }>
  campaigns: Array<{
    id: string
    name: string
    status: string | null
    spend: number
    impressions: number
    clicks: number
    leads: number
    purchases: number
    cpl: number | null
    roas: number | null
  }>
}

interface WorkspaceDashboardPageProps {
  params: Promise<{ workspace: string }>
}

export default function WorkspaceDashboardPage({
  params: paramsPromise,
}: WorkspaceDashboardPageProps) {
  const params = useParams()
  const workspaceSlug = params.workspace as string

  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateStart, setDateStart] = useState(periodPresets.last30Days().start)
  const [dateEnd, setDateEnd] = useState(periodPresets.last30Days().end)

  useEffect(() => {
    fetchDashboardData()
  }, [dateStart, dateEnd])

  async function fetchDashboardData() {
    try {
      setLoading(true)
      setError(null)

      const queryParams = new URLSearchParams({
        dateStart,
        dateEnd,
      })

      const res = await fetch(
        `/api/${workspaceSlug}/dashboard?${queryParams}`
      )

      if (!res.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      const dashboardData = await res.json()
      setData(dashboardData)
    } catch (err) {
      console.error('Error fetching dashboard:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleDateRangeChange = (newStart: string, newEnd: string) => {
    setDateStart(newStart)
    setDateEnd(newEnd)
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Loading dashboard data...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
        </div>
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <p className="text-red-600">
              {error || 'Failed to load dashboard data'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentKpis = data.kpis.current
  const previousKpis = data.kpis.previous

  // Calculate deltas
  const spendDelta = calculateDelta(
    currentKpis.spend ? Number(currentKpis.spend) : null,
    previousKpis.spend ? Number(previousKpis.spend) : null
  )
  const impressionsDelta = calculateDelta(
    currentKpis.impressions ? Number(currentKpis.impressions) : null,
    previousKpis.impressions ? Number(previousKpis.impressions) : null
  )
  const clicksDelta = calculateDelta(
    currentKpis.clicks ? Number(currentKpis.clicks) : null,
    previousKpis.clicks ? Number(previousKpis.clicks) : null
  )
  const leadsDelta = calculateDelta(
    currentKpis.leads ? Number(currentKpis.leads) : null,
    previousKpis.leads ? Number(previousKpis.leads) : null
  )
  const purchasesDelta = calculateDelta(
    currentKpis.purchases ? Number(currentKpis.purchases) : null,
    previousKpis.purchases ? Number(previousKpis.purchases) : null
  )
  const conversionValueDelta = calculateDelta(
    currentKpis.conversionValue ? Number(currentKpis.conversionValue) : null,
    previousKpis.conversionValue
      ? Number(previousKpis.conversionValue)
      : null
  )

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Performance overview and campaign metrics
          </p>
        </div>
      </div>

      {/* Date Range Picker */}
      <div className="flex justify-end">
        <DateRangePicker
          onDateRangeChange={handleDateRangeChange}
          currentStart={dateStart}
          currentEnd={dateEnd}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          label="Total Spend"
          value={formatCurrency(currentKpis.spend ? Number(currentKpis.spend) : 0)}
          delta={spendDelta}
          description="Overall campaign spend"
        />
        <MetricCard
          label="Impressions"
          value={formatNumber(currentKpis.impressions ? Number(currentKpis.impressions) : 0)}
          delta={impressionsDelta}
          description="Total impressions served"
        />
        <MetricCard
          label="Clicks"
          value={formatNumber(currentKpis.clicks ? Number(currentKpis.clicks) : 0)}
          delta={clicksDelta}
          description="Total clicks received"
        />
        <MetricCard
          label="Leads"
          value={formatNumber(currentKpis.leads ? Number(currentKpis.leads) : 0)}
          delta={leadsDelta}
          description="Leads generated"
        />
        <MetricCard
          label="Purchases"
          value={formatNumber(currentKpis.purchases ? Number(currentKpis.purchases) : 0)}
          delta={purchasesDelta}
          description="Purchases completed"
        />
        <MetricCard
          label="Revenue"
          value={formatCurrency(
            currentKpis.conversionValue
              ? Number(currentKpis.conversionValue)
              : 0
          )}
          delta={conversionValueDelta}
          description="Total revenue tracked"
        />
      </div>

      {/* Trend Chart */}
      <TrendChart data={data.daily} title="Daily Performance" />

      {/* Campaign Table */}
      <CampaignTable campaigns={data.campaigns} />

      {/* Empty State Info */}
      {data.campaigns.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>No campaigns data</CardTitle>
            <CardDescription>
              Configure your Meta Ads accounts to see campaign metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm">
              <li>
                1. Go to Settings and connect your Meta Ads accounts
              </li>
              <li>2. Wait for data synchronization (may take a few minutes)</li>
              <li>3. Your campaigns and metrics will appear here</li>
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
