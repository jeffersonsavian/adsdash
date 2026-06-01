'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useParams } from 'next/navigation'
import { DateRangePicker } from '@/components/DateRangePicker'
import { periodPresets } from '@/lib/metrics'
import {
  Search, ChevronUp, ChevronDown, ChevronsUpDown,
  Megaphone, Layers, Image as ImageIcon, Settings2,
  RefreshCw, Check, X, SlidersHorizontal,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'campaigns' | 'adsets' | 'ads'
type SortDir = 'asc' | 'desc'

interface Campaign {
  id: string; name: string; status: string | null; objective: string | null
  dailyBudget: number | null; lifetimeBudget: number | null
  spend: number; impressions: number; clicks: number; leads: number
  purchases: number; conversionValue: number; cpl: number | null
  cpa: number | null; roas: number | null
}
interface AdSet {
  id: string; name: string; status: string | null; campaignName: string | null
  dailyBudget: number | null; spend: number; impressions: number; clicks: number
  leads: number; purchases: number; cpl: number | null; roas: number | null
}
interface Ad {
  id: string; name: string; status: string | null
  adsetName: string | null; campaignName: string | null
  spend: number; impressions: number; clicks: number; leads: number
  purchases: number; cpl: number | null; roas: number | null
}

interface ColDef {
  key: string
  label: string
  align: 'left' | 'right'
  source: 'meta' | 'platform'
  defaultVisible: boolean
}

// ─── Column definitions ───────────────────────────────────────────────────────

const CAMPAIGN_COLS: ColDef[] = [
  { key: 'name',          label: 'Campanha',    align: 'left',  source: 'meta',     defaultVisible: true  },
  { key: 'dailyBudget',   label: 'Orçamento',   align: 'right', source: 'meta',     defaultVisible: true  },
  { key: 'spend',         label: 'Gastos',      align: 'right', source: 'meta',     defaultVisible: true  },
  { key: 'vendas',        label: 'Vendas',      align: 'right', source: 'platform', defaultVisible: true  },
  { key: 'roas',          label: 'ROAS',        align: 'right', source: 'meta',     defaultVisible: true  },
  { key: 'cpa',           label: 'CPA',         align: 'right', source: 'meta',     defaultVisible: true  },
  { key: 'cliques',       label: 'Cliques',     align: 'right', source: 'meta',     defaultVisible: true  },
  { key: 'impressoes',    label: 'Impressões',  align: 'right', source: 'meta',     defaultVisible: false },
  { key: 'ctr',           label: 'CTR',         align: 'right', source: 'meta',     defaultVisible: true  },
  { key: 'cpc',           label: 'CPC',         align: 'right', source: 'meta',     defaultVisible: true  },
  { key: 'cpm',           label: 'CPM',         align: 'right', source: 'meta',     defaultVisible: false },
  { key: 'leads',         label: 'Leads',       align: 'right', source: 'meta',     defaultVisible: true  },
  { key: 'cpl',           label: 'CPL',         align: 'right', source: 'meta',     defaultVisible: false },
  { key: 'purchases',     label: 'Compras',     align: 'right', source: 'meta',     defaultVisible: false },
  { key: 'faturamento',   label: 'Faturamento', align: 'right', source: 'platform', defaultVisible: false },
  { key: 'taxa_aprov',    label: 'Taxa Apr.',   align: 'right', source: 'platform', defaultVisible: false },
]

const ADSET_COLS: ColDef[] = [
  { key: 'name',        label: 'Conjunto',   align: 'left',  source: 'meta',     defaultVisible: true  },
  { key: 'campanha',    label: 'Campanha',   align: 'left',  source: 'meta',     defaultVisible: true  },
  { key: 'dailyBudget', label: 'Orçamento',  align: 'right', source: 'meta',     defaultVisible: true  },
  { key: 'spend',       label: 'Gastos',     align: 'right', source: 'meta',     defaultVisible: true  },
  { key: 'vendas',      label: 'Vendas',     align: 'right', source: 'platform', defaultVisible: true  },
  { key: 'roas',        label: 'ROAS',       align: 'right', source: 'meta',     defaultVisible: true  },
  { key: 'cpa',         label: 'CPA',        align: 'right', source: 'meta',     defaultVisible: true  },
  { key: 'cliques',     label: 'Cliques',    align: 'right', source: 'meta',     defaultVisible: true  },
  { key: 'impressoes',  label: 'Impressões', align: 'right', source: 'meta',     defaultVisible: false },
  { key: 'ctr',         label: 'CTR',        align: 'right', source: 'meta',     defaultVisible: true  },
  { key: 'cpc',         label: 'CPC',        align: 'right', source: 'meta',     defaultVisible: true  },
  { key: 'cpm',         label: 'CPM',        align: 'right', source: 'meta',     defaultVisible: false },
  { key: 'leads',       label: 'Leads',      align: 'right', source: 'meta',     defaultVisible: true  },
  { key: 'cpl',         label: 'CPL',        align: 'right', source: 'meta',     defaultVisible: false },
]

const AD_COLS: ColDef[] = [
  { key: 'name',        label: 'Anúncio',        align: 'left',  source: 'meta',     defaultVisible: true  },
  { key: 'conjunto',    label: 'Conjunto',        align: 'left',  source: 'meta',     defaultVisible: true  },
  { key: 'spend',       label: 'Gastos',          align: 'right', source: 'meta',     defaultVisible: true  },
  { key: 'cpi',         label: 'CPI',             align: 'right', source: 'meta',     defaultVisible: true  },
  { key: 'cpm',         label: 'CPM',             align: 'right', source: 'meta',     defaultVisible: true  },
  { key: 'impressoes',  label: 'Impressões',      align: 'right', source: 'meta',     defaultVisible: true  },
  { key: 'cliques',     label: 'Cliques',         align: 'right', source: 'meta',     defaultVisible: true  },
  { key: 'ctr',         label: 'CTR',             align: 'right', source: 'meta',     defaultVisible: true  },
  { key: 'cpc',         label: 'CPC',             align: 'right', source: 'meta',     defaultVisible: false },
  { key: 'leads',       label: 'Leads',           align: 'right', source: 'meta',     defaultVisible: true  },
  { key: 'cpl',         label: 'CPL',             align: 'right', source: 'meta',     defaultVisible: false },
  { key: 'roas',        label: 'ROAS',            align: 'right', source: 'meta',     defaultVisible: true  },
  { key: 'faturamento', label: 'Faturamento',     align: 'right', source: 'platform', defaultVisible: true  },
  { key: 'fat_pend',    label: 'Fat. Pendente',   align: 'right', source: 'platform', defaultVisible: true  },
  { key: 'play_rate',   label: 'Play Rate Hook',  align: 'right', source: 'platform', defaultVisible: false },
  { key: 'hold_rate',   label: 'Hold Rate',       align: 'right', source: 'platform', defaultVisible: false },
]

// ─── Formatters ───────────────────────────────────────────────────────────────

const R$ = (n: number | null | undefined) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n ?? 0)
const Num = (n: number | null | undefined) =>
  new Intl.NumberFormat('pt-BR').format(Math.round(n ?? 0))
const Pct = (n: number) => `${n.toFixed(2)}%`
const NA = () => <span style={{ color: '#334155' }}>—</span>

// ─── UI helpers ───────────────────────────────────────────────────────────────

function ReadOnlyToggle({ active }: { active: boolean }) {
  return (
    <div
      className="w-9 h-5 rounded-full relative flex-shrink-0 cursor-default"
      style={{ backgroundColor: active ? '#3b82f6' : '#334155' }}
    >
      <div
        className="absolute top-0.5 w-4 h-4 rounded-full shadow transition-transform"
        style={{
          backgroundColor: '#fff',
          transform: active ? 'translateX(18px)' : 'translateX(2px)',
        }}
      />
    </div>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  const s = (status ?? '').toUpperCase()
  const active = s === 'ACTIVE'
  const paused = s === 'PAUSED'
  return (
    <div className="flex items-center gap-2">
      <ReadOnlyToggle active={active} />
    </div>
  )
}

function RoasCell({ value }: { value: number | null }) {
  const r = Number(value ?? 0)
  return (
    <span className="tabular-nums font-semibold"
      style={{ color: r >= 2 ? '#10b981' : r >= 1 ? '#fbbf24' : '#ef4444' }}>
      {r.toFixed(2)}
    </span>
  )
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="w-3 h-3 opacity-25" />
  return dir === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-400" /> : <ChevronDown className="w-3 h-3 text-blue-400" />
}

function Skeleton({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b animate-pulse" style={{ borderColor: '#1e293b' }}>
          <td className="px-3 py-4 w-8"><div className="h-3 w-3 rounded" style={{ backgroundColor: '#1e293b' }} /></td>
          <td className="px-3 py-4 w-12"><div className="h-4 w-9 rounded-full" style={{ backgroundColor: '#1e293b' }} /></td>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-4">
              <div className="h-3 rounded" style={{ backgroundColor: '#1e293b', width: j === 0 ? '70%' : '50%' }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

// ─── Column picker ────────────────────────────────────────────────────────────

function ColumnPicker({
  cols, visible, onToggle,
}: {
  cols: ColDef[]
  visible: Set<string>
  onToggle: (key: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:opacity-80"
        style={{ backgroundColor: open ? '#1e293b' : '#111827', borderColor: '#1e293b', color: '#94a3b8' }}
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        Colunas
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 rounded-xl border shadow-2xl z-50 w-64 overflow-hidden"
          style={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }}
        >
          <div className="px-4 py-3 border-b" style={{ borderColor: '#1e293b' }}>
            <p className="text-xs font-semibold" style={{ color: '#94a3b8' }}>Personalizar colunas</p>
          </div>
          <div className="max-h-72 overflow-y-auto py-2">
            {cols.map(col => (
              <button
                key={col.key}
                onClick={() => onToggle(col.key)}
                className="w-full flex items-center justify-between px-4 py-2 text-sm transition-colors hover:bg-white/5"
              >
                <span className="flex items-center gap-2">
                  <span style={{ color: visible.has(col.key) ? '#f1f5f9' : '#64748b' }}>
                    {col.label}
                  </span>
                  {col.source === 'platform' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: '#f59e0b18', color: '#fbbf24' }}>
                      integração
                    </span>
                  )}
                </span>
                <div
                  className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0"
                  style={{
                    borderColor: visible.has(col.key) ? '#3b82f6' : '#334155',
                    backgroundColor: visible.has(col.key) ? '#3b82f6' : 'transparent',
                  }}
                >
                  {visible.has(col.key) && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Generic filter bar ───────────────────────────────────────────────────────

function FilterBar({
  search, onSearch, statusFilter, onStatusFilter, placeholder,
}: {
  search: string; onSearch: (v: string) => void
  statusFilter: string; onStatusFilter: (v: string) => void
  placeholder: string
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="relative flex-1 min-w-48">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#475569' }} />
        <input
          type="text" value={search} onChange={e => onSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border outline-none"
          style={{ backgroundColor: '#111827', borderColor: '#1e293b', color: '#f1f5f9' }}
        />
      </div>
      <select
        value={statusFilter} onChange={e => onStatusFilter(e.target.value)}
        className="px-3 py-2 text-sm rounded-lg border outline-none appearance-none cursor-pointer"
        style={{ backgroundColor: '#111827', borderColor: '#1e293b', color: '#94a3b8' }}
      >
        <option value="">Qualquer status</option>
        <option value="ACTIVE">Ativo</option>
        <option value="PAUSED">Pausado</option>
        <option value="DELETED">Deletado</option>
      </select>
    </div>
  )
}

// ─── TH helper ───────────────────────────────────────────────────────────────

function TH({
  label, sortKey, activeSortKey, sortDir, onSort, right, source,
}: {
  label: string; sortKey: string; activeSortKey: string; sortDir: SortDir
  onSort: (k: string) => void; right?: boolean; source: 'meta' | 'platform'
}) {
  const active = activeSortKey === sortKey
  return (
    <th
      className={`px-4 py-3 ${right ? 'text-right' : 'text-left'} cursor-pointer select-none group whitespace-nowrap`}
      onClick={() => onSort(sortKey)}
    >
      <span
        className="inline-flex items-center gap-1 text-xs font-medium tracking-wider uppercase transition-colors group-hover:text-slate-200"
        style={{ color: source === 'platform' ? '#78716c' : '#475569' }}
      >
        {label}
        <SortIcon active={active} dir={sortDir} />
      </span>
    </th>
  )
}

// ─── Cell renderer ────────────────────────────────────────────────────────────

function CellValue({ colKey, row, type }: { colKey: string; row: any; type: 'campaign' | 'adset' | 'ad' }) {
  const spend = Number(row.spend ?? 0)
  const impressions = Number(row.impressions ?? 0)
  const clicks = Number(row.clicks ?? 0)
  const leads = Number(row.leads ?? 0)
  const purchases = Number(row.purchases ?? 0)
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
  const cpc = clicks > 0 ? spend / clicks : null
  const cpm = impressions > 0 ? (spend / impressions) * 1000 : null
  const cpa = purchases > 0 ? spend / purchases : null
  const cpl = leads > 0 ? spend / leads : null
  const roas = Number(row.roas ?? 0)

  const style = { color: '#94a3b8' }

  switch (colKey) {
    case 'name':        return <span className="font-medium text-white">{row.name}</span>
    case 'campanha':    return <span style={{ color: '#64748b' }} className="text-xs">{row.campaignName ?? '—'}</span>
    case 'conjunto':    return <span style={{ color: '#64748b' }} className="text-xs">{row.adsetName ?? '—'}</span>
    case 'dailyBudget': return row.dailyBudget
      ? <span style={style}>{R$(Number(row.dailyBudget))}<span className="text-xs ml-1 opacity-50">Diário</span></span>
      : <span style={style}>—</span>
    case 'spend':       return <span className="font-medium">{R$(spend)}</span>
    case 'roas':        return <RoasCell value={row.roas} />
    case 'cpa':         return <span style={style}>{cpa ? R$(cpa) : '—'}</span>
    case 'cpi':         return <span style={style}>{cpl ? R$(cpl) : '—'}</span>
    case 'cliques':     return <span style={style}>{Num(clicks)}</span>
    case 'impressoes':  return <span style={style}>{Num(impressions)}</span>
    case 'ctr':         return <span style={style}>{Pct(ctr)}</span>
    case 'cpc':         return <span style={style}>{cpc ? R$(cpc) : '—'}</span>
    case 'cpm':         return <span style={style}>{cpm ? R$(cpm) : '—'}</span>
    case 'leads':       return <span style={{ color: '#fbbf24' }} className="font-medium">{Num(leads)}</span>
    case 'cpl':         return <span style={style}>{cpl ? R$(cpl) : '—'}</span>
    case 'purchases':   return <span style={style}>{Num(purchases)}</span>
    // Platform-only
    case 'vendas':
    case 'faturamento':
    case 'fat_pend':
    case 'play_rate':
    case 'hold_rate':
    case 'taxa_aprov':  return <NA />
    default:            return <span style={style}>—</span>
  }
}

// ─── Total row value ──────────────────────────────────────────────────────────

function TotalValue({ colKey, rows }: { colKey: string; rows: any[] }) {
  const sum = (k: keyof any) => rows.reduce((s, r) => s + Number(r[k] ?? 0), 0)
  const spend = sum('spend')
  const impressions = sum('impressions')
  const clicks = sum('clicks')
  const leads = sum('leads')
  const purchases = sum('purchases')
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
  const cpc = clicks > 0 ? spend / clicks : null
  const cpm = impressions > 0 ? (spend / impressions) * 1000 : null
  const cpa = purchases > 0 ? spend / purchases : null
  const cpl = leads > 0 ? spend / leads : null
  const totalRoas = rows.length > 0
    ? rows.reduce((s, r) => s + Number(r.roas ?? 0), 0) / rows.length : 0

  const style = { color: '#64748b', fontSize: '0.75rem' }

  switch (colKey) {
    case 'name':        return <span style={{ color: '#94a3b8' }} className="font-medium text-xs">{rows.length} item{rows.length !== 1 ? 's' : ''}</span>
    case 'campanha':
    case 'conjunto':    return <span style={style}>—</span>
    case 'dailyBudget': return <span style={style}>{R$(rows.reduce((s, r) => s + Number(r.dailyBudget ?? 0), 0))}</span>
    case 'spend':       return <span style={{ color: '#f1f5f9' }} className="font-medium text-xs">{R$(spend)}</span>
    case 'roas':        return <span style={{ color: totalRoas >= 1 ? '#10b981' : '#ef4444' }} className="font-medium text-xs">{totalRoas.toFixed(2)}</span>
    case 'cpa':
    case 'cpi':         return <span style={style}>{cpa ? R$(cpa) : '—'}</span>
    case 'cliques':     return <span style={style}>{Num(clicks)}</span>
    case 'impressoes':  return <span style={style}>{Num(impressions)}</span>
    case 'ctr':         return <span style={style}>{Pct(ctr)}</span>
    case 'cpc':         return <span style={style}>{cpc ? R$(cpc) : '—'}</span>
    case 'cpm':         return <span style={style}>{cpm ? R$(cpm) : '—'}</span>
    case 'leads':       return <span style={style}>{Num(leads)}</span>
    case 'cpl':         return <span style={style}>{cpl ? R$(cpl) : '—'}</span>
    case 'purchases':   return <span style={style}>{Num(purchases)}</span>
    default:            return <span style={style}>—</span>
  }
}

// ─── Generic table ────────────────────────────────────────────────────────────

function DataTable({
  rows, loading, cols, visibleCols, onToggleCol,
  search, onSearch, statusFilter, onStatusFilter,
  type, searchPlaceholder,
}: {
  rows: any[]; loading: boolean; cols: ColDef[]
  visibleCols: Set<string>; onToggleCol: (k: string) => void
  search: string; onSearch: (v: string) => void
  statusFilter: string; onStatusFilter: (v: string) => void
  type: 'campaign' | 'adset' | 'ad'; searchPlaceholder: string
}) {
  const [sortKey, setSortKey] = useState('spend')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const activeCols = cols.filter(c => visibleCols.has(c.key))

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const sf = statusFilter.toUpperCase()
    return rows
      .filter(r => (!q || r.name.toLowerCase().includes(q)) && (!sf || (r.status ?? '').toUpperCase() === sf))
      .sort((a, b) => {
        if (sortKey === 'name') {
          return sortDir === 'asc' ? a.name.localeCompare(b.name, 'pt-BR') : b.name.localeCompare(a.name, 'pt-BR')
        }
        return sortDir === 'asc'
          ? Number(a[sortKey] ?? 0) - Number(b[sortKey] ?? 0)
          : Number(b[sortKey] ?? 0) - Number(a[sortKey] ?? 0)
      })
  }, [rows, search, statusFilter, sortKey, sortDir])

  function handleSort(key: string) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(r => r.id)))
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <FilterBar
          search={search} onSearch={onSearch}
          statusFilter={statusFilter} onStatusFilter={onStatusFilter}
          placeholder={searchPlaceholder}
        />
        <ColumnPicker cols={cols} visible={visibleCols} onToggle={onToggleCol} />
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#111827', borderColor: '#1e293b' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: '#1e293b', backgroundColor: '#0d1424' }}>
                {/* Checkbox */}
                <th className="px-3 py-3 w-8">
                  <div
                    className="w-4 h-4 rounded border cursor-pointer flex items-center justify-center"
                    style={{ borderColor: selected.size === filtered.length && filtered.length > 0 ? '#3b82f6' : '#334155', backgroundColor: selected.size === filtered.length && filtered.length > 0 ? '#3b82f6' : 'transparent' }}
                    onClick={toggleAll}
                  >
                    {selected.size === filtered.length && filtered.length > 0 && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                </th>
                {/* Status */}
                <th className="px-3 py-3">
                  <span className="text-xs font-medium tracking-wider uppercase" style={{ color: '#475569' }}>Status</span>
                </th>
                {activeCols.map(col => (
                  <TH
                    key={col.key} label={col.label} sortKey={col.key}
                    activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort}
                    right={col.align === 'right'} source={col.source}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <Skeleton cols={activeCols.length} />
              ) : filtered.length === 0 ? (
                <tr><td colSpan={activeCols.length + 2} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#1e293b' }}>
                      <Search className="w-4 h-4" style={{ color: '#475569' }} />
                    </div>
                    <p className="text-sm" style={{ color: '#475569' }}>Nenhum resultado encontrado</p>
                  </div>
                </td></tr>
              ) : (
                filtered.map((row, idx) => (
                  <tr
                    key={row.id}
                    className="border-b transition-colors hover:bg-white/[0.02]"
                    style={{
                      borderColor: '#1e293b',
                      backgroundColor: selected.has(row.id) ? '#1e3a5f30' : idx % 2 ? '#0f172a20' : 'transparent',
                    }}
                  >
                    <td className="px-3 py-3">
                      <div
                        className="w-4 h-4 rounded border cursor-pointer flex items-center justify-center"
                        style={{ borderColor: selected.has(row.id) ? '#3b82f6' : '#334155', backgroundColor: selected.has(row.id) ? '#3b82f6' : 'transparent' }}
                        onClick={() => toggleSelect(row.id)}
                      >
                        {selected.has(row.id) && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    {activeCols.map(col => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 ${col.align === 'right' ? 'text-right' : 'text-left'} whitespace-nowrap`}
                      >
                        <CellValue colKey={col.key} row={row} type={type} />
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
            {/* Totals row */}
            {!loading && filtered.length > 0 && (
              <tfoot>
                <tr className="border-t" style={{ borderColor: '#334155', backgroundColor: '#0d1424' }}>
                  <td className="px-3 py-3">
                    <span className="text-xs" style={{ color: '#334155' }}>N/A</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-xs" style={{ color: '#334155' }}>N/A</span>
                  </td>
                  {activeCols.map(col => (
                    <td key={col.key} className={`px-4 py-3 ${col.align === 'right' ? 'text-right' : 'text-left'}`}>
                      <TotalValue colKey={col.key} rows={filtered} />
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {/* Footer */}
        {!loading && (
          <div className="px-4 py-2.5 border-t flex items-center justify-between" style={{ borderColor: '#1e293b' }}>
            <p className="text-xs" style={{ color: '#475569' }}>
              {filtered.length} de {rows.length} {type === 'campaign' ? 'campanhas' : type === 'adset' ? 'conjuntos' : 'anúncios'}
              {selected.size > 0 && <span className="ml-2 text-blue-400">• {selected.size} selecionado{selected.size !== 1 ? 's' : ''}</span>}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Column visibility hook ───────────────────────────────────────────────────

function useColumnVisibility(cols: ColDef[]) {
  const [visible, setVisible] = useState<Set<string>>(
    () => new Set(cols.filter(c => c.defaultVisible).map(c => c.key))
  )
  function toggle(key: string) {
    setVisible(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }
  return { visible, toggle }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const params = useParams()
  const workspaceSlug = params.workspace as string

  const [activeTab, setActiveTab] = useState<Tab>('campaigns')
  const [dateStart, setDateStart] = useState(periodPresets.last30Days().start)
  const [dateEnd, setDateEnd] = useState(periodPresets.last30Days().end)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [adsets, setAdsets] = useState<AdSet[]>([])
  const [ads, setAds] = useState<Ad[]>([])
  const [loadingC, setLoadingC] = useState(true)
  const [loadingS, setLoadingS] = useState(false)
  const [loadingA, setLoadingA] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Per-tab filters
  const [searchC, setSearchC] = useState(''); const [statusC, setStatusC] = useState('')
  const [searchS, setSearchS] = useState(''); const [statusS, setStatusS] = useState('')
  const [searchA, setSearchA] = useState(''); const [statusA, setStatusA] = useState('')

  // Column visibility per tab
  const campCols = useColumnVisibility(CAMPAIGN_COLS)
  const adsetCols = useColumnVisibility(ADSET_COLS)
  const adCols = useColumnVisibility(AD_COLS)

  useEffect(() => {
    if (!workspaceSlug) return
    fetchCampaigns()
  }, [workspaceSlug, dateStart, dateEnd])

  useEffect(() => {
    if (!workspaceSlug) return
    if (activeTab === 'adsets' && adsets.length === 0 && !loadingS) fetchAdsets()
    if (activeTab === 'ads' && ads.length === 0 && !loadingA) fetchAds()
  }, [activeTab, workspaceSlug])

  async function fetchCampaigns() {
    try { setLoadingC(true); setError(null)
      const r = await fetch(`/api/${workspaceSlug}/campaigns?dateStart=${dateStart}&dateEnd=${dateEnd}`)
      if (!r.ok) { const b = await r.json().catch(() => ({})); throw new Error(b.error || `Erro ${r.status}`) }
      const j = await r.json(); setCampaigns(j.campaigns ?? [])
      setAdsets([]); setAds([]); setLastUpdated(new Date())
    } catch (e: any) { setError(e.message) } finally { setLoadingC(false) }
  }
  async function fetchAdsets() {
    try { setLoadingS(true)
      const r = await fetch(`/api/${workspaceSlug}/ad-sets?dateStart=${dateStart}&dateEnd=${dateEnd}`)
      if (!r.ok) { const b = await r.json().catch(() => ({})); throw new Error(b.error || `Erro ${r.status}`) }
      const j = await r.json(); setAdsets(j.adsets ?? [])
    } catch (e: any) { setError(e.message) } finally { setLoadingS(false) }
  }
  async function fetchAds() {
    try { setLoadingA(true)
      const r = await fetch(`/api/${workspaceSlug}/ads?dateStart=${dateStart}&dateEnd=${dateEnd}`)
      if (!r.ok) { const b = await r.json().catch(() => ({})); throw new Error(b.error || `Erro ${r.status}`) }
      const j = await r.json(); setAds(j.ads ?? [])
    } catch (e: any) { setError(e.message) } finally { setLoadingA(false) }
  }

  function handleRefresh() {
    fetchCampaigns()
    if (activeTab === 'adsets') fetchAdsets()
    if (activeTab === 'ads') fetchAds()
  }

  const tabs = [
    { key: 'campaigns' as Tab, label: 'Campanhas',  icon: Megaphone,   count: campaigns.length },
    { key: 'adsets'    as Tab, label: 'Conjuntos',  icon: Layers,      count: adsets.length    },
    { key: 'ads'       as Tab, label: 'Anúncios',   icon: ImageIcon,   count: ads.length       },
  ]

  const totalSpend = campaigns.reduce((s, c) => s + Number(c.spend), 0)
  const totalImpr  = campaigns.reduce((s, c) => s + Number(c.impressions), 0)
  const totalClick = campaigns.reduce((s, c) => s + Number(c.clicks), 0)
  const totalLeads = campaigns.reduce((s, c) => s + Number(c.leads), 0)

  return (
    <div className="min-h-full" style={{ backgroundColor: '#0a0f1e', color: '#f1f5f9' }}>

      {/* Header */}
      <div className="px-8 py-5 border-b flex items-center justify-between" style={{ borderColor: '#1e293b' }}>
        <div>
          <h1 className="text-xl font-bold">Campanhas</h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>{dateStart} → {dateEnd}</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs" style={{ color: '#475569' }}>
              Atualizado {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors hover:opacity-80"
            style={{ backgroundColor: '#3b82f6', borderColor: '#3b82f6', color: '#fff' }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar
          </button>
          <DateRangePicker
            onDateRangeChange={(s, e) => { setDateStart(s); setDateEnd(e) }}
            currentStart={dateStart} currentEnd={dateEnd}
          />
        </div>
      </div>

      <div className="p-8 space-y-5">
        {error && (
          <div className="rounded-xl p-4 text-sm border" style={{ backgroundColor: '#ef444410', borderColor: '#ef444430', color: '#f87171' }}>
            {error}
          </div>
        )}

        {/* Summary */}
        {!loadingC && campaigns.length > 0 && (
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total Gasto',  value: R$(totalSpend) },
              { label: 'Impressões',   value: Num(totalImpr)  },
              { label: 'Cliques',      value: Num(totalClick) },
              { label: 'Leads',        value: Num(totalLeads) },
            ].map(item => (
              <div key={item.label} className="rounded-xl border px-4 py-3 flex items-center justify-between"
                style={{ backgroundColor: '#111827', borderColor: '#1e293b' }}>
                <span className="text-xs" style={{ color: '#64748b' }}>{item.label}</span>
                <span className="text-sm font-bold tabular-nums">{item.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b" style={{ borderColor: '#1e293b' }}>
          {tabs.map(({ key, label, icon: Icon, count }) => {
            const active = activeTab === key
            return (
              <button key={key} onClick={() => setActiveTab(key)}
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative"
                style={{ color: active ? '#f1f5f9' : '#64748b' }}>
                <Icon className="w-4 h-4" />
                {label}
                {count > 0 && (
                  <span className="px-1.5 py-0.5 rounded text-xs tabular-nums"
                    style={{ backgroundColor: active ? '#1e3a5f' : '#0f172a', color: active ? '#60a5fa' : '#475569' }}>
                    {count}
                  </span>
                )}
                {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t" style={{ backgroundColor: '#3b82f6' }} />}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'campaigns' && (
          <DataTable
            rows={campaigns} loading={loadingC} cols={CAMPAIGN_COLS}
            visibleCols={campCols.visible} onToggleCol={campCols.toggle}
            search={searchC} onSearch={setSearchC}
            statusFilter={statusC} onStatusFilter={setStatusC}
            type="campaign" searchPlaceholder="Filtrar por nome..."
          />
        )}
        {activeTab === 'adsets' && (
          <DataTable
            rows={adsets} loading={loadingS} cols={ADSET_COLS}
            visibleCols={adsetCols.visible} onToggleCol={adsetCols.toggle}
            search={searchS} onSearch={setSearchS}
            statusFilter={statusS} onStatusFilter={setStatusS}
            type="adset" searchPlaceholder="Filtrar por conjunto..."
          />
        )}
        {activeTab === 'ads' && (
          <DataTable
            rows={ads} loading={loadingA} cols={AD_COLS}
            visibleCols={adCols.visible} onToggleCol={adCols.toggle}
            search={searchA} onSearch={setSearchA}
            statusFilter={statusA} onStatusFilter={setStatusA}
            type="ad" searchPlaceholder="Filtrar por anúncio..."
          />
        )}
      </div>
    </div>
  )
}
