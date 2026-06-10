'use client'

import { useEffect, useState, useCallback } from 'react'
import { DateRangePicker } from '@/components/DateRangePicker'
import { periodPresets } from '@/lib/metrics'
import { centsToBRL } from '@/lib/integrations'
import {
  Search, RefreshCw, X, Copy, Check, AlertTriangle, Receipt,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Sale {
  id: string
  workspaceId: string
  integrationId: string
  platform: string
  externalId: string
  status: string
  event: string
  grossAmount: number
  netAmount: number
  platformFee: number
  currency: string
  paymentMethod: string | null
  installments: number
  productId: string | null
  productName: string | null
  offerName: string | null
  customerEmail: string | null
  customerName: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmContent: string | null
  utmTerm: string | null
  metaCampaignId: string | null
  metaCampaignName: string | null
  metaAdsetId: string | null
  metaAdsetName: string | null
  metaAdId: string | null
  metaAdName: string | null
  fundsStatus: string | null
  approvedAt: string | null
  refundedAt: string | null
  adAccountId: string | null
  rawData: unknown
  createdAt: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

const dtFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit', month: '2-digit', year: '2-digit',
  hour: '2-digit', minute: '2-digit',
})

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  try { return dtFmt.format(new Date(iso)) } catch { return iso }
}

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  paid:            { bg: '#064e3b', fg: '#34d399', label: 'Pago' },
  refunded:        { bg: '#7f1d1d', fg: '#f87171', label: 'Reembolsado' },
  chargeback:      { bg: '#7f1d1d', fg: '#f87171', label: 'Chargeback' },
  canceled:        { bg: '#3f3f46', fg: '#a1a1aa', label: 'Cancelado' },
  waiting_payment: { bg: '#78350f', fg: '#fbbf24', label: 'Aguardando' },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? { bg: '#1e293b', fg: '#94a3b8', label: status }
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  )
}

function PlatformBadge({ platform }: { platform: string }) {
  const color = platform === 'kiwify' ? '#a855f7' : platform === 'hotmart' ? '#f97316' : '#64748b'
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-md text-xs font-medium capitalize"
      style={{ backgroundColor: '#1e293b', color }}
    >
      {platform}
    </span>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────────

export function SalesDebugClient({ workspaceSlug }: { workspaceSlug: string }) {
  const initial = periodPresets.last30Days()

  const [dateStart, setDateStart] = useState(initial.start)
  const [dateEnd, setDateEnd] = useState(initial.end)
  const [platform, setPlatform] = useState('all')
  const [status, setStatus] = useState('all')
  const [q, setQ] = useState('')

  const [sales, setSales] = useState<Sale[]>([])
  const [summary, setSummary] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Sale | null>(null)

  const fetchSales = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ dateStart, dateEnd, platform, status })
      if (q.trim()) params.set('q', q.trim())
      const r = await fetch(`/api/${workspaceSlug}/sales?${params.toString()}`)
      if (!r.ok) {
        if (r.status === 403) throw new Error('Acesso negado')
        throw new Error('Falha ao carregar vendas')
      }
      const j = await r.json()
      setSales(j.sales ?? [])
      setSummary(j.summary ?? {})
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
      setSales([])
    } finally {
      setLoading(false)
    }
  }, [workspaceSlug, dateStart, dateEnd, platform, status, q])

  // Recarrega ao mudar filtros (exceto busca, que é via Enter/botão)
  useEffect(() => {
    fetchSales()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStart, dateEnd, platform, status])

  const total = sales.length

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5" style={{ color: '#3b82f6' }} />
            <h1 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>
              Vendas (Debug)
            </h1>
          </div>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>
            Inspeção dos dados recebidos via webhook — clique numa venda para ver UTMs e JSON cru.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker
            currentStart={dateStart}
            currentEnd={dateEnd}
            onDateRangeChange={(s, e) => { setDateStart(s); setDateEnd(e) }}
          />
          <button
            onClick={fetchSales}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium transition-colors hover:opacity-80"
            style={{ backgroundColor: '#111827', borderColor: '#1e293b', color: '#e2e8f0' }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} style={{ color: '#3b82f6' }} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#475569' }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') fetchSales() }}
            placeholder="Buscar e-mail, produto ou order_id…"
            className="pl-9 pr-3 py-2 rounded-lg border text-sm w-72 outline-none"
            style={{ backgroundColor: '#111827', borderColor: '#1e293b', color: '#e2e8f0' }}
          />
        </div>

        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm outline-none"
          style={{ backgroundColor: '#111827', borderColor: '#1e293b', color: '#e2e8f0' }}
        >
          <option value="all">Todas plataformas</option>
          <option value="kiwify">Kiwify</option>
          <option value="hotmart">Hotmart</option>
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm outline-none"
          style={{ backgroundColor: '#111827', borderColor: '#1e293b', color: '#e2e8f0' }}
        >
          <option value="all">Todos status</option>
          <option value="paid">Pago</option>
          <option value="waiting_payment">Aguardando</option>
          <option value="refunded">Reembolsado</option>
          <option value="chargeback">Chargeback</option>
          <option value="canceled">Cancelado</option>
        </select>

        <div className="ml-auto flex items-center gap-3 text-xs" style={{ color: '#64748b' }}>
          <span>{total} venda{total === 1 ? '' : 's'}</span>
          {Object.entries(summary).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1">
              <StatusBadge status={k} /> {v}
            </span>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#1e293b' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: '#0d1424' }}>
              {['Data', 'Plataforma', 'Evento', 'Status', 'Produto', 'Cliente', 'Valor bruto', 'UTM'].map((h, i) => (
                <th
                  key={h}
                  className={`px-4 py-3 font-semibold text-xs uppercase tracking-wide ${i === 6 ? 'text-right' : 'text-left'}`}
                  style={{ color: '#475569' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && sales.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-sm" style={{ color: '#64748b' }}>Carregando…</td></tr>
            ) : error ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-sm" style={{ color: '#f87171' }}>{error}</td></tr>
            ) : sales.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-sm" style={{ color: '#64748b' }}>Nenhuma venda recebida neste período.</td></tr>
            ) : (
              sales.map((s) => {
                const hasUtm = !!(s.utmCampaign || s.utmContent || s.utmTerm)
                const hasMeta = !!(s.metaCampaignId || s.metaAdsetId || s.metaAdId)
                const utmBroken = hasUtm && !hasMeta
                return (
                  <tr
                    key={s.id}
                    onClick={() => setSelected(s)}
                    className="cursor-pointer transition-colors border-t hover:opacity-90"
                    style={{ borderColor: '#1e293b', backgroundColor: selected?.id === s.id ? '#1e293b' : 'transparent' }}
                  >
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#94a3b8' }}>{fmtDate(s.createdAt)}</td>
                    <td className="px-4 py-3"><PlatformBadge platform={s.platform} /></td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: '#64748b' }}>{s.event}</td>
                    <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                    <td className="px-4 py-3 max-w-[220px] truncate" style={{ color: '#e2e8f0' }}>{s.productName ?? '—'}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate" style={{ color: '#94a3b8' }}>{s.customerEmail ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-medium whitespace-nowrap" style={{ color: '#f1f5f9' }}>{centsToBRL(s.grossAmount)}</td>
                    <td className="px-4 py-3">
                      {hasMeta ? (
                        <Check className="w-4 h-4" style={{ color: '#34d399' }} />
                      ) : utmBroken ? (
                        <AlertTriangle className="w-4 h-4" style={{ color: '#fbbf24' }} />
                      ) : (
                        <span style={{ color: '#475569' }}>—</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Drawer */}
      {selected && <SaleDrawer sale={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

// ─── Drawer ────────────────────────────────────────────────────────────────────

function Field({ label, value, warn }: { label: string; value: React.ReactNode; warn?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider" style={{ color: '#475569' }}>{label}</span>
      <span className="text-sm font-mono break-all" style={{ color: warn ? '#fbbf24' : '#e2e8f0' }}>
        {value ?? '—'}
      </span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#3b82f6' }}>{title}</h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</div>
    </div>
  )
}

function SaleDrawer({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(sale.rawData ?? {}, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* ignore */ }
  }

  const hasUtm = !!(sale.utmCampaign || sale.utmContent || sale.utmTerm)

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl overflow-y-auto border-l shadow-2xl"
        style={{ backgroundColor: '#0d1424', borderColor: '#1e293b' }}
      >
        {/* Drawer header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b"
          style={{ backgroundColor: '#0d1424', borderColor: '#1e293b' }}
        >
          <div className="flex items-center gap-3">
            <PlatformBadge platform={sale.platform} />
            <StatusBadge status={sale.status} />
            <span className="text-sm font-medium" style={{ color: '#f1f5f9' }}>{centsToBRL(sale.grossAmount)}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: '#94a3b8' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          <Section title="Identificação">
            <Field label="ID" value={sale.id} />
            <Field label="External ID (order)" value={sale.externalId} />
            <Field label="Integration ID" value={sale.integrationId} />
            <Field label="Evento" value={sale.event} />
          </Section>

          <Section title="Valores">
            <Field label="Bruto" value={centsToBRL(sale.grossAmount)} />
            <Field label="Líquido" value={centsToBRL(sale.netAmount)} />
            <Field label="Taxa plataforma" value={centsToBRL(sale.platformFee)} />
            <Field label="Moeda" value={sale.currency} />
            <Field label="Pagamento" value={sale.paymentMethod} />
            <Field label="Parcelas" value={String(sale.installments)} />
          </Section>

          <Section title="Cliente / Produto">
            <Field label="Cliente" value={sale.customerName} />
            <Field label="E-mail" value={sale.customerEmail} />
            <Field label="Produto" value={sale.productName} />
            <Field label="Product ID" value={sale.productId} />
            <Field label="Oferta" value={sale.offerName} />
          </Section>

          <Section title="UTMs (crus)">
            <Field label="utm_source" value={sale.utmSource} />
            <Field label="utm_medium" value={sale.utmMedium} />
            <Field label="utm_campaign" value={sale.utmCampaign} />
            <Field label="utm_content" value={sale.utmContent} />
            <Field label="utm_term" value={sale.utmTerm} />
          </Section>

          <Section title="Meta (parseado)">
            <Field label="Campaign ID" value={sale.metaCampaignId} warn={hasUtm && !sale.metaCampaignId} />
            <Field label="Campaign" value={sale.metaCampaignName} warn={hasUtm && !sale.metaCampaignName} />
            <Field label="AdSet ID" value={sale.metaAdsetId} warn={hasUtm && !sale.metaAdsetId} />
            <Field label="AdSet" value={sale.metaAdsetName} warn={hasUtm && !sale.metaAdsetName} />
            <Field label="Ad ID" value={sale.metaAdId} warn={hasUtm && !sale.metaAdId} />
            <Field label="Ad" value={sale.metaAdName} warn={hasUtm && !sale.metaAdName} />
          </Section>

          <Section title="Datas">
            <Field label="Criado" value={fmtDate(sale.createdAt)} />
            <Field label="Aprovado" value={fmtDate(sale.approvedAt)} />
            <Field label="Reembolsado" value={fmtDate(sale.refundedAt)} />
            <Field label="Funds status" value={sale.fundsStatus} />
          </Section>

          {/* Raw JSON */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#3b82f6' }}>rawData (JSON)</h3>
              <button
                onClick={copyJson}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs transition-colors hover:opacity-80"
                style={{ backgroundColor: '#111827', borderColor: '#1e293b', color: '#94a3b8' }}
              >
                {copied ? <Check className="w-3.5 h-3.5" style={{ color: '#34d399' }} /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado' : 'Copiar JSON'}
              </button>
            </div>
            <pre
              className="text-xs rounded-lg border p-4 overflow-x-auto font-mono"
              style={{ backgroundColor: '#0a0f1e', borderColor: '#1e293b', color: '#94a3b8' }}
            >
              {JSON.stringify(sale.rawData ?? {}, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </>
  )
}
