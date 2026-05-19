'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { formatDistanceToNow } from 'date-fns'

export interface SyncLogData {
  id: string
  status: 'success' | 'error' | 'partial'
  recordsSynced: number
  durationMs?: number | null
  finishedAt?: string | null
  errorMessage?: string | null
}

interface SyncStatusProps {
  adAccountId: string
  workspaceSlug: string
}

export function SyncStatus({ adAccountId, workspaceSlug }: SyncStatusProps) {
  const [syncLog, setSyncLog] = useState<SyncLogData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLatestSyncLog()
  }, [adAccountId])

  async function fetchLatestSyncLog() {
    try {
      setLoading(true)
      const res = await fetch(
        `/api/${workspaceSlug}/ad-accounts/${adAccountId}/sync-log`
      )
      if (res.ok) {
        const data = await res.json()
        setSyncLog(data)
      }
    } catch (err) {
      console.error('Error fetching sync log:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Card className="p-4 text-sm text-gray-500">Loading sync status...</Card>
  }

  if (!syncLog) {
    return <Card className="p-4 text-sm text-gray-500">No sync history</Card>
  }

  const statusColor =
    syncLog.status === 'success'
      ? 'text-green-600'
      : syncLog.status === 'error'
        ? 'text-red-600'
        : 'text-yellow-600'

  const statusLabel =
    syncLog.status === 'success'
      ? '✓ Success'
      : syncLog.status === 'error'
        ? '✗ Error'
        : '⊘ Partial'

  const timeAgo = syncLog.finishedAt
    ? formatDistanceToNow(new Date(syncLog.finishedAt), { addSuffix: true })
    : 'in progress'

  return (
    <Card className={`p-4 ${statusColor}`}>
      <div className="flex justify-between items-start gap-4">
        <div>
          <div className="font-semibold">{statusLabel}</div>
          <div className="text-sm text-gray-600 mt-1">
            {syncLog.recordsSynced} records synced
          </div>
          {syncLog.durationMs && (
            <div className="text-sm text-gray-600">
              Duration: {(syncLog.durationMs / 1000).toFixed(1)}s
            </div>
          )}
          {syncLog.errorMessage && (
            <div className="text-sm text-red-700 mt-1">{syncLog.errorMessage}</div>
          )}
        </div>
        <div className="text-sm text-gray-500 text-right">{timeAgo}</div>
      </div>
    </Card>
  )
}
