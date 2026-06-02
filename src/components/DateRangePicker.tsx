'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarDays, ChevronDown } from 'lucide-react'
import { periodPresets } from '@/lib/metrics'

interface DateRangePickerProps {
  onDateRangeChange: (dateStart: string, dateEnd: string) => void
  currentStart?: string
  currentEnd?: string
}

const PRESETS = [
  { key: 'today',        label: 'Hoje',            fn: periodPresets.today },
  { key: 'yesterday',    label: 'Ontem',           fn: periodPresets.yesterday },
  { key: 'last7days',    label: 'Últimos 7 dias',  fn: periodPresets.last7Days },
  { key: 'last14days',   label: 'Últimos 14 dias', fn: periodPresets.last14Days },
  { key: 'last30days',   label: 'Últimos 30 dias', fn: periodPresets.last30Days },
  { key: 'currentmonth', label: 'Este mês',        fn: periodPresets.currentMonth },
  { key: 'lastmonth',    label: 'Mês passado',     fn: periodPresets.lastMonth },
] as const

type PresetKey = typeof PRESETS[number]['key']

function fmtDate(iso: string) {
  try {
    return format(parseISO(iso), "dd 'de' MMM", { locale: ptBR })
  } catch {
    return iso
  }
}

export function DateRangePicker({
  onDateRangeChange,
  currentStart,
  currentEnd,
}: DateRangePickerProps) {
  const [selected, setSelected] = useState<PresetKey>('last30days')
  const [open, setOpen] = useState(false)

  const activePreset = PRESETS.find(p => p.key === selected)

  const handleSelect = (key: PresetKey) => {
    setSelected(key)
    setOpen(false)
    const preset = PRESETS.find(p => p.key === key)
    if (preset) {
      const { start, end } = preset.fn()
      onDateRangeChange(start, end)
    }
  }

  const rangeLabel = currentStart && currentEnd
    ? `${fmtDate(currentStart)} – ${fmtDate(currentEnd)}`
    : activePreset?.label ?? ''

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg border text-sm font-medium transition-colors hover:opacity-80"
        style={{
          backgroundColor: '#111827',
          borderColor: '#1e293b',
          color: '#e2e8f0',
        }}
      >
        <CalendarDays className="w-4 h-4" style={{ color: '#3b82f6' }} />
        <span>{activePreset?.label}</span>
        <span className="text-xs" style={{ color: '#475569' }}>
          {currentStart && currentEnd && `${fmtDate(currentStart)} – ${fmtDate(currentEnd)}`}
        </span>
        <ChevronDown
          className="w-3.5 h-3.5 transition-transform"
          style={{ color: '#475569', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute right-0 top-full mt-1.5 z-20 rounded-xl border shadow-2xl overflow-hidden min-w-[180px]"
            style={{ backgroundColor: '#111827', borderColor: '#1e293b' }}
          >
            {PRESETS.map(preset => (
              <button
                key={preset.key}
                onClick={() => handleSelect(preset.key)}
                className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:opacity-80"
                style={{
                  backgroundColor: selected === preset.key ? '#1e293b' : 'transparent',
                  color: selected === preset.key ? '#f1f5f9' : '#94a3b8',
                }}
              >
                {preset.label}
                {selected === preset.key && (
                  <span className="ml-2 text-xs" style={{ color: '#3b82f6' }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
