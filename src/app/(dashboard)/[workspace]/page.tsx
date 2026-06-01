'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { DateRangePicker } from '@/components/DateRangePicker'
import { periodPresets } from '@/lib/metrics'
import {
  DollarSign, TrendingUp, Users, BarChart2,
  Zap, ChevronUp, ChevronDown, ArrowRight,
  MousePointer, Eye, ShoppingCart, Percent,
  CreditCard, Package, AlertCircle,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface KpiValues {
  spend: number | null
  impressions: number | null
  clicks: number | null
  leads: number | null
  purchases: number | null
  conversionValue: number | null
}

interface DashboardData {
  period: { start: string; end: string }
  previousPeriod: { start: string; end: string }
  kpis: { current: KpiValues; previous: KpiValues }
  daily: Array<{ date: string | Date; spend: number; leads: number; purchases: number; cpl: number; roas: number }>
  campaigns: Array<{ id: string; name: string; status: string | null; spend: number; impressions: number; clicks: number; leads: number; purchases: number; cpl: number | null; roas: number | null }>
}

// ─── Formatters ───────────────────────────────────────────────────────────────

const R$ = (n: number | null | undefined) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n ?? 0)

const Num = (n: number | null | undefined) =>
  new Intl.NumberFormat('pt-BR').format(Math.round(n ?? 0))

const Pct = (n: number) => `${n.toFixed(1)}%`

function pctDelta(curr: number | null | undefined, prev: number | null | undefined) {
  const c = Number(curr ?? 0)
  const p = Number(prev ?? 0)
  if (!p) return null
  return ((c - p) / p) * 100
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DeltaBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-600 text-xs">—</span>
  const pos = value >= 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${pos ? 'text-emerald-400' : 'text-red-400'}`}>
      {pos ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      {Math.abs(value).toFixed(1)}%
    </span>
  )
}

function KpiCard({
  label, value, prevValue, icon: Icon, accent, format = 'currency',
}: {
  label: string
  value: number | null
  prevValue?: number | null
  icon: React.ElementType
  accent: string
  format?: 'currency' | 'number' | 'decimal'
}) {
  const display = format === 'currency' ? R$(value)
    : format === 'decimal' ? (value ?? 0).toFixed(2)
    : Num(value)
  const d = prevValue !== undefined ? pctDelta(value, prevValue) : null

  return (
    <div
      className="rounded-xl p-5 border transition-all duration-200 hover:scale-[1.01]"
      style={{ backgroundColor: '#111827', borderColor: '#1e293b' }}
    >
      <div className="flex items-start justify-between mb-4">
        <p className="text-xs font-medium tracking-widest uppercase" style={{ color: '#64748b' }}>{label}</p>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accent}1a` }}>
          <Icon className="w-4 h-4" style={{ color: accent }} />
        </div>
      </div>
      <p className="text-[1.6rem] font-bold tabular-nums leading-none mb-2" style={{ color: '#f1f5f9' }}>{display}</p>
      {d !== null && <DeltaBadge value={d} />}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-xl p-5 border animate-pulse" style={{ backgroundColor: '#111827', borderColor: '#1e293b' }}>
      <div className="h-3 w-20 rounded mb-4" style={{ backgroundColor: '#1e293b' }} />
      <div className="h-8 w-28 rounded mb-2" style={{ backgroundColor: '#1e293b' }} />
      <div className="h-3 w-12 rounded" style={{ backgroundColor: '#1e293b' }} />
    </div>
  )
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg p-3 shadow-2xl text-sm border" style={{ backgroundColor: '#1e293b', borderColor: '#334155' }}>
      <p className="mb-2 text-xs" style={{ color: '#94a3b8' }}>{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} className="font-medium" style={{ color: entry.color }}>
          {entry.name === 'Spend' ? R$(entry.value) : `${entry.name}: ${Num(entry.value)}`}
        </p>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkspaceDashboardPage() {
  const params = useParams()
  const workspaceSlug = params.workspace as string

  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateStart, setDateStart] = useState(periodPresets.last30Days().start)
  const [dateEnd, setDateEnd] = useState(periodPresets.last30Days().end)

  useEffect(() => {
    if (!workspaceSlug) return
    fetchData()
  }, [workspaceSlug, dateStart, dateEnd])

  async function fetchData() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/${workspaceSlug}/dashboard?dateStart=${dateStart}&dateEnd=${dateEnd}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Erro ${res.status}`)
      }
      setData(await res.json())
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const curr = data?.kpis.current
  const prev = data?.kpis.previous

  const roas = curr?.conversionValue && curr?.spend && Number(curr.spend) > 0
    ? Number(curr.conversionValue) / Number(curr.spend) : 0
  const prevRoas = prev?.conversionValue && prev?.spend && Number(prev.spend) > 0
    ? Number(prev.conversionValue) / Number(prev.spend) : 0

  const ctr = curr?.clicks && curr?.impressions && Number(curr.impressions) > 0
    ? (Number(curr.clicks) / Number(curr.impressions)) * 100 : 0
  const cpl = curr?.leads && curr?.spend && Number(curr.leads) > 0
    ? Number(curr.spend) / Number(curr.leads) : 0

  const funnelSteps = [
    { label: 'Impressões', value: Number(curr?.impressions ?? 0), color: '#3b82f6' },
    { label: 'Cliques',    value: Number(curr?.clicks ?? 0),      color: '#8b5cf6' },
    { label: 'Leads',      value: Number(curr?.leads ?? 0),        color: '#10b981' },
  ]
  const funnelMax = funnelSteps[0].value || 1

  const chartData = (data?.daily ?? []).map(row => ({
    date: new Date(row.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    Spend: Number(row.spend),
    Leads: Number(row.leads),
  }))

  return (
    <div className="min-h-full" style={{ backgroundColor: '#0a0f1e', color: '#f1f5f9' }}>

      {/* ── Header ── */}
      <div className="px-8 py-5 border-b flex items-center justify-between" style={{ borderColor: '#1e293b' }}>
        <div>
          <h1 className="text-xl font-bold">Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
            {dateStart} → {dateEnd}
          </p>
        </div>
        <DateRangePicker
          onDateRangeChange={(s, e) => { setDateStart(s); setDateEnd(e) }}
          currentStart={dateStart}
          currentEnd={dateEnd}
        />
      </div>

      <div className="p-8 space-y-5">

        {/* Error */}
        {error && (
          <div className="rounded-xl p-4 text-sm border" style={{ backgroundColor: '#ef444410', borderColor: '#ef444430', color: '#f87171' }}>
            {error}
          </div>
        )}

        {/* ── KPI Row 1 — Meta Ads ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <KpiCard label="Faturamento" value={Number(curr?.conversionValue ?? 0)} prevValue={Number(prev?.conversionValue ?? 0)} icon={DollarSign} accent="#10b981" />
              <KpiCard label="Custo de Anúncio" value={Number(curr?.spend ?? 0)} prevValue={Number(prev?.spend ?? 0)} icon={BarChart2} accent="#3b82f6" />
              <KpiCard label="ROAS" value={roas} prevValue={prevRoas} icon={TrendingUp} accent="#8b5cf6" format="decimal" />
              <KpiCard label="Leads" value={Number(curr?.leads ?? 0)} prevValue={Number(prev?.leads ?? 0)} icon={Users} accent="#f59e0b" format="number" />
            </>
          )}
        </div>

        {/* ── KPI Row 2 — Métricas de alcance ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <KpiCard label="Impressões" value={Number(curr?.impressions ?? 0)} prevValue={Number(prev?.impressions ?? 0)} icon={Eye} accent="#06b6d4" format="number" />
              <KpiCard label="Cliques" value={Number(curr?.clicks ?? 0)} prevValue={Number(prev?.clicks ?? 0)} icon={MousePointer} accent="#f97316" format="number" />
              <KpiCard label="CPL" value={cpl} prevValue={prev?.leads && prev?.spend && Number(prev.leads) > 0 ? Number(prev.spend) / Number(prev.leads) : null} icon={Users} accent="#ec4899" />
              <KpiCard label="Compras" value={Number(curr?.purchases ?? 0)} prevValue={Number(prev?.purchases ?? 0)} icon={ShoppingCart} accent="#a78bfa" format="number" />
            </>
          )}
        </div>

        {/* ── Vendas (Hotmart/Kiwify) placeholders ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <p className="text-xs font-medium tracking-widest uppercase" style={{ color: '#475569' }}>Vendas</p>
            <span className="px-2 py-0.5 rounded-full text-xs border" style={{ backgroundColor: '#f59e0b10', borderColor: '#f59e0b30', color: '#fbbf24' }}>
              Requer integração
            </span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Faturamento Líquido', icon: DollarSign, accent: '#10b981' },
              { label: 'Vendas Finalizadas',  icon: ShoppingCart, accent: '#3b82f6' },
              { label: 'Taxa de Aprovação',   icon: Percent,      accent: '#8b5cf6' },
              { label: 'Ticket Médio',        icon: CreditCard,   accent: '#f59e0b' },
            ].map(({ label, icon: Icon, accent }) => (
              <div key={label}
                className="rounded-xl p-5 border border-dashed"
                style={{ backgroundColor: '#111827', borderColor: '#1e293b' }}>
                <div className="flex items-start justify-between mb-4">
                  <p className="text-xs font-medium tracking-widest uppercase" style={{ color: '#475569' }}>{label}</p>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accent}1a` }}>
                    <Icon className="w-4 h-4" style={{ color: accent, opacity: 0.4 }} />
                  </div>
                </div>
                <p className="text-lg font-bold mb-1" style={{ color: '#334155' }}>—</p>
                <button
                  className="text-xs transition-opacity hover:opacity-80"
                  style={{ color: '#3b82f6' }}>
                  + Conectar Hotmart/Kiwify
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Row 2: Funil + Métricas + Integração ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Funil */}
          <div className="rounded-xl border p-5" style={{ backgroundColor: '#111827', borderColor: '#1e293b' }}>
            <p className="text-xs font-medium tracking-widest uppercase mb-5" style={{ color: '#64748b' }}>Funil de Conversão</p>
            {loading ? (
              <div className="space-y-3 animate-pulse">
                {[100, 65, 30].map((w, i) => (
                  <div key={i} className="rounded-lg h-10" style={{ width: `${w}%`, backgroundColor: '#1e293b' }} />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {funnelSteps.map((step, i) => {
                  const pct = (step.value / funnelMax) * 100
                  const conv = i > 0 && funnelSteps[i - 1].value > 0
                    ? (step.value / funnelSteps[i - 1].value) * 100 : null
                  return (
                    <div key={step.label}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span style={{ color: '#94a3b8' }}>{step.label}</span>
                        <span className="tabular-nums font-medium">
                          {Num(step.value)}
                          {conv !== null && (
                            <span className="ml-1.5" style={{ color: '#475569' }}>({Pct(conv)})</span>
                          )}
                        </span>
                      </div>
                      <div className="h-6 rounded-md overflow-hidden" style={{ backgroundColor: '#1e293b' }}>
                        <div
                          className="h-full rounded-md"
                          style={{
                            width: `${Math.max(pct, 3)}%`,
                            backgroundColor: `${step.color}28`,
                            borderLeft: `3px solid ${step.color}`,
                            transition: 'width 0.6s ease',
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Métricas */}
          <div className="rounded-xl border p-5" style={{ backgroundColor: '#111827', borderColor: '#1e293b' }}>
            <p className="text-xs font-medium tracking-widest uppercase mb-5" style={{ color: '#64748b' }}>Métricas</p>
            {loading ? (
              <div className="space-y-4 animate-pulse">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <div className="h-3 w-16 rounded" style={{ backgroundColor: '#1e293b' }} />
                    <div className="h-3 w-20 rounded" style={{ backgroundColor: '#1e293b' }} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: '#1e293b' }}>
                {[
                  { label: 'CPL', value: R$(cpl), icon: Users },
                  { label: 'CTR', value: Pct(ctr), icon: MousePointer },
                  { label: 'Impressões', value: Num(curr?.impressions), icon: Eye },
                  { label: 'Cliques', value: Num(curr?.clicks), icon: MousePointer },
                  { label: 'Compras', value: Num(curr?.purchases), icon: DollarSign },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5" style={{ color: '#475569' }} />
                      <span className="text-sm" style={{ color: '#94a3b8' }}>{label}</span>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Placeholder integração */}
          <div
            className="rounded-xl border-2 border-dashed p-5 flex flex-col items-center justify-center text-center"
            style={{ backgroundColor: '#111827', borderColor: '#1e293b' }}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: '#1e293b' }}>
              <Zap className="w-6 h-6" style={{ color: '#475569' }} />
            </div>
            <p className="font-semibold text-sm mb-1">Taxa de Aprovação</p>
            <p className="text-xs leading-relaxed mb-5" style={{ color: '#64748b' }}>
              Conecte Hotmart ou Kiwify para cruzar dados de vendas com UTMs da Meta
            </p>
            <button
              className="px-4 py-2 text-xs font-medium rounded-lg border transition-colors hover:opacity-80"
              style={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#94a3b8' }}
            >
              + Integrar plataforma
            </button>
          </div>
        </div>

        {/* ── Area Chart ── */}
        <div className="rounded-xl border p-5" style={{ backgroundColor: '#111827', borderColor: '#1e293b' }}>
          <div className="flex items-center justify-between mb-5">
            <p className="text-xs font-medium tracking-widest uppercase" style={{ color: '#64748b' }}>Evolução Diária</p>
            <div className="flex items-center gap-4 text-xs" style={{ color: '#64748b' }}>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-0.5 rounded bg-blue-500" />
                Spend
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-0.5 rounded bg-emerald-500" />
                Leads
              </span>
            </div>
          </div>
          {loading ? (
            <div className="h-56 rounded-lg animate-pulse" style={{ backgroundColor: '#1e293b' }} />
          ) : chartData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm" style={{ color: '#475569' }}>
              Sem dados no período selecionado
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gSpend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} width={45} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="Spend" stroke="#3b82f6" strokeWidth={2} fill="url(#gSpend)" dot={false} />
                <Area type="monotone" dataKey="Leads" stroke="#10b981" strokeWidth={2} fill="url(#gLeads)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Top Campanhas ── */}
        {!loading && (data?.campaigns?.length ?? 0) > 0 && (
          <div className="rounded-xl border p-5" style={{ backgroundColor: '#111827', borderColor: '#1e293b' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-medium tracking-widest uppercase" style={{ color: '#64748b' }}>Top Campanhas</p>
              <a
                href={`/${workspaceSlug}/campaigns`}
                className="flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-70"
                style={{ color: '#3b82f6' }}
              >
                Ver todas <ArrowRight className="w-3 h-3" />
              </a>
            </div>
            <div className="divide-y" style={{ borderColor: '#1e293b' }}>
              {data!.campaigns.slice(0, 5).map(c => {
                const r = Number(c.roas ?? 0)
                return (
                  <div key={c.id} className="flex items-center gap-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate font-medium">{c.name}</p>
                    </div>
                    <span className="text-sm tabular-nums" style={{ color: '#94a3b8' }}>{R$(Number(c.spend))}</span>
                    <span className={`text-xs font-semibold tabular-nums ${r >= 2 ? 'text-emerald-400' : r >= 1 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {r.toFixed(2)}x
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
