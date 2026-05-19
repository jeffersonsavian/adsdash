'use client'

import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { periodPresets } from '@/lib/metrics'
import { format, parseISO } from 'date-fns'

interface DateRangePickerProps {
  onDateRangeChange: (dateStart: string, dateEnd: string) => void
  currentStart?: string
  currentEnd?: string
}

export function DateRangePicker({
  onDateRangeChange,
  currentStart,
  currentEnd,
}: DateRangePickerProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>(
    'last30days'
  )

  const handlePresetChange = (presetKey: string) => {
    setSelectedPreset(presetKey)

    const presets = {
      today: periodPresets.today,
      last7days: periodPresets.last7Days,
      last30days: periodPresets.last30Days,
      currentmonth: periodPresets.currentMonth,
    } as const

    const preset = presets[presetKey as keyof typeof presets]?.()
    if (preset) {
      onDateRangeChange(preset.start, preset.end)
    }
  }

  const getDisplayText = () => {
    if (!currentStart || !currentEnd) return 'Select date range'

    try {
      const start = parseISO(currentStart)
      const end = parseISO(currentEnd)
      return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd')}`
    } catch {
      return 'Invalid dates'
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">Period:</span>
      <Select value={selectedPreset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="last7days">Last 7 days</SelectItem>
          <SelectItem value="last30days">Last 30 days</SelectItem>
          <SelectItem value="currentmonth">Current month</SelectItem>
        </SelectContent>
      </Select>
      <span className="text-sm text-muted-foreground ml-2">
        {getDisplayText()}
      </span>
    </div>
  )
}
