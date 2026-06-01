'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import {
  Plus, X, Trash2, Copy, Check, CheckCircle, XCircle,
  ChevronDown, ChevronUp, ShoppingBag, Zap, Globe,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Integration {
  id: string
  platform: string
  name: string | null
  isActive: boolean
  createdAt: string
  _count: { sales: number }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function DarkInput({ id, label, placeholder, value, onChange, type = 'text', required, hint }: {
  id: string; label: string; placeholder: string; value: string
  onChange: (v: string) => void; type?: string; required?: boolean; hint?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium mb-1.5" style={{ color: '#94a3b8' }}>
        {label}
      </label>
      <input
        id={id} type={type} placeholder={placeholder} value={value} required={required}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 text-sm rounded-lg border outline-none transition-colors focus:border-blue-500/50"
        style={{ backgroundColor: '#0a0f1e', borderColor: '#1e293b', color: '#f1f5f9' }}
      />
      {hint && <p className="text-xs mt-1.5" style={{ color: '#475569' }}>{hint}</p>}
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:opacity-80 flex-shrink-0"
      style={{ backgroundColor: '#1e293b', borderColor: '#334155', color: copied ? '#10b981' : '#94a3b8' }}>
      {copied ? <><Check className="w-3 h-3" />Copiado</> : <><Copy className="w-3 h-3" />Copiar</>}
    </button>
  )
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="relative">
      <pre className="text-xs p-3 pr-24 rounded-lg overflow-x-auto font-mono leading-relaxed"
        style={{ backgroundColor: '#0a0f1e', color: '#7dd3fc', border: '1px solid #1e293b' }}>
        {children}
      </pre>
      <div className="absolute top-2 right-2">
        <CopyButton text={children} />
      </div>
    </div>
  )
}

// ─── Platform config ──────────────────────────────────────────────────────────

const PLATFORMS = {
  kiwify: {
    label: 'Kiwify',
    color: '#8b5cf6',
    bg: '#8b5cf618',
    border: '#8b5cf640',
    icon: ShoppingBag,
    description: 'Checkout e gestão de vendas',
    tokenLabel: 'Signature (token de validação)',
    tokenHint: 'Token/signature que você definiu nas configurações do webhook da Kiwify',
    steps: [
      'Acesse Kiwify → Configurações → Webhooks',
      'Clique em "Adicionar Webhook"',
      'Cole a URL do webhook gerada abaixo',
      'Defina um token de sua escolha (ex: uma senha forte)',
      'Cole o mesmo token no campo abaixo',
      'Selecione os eventos: order_approved, order_refunded, order_chargeback',
      'Salve e clique em "Testar webhook"',
    ],
  },
  hotmart: {
    label: 'Hotmart',
    color: '#ef4444',
    bg: '#ef444418',
    border: '#ef444440',
    icon: Zap,
    description: 'Produtos digitais e infoprodutos',
    tokenLabel: 'Hottok (token de validação)',
    tokenHint: 'Encontrado em Hotmart → Ferramentas → Webhook → campo "Hottok"',
    steps: [
      'Acesse Hotmart → Ferramentas → Webhook',
      'Clique em "Cadastrar URL"',
      'Cole a URL do webhook gerada abaixo',
      'Copie o "Hottok" exibido pela Hotmart',
      'Cole o hottok no campo abaixo',
      'Selecione os eventos de compra desejados',
      'Salve a configuração',
    ],
  },
} as const

type Platform = keyof typeof PLATFORMS

const UTM_PARAMS = `utm_source=FB&utm_campaign={{campaign.name}}|{{campaign.id}}&utm_medium={{adset.name}}|{{adset.id}}&utm_content={{ad.name}}|{{ad.id}}&utm_term={{placement}}`

// ─── Platform card ────────────────────────────────────────────────────────────

function PlatformCard({
  platform, workspaceSlug, integrations, onAdd, onDelete,
}: {
  platform: Platform
  workspaceSlug: string
  integrations: Integration[]
  onAdd: (i: Integration) => void
  onDelete: (id: string) => void
}) {
  const cfg = PLATFORMS[platform]
  const Icon = cfg.icon
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const [showForm, setShowForm] = useState(false)
  const [showSteps, setShowSteps] = useState(false)
  const [formData, setFormData] = useState({ name: '', webhookToken: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!formData.webhookToken.trim()) { setError('Token é obrigatório'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch(`/api/${workspaceSlug}/integrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, ...formData }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Erro ao salvar') }
      const integration = await res.json()
      onAdd({ ...integration, _count: { sales: 0 } })
      setFormData({ name: '', webhookToken: '' })
      setShowForm(false)
      setShowSteps(false)
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#1e293b' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5" style={{ backgroundColor: '#111827' }}>
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.border}` }}>
            <Icon className="w-5 h-5" style={{ color: cfg.color }} />
          </div>
          <div>
            <p className="font-semibold">{cfg.label}</p>
            <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{cfg.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs tabular-nums" style={{ color: '#475569' }}>
            {integrations.length} integraç{integrations.length !== 1 ? 'ões' : 'ão'} •{' '}
            {integrations.reduce((s, i) => s + i._count.sales, 0)} vendas
          </span>
          <button
            onClick={() => { setShowForm(o => !o); setError('') }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors hover:opacity-80"
            style={{
              backgroundColor: showForm ? '#1e293b' : cfg.bg,
              borderColor: showForm ? '#334155' : cfg.border,
              color: showForm ? '#94a3b8' : cfg.color,
            }}
          >
            {showForm ? <><X className="w-3.5 h-3.5" />Cancelar</> : <><Plus className="w-3.5 h-3.5" />Adicionar</>}
          </button>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="px-6 py-5 border-t space-y-4" style={{ borderColor: '#1e293b', backgroundColor: '#0d1424' }}>

          {/* Step guide toggle */}
          <button
            onClick={() => setShowSteps(o => !o)}
            className="w-full flex items-center justify-between text-xs font-medium rounded-lg px-3 py-2.5 border transition-colors"
            style={{ backgroundColor: '#111827', borderColor: '#1e293b', color: '#60a5fa' }}
          >
            <span>📋 Ver passo a passo de configuração no {cfg.label}</span>
            {showSteps ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showSteps && (
            <ol className="space-y-2.5 px-1">
              {cfg.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-xs" style={{ color: '#94a3b8' }}>
                  <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5"
                    style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          )}

          <DarkInput
            id={`${platform}-name`}
            label="Apelido (opcional)"
            placeholder={`Ex: ${cfg.label} Principal`}
            value={formData.name}
            onChange={v => setFormData(f => ({ ...f, name: v }))}
          />

          <div>
            <p className="text-xs font-medium mb-1.5" style={{ color: '#94a3b8' }}>
              URL do Webhook <span className="font-normal" style={{ color: '#475569' }}>(gerada após salvar)</span>
            </p>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border font-mono text-xs"
              style={{ backgroundColor: '#0a0f1e', borderColor: '#1e293b', color: '#475569' }}>
              {baseUrl}/api/webhooks/{platform}/<span style={{ color: '#7dd3fc' }}>[id-da-integração]</span>
            </div>
          </div>

          <DarkInput
            id={`${platform}-token`}
            label={`${cfg.tokenLabel} *`}
            type="password"
            placeholder="Cole o token aqui"
            hint={cfg.tokenHint}
            value={formData.webhookToken}
            onChange={v => setFormData(f => ({ ...f, webhookToken: v }))}
            required
          />

          {error && (
            <p className="text-xs flex items-center gap-1.5" style={{ color: '#f87171' }}>
              <XCircle className="w-3.5 h-3.5" />{error}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
            style={{ backgroundColor: cfg.color, color: '#fff' }}
          >
            {saving ? 'Salvando...' : `Salvar integração ${cfg.label}`}
          </button>
        </div>
      )}

      {/* Existing integrations */}
      {integrations.length > 0 && (
        <div className="divide-y" style={{ borderColor: '#1e293b' }}>
          {integrations.map(integration => {
            const webhookUrl = `${baseUrl}/api/webhooks/${platform}/${integration.id}`
            return (
              <div key={integration.id} className="px-6 py-4 flex items-start gap-4" style={{ backgroundColor: '#0d1424' }}>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">
                      {integration.name || `${cfg.label} #${integration.id.slice(0, 8)}`}
                    </p>
                    <span className="text-xs px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: '#10b98118', color: '#10b981' }}>
                      {integration._count.sales} venda{integration._count.sales !== 1 ? 's' : ''}
                    </span>
                    {!integration.isActive && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: '#ef444418', color: '#f87171' }}>
                        Inativa
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs px-2.5 py-2 rounded-lg border font-mono truncate"
                      style={{ backgroundColor: '#0a0f1e', borderColor: '#1e293b', color: '#7dd3fc' }}>
                      {webhookUrl}
                    </code>
                    <CopyButton text={webhookUrl} />
                  </div>
                  <p className="text-xs" style={{ color: '#334155' }}>
                    Criado em {new Date(integration.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <button
                  onClick={() => onDelete(integration.id)}
                  className="p-1.5 rounded-lg border transition-colors hover:opacity-80 flex-shrink-0"
                  style={{ backgroundColor: '#ef444410', borderColor: '#ef444430', color: '#f87171' }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {integrations.length === 0 && !showForm && (
        <div className="px-6 py-8 text-center" style={{ backgroundColor: '#0d1424' }}>
          <p className="text-sm" style={{ color: '#334155' }}>Nenhuma integração configurada</p>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const params = useParams()
  const workspaceSlug = params.workspace as string

  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [showUtmGuide, setShowUtmGuide] = useState(false)

  useEffect(() => {
    if (!workspaceSlug) return
    fetch(`/api/${workspaceSlug}/integrations`)
      .then(r => r.json())
      .then(d => setIntegrations(d.integrations ?? []))
      .finally(() => setLoading(false))
  }, [workspaceSlug])

  function handleAdd(integration: Integration) {
    setIntegrations(prev => [integration, ...prev])
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover esta integração? As vendas registradas serão mantidas.')) return
    try {
      await fetch(`/api/${workspaceSlug}/integrations/${id}`, { method: 'DELETE' })
      setIntegrations(prev => prev.filter(i => i.id !== id))
    } catch (e: any) { alert('Erro: ' + e.message) }
  }

  const byPlatform = (platform: Platform) => integrations.filter(i => i.platform === platform)

  return (
    <div className="min-h-full" style={{ backgroundColor: '#0a0f1e', color: '#f1f5f9' }}>

      {/* Header */}
      <div className="px-8 py-5 border-b" style={{ borderColor: '#1e293b' }}>
        <h1 className="text-xl font-bold">Integrações</h1>
        <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
          Conecte plataformas de venda para cruzar dados com campanhas Meta
        </p>
      </div>

      <div className="p-8 space-y-5 max-w-3xl">

        {/* UTM guide */}
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#1e293b' }}>
          <button
            onClick={() => setShowUtmGuide(o => !o)}
            className="w-full flex items-center justify-between px-6 py-4 transition-colors hover:opacity-90"
            style={{ backgroundColor: '#111827' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#3b82f620' }}>
                <Globe className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold">Configurar UTMs nos Anúncios Meta</p>
                <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                  Parâmetros necessários para rastrear vendas por campanha
                </p>
              </div>
            </div>
            {showUtmGuide
              ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: '#475569' }} />
              : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: '#475569' }} />}
          </button>

          {showUtmGuide && (
            <div className="px-6 pb-5 space-y-4 border-t" style={{ borderColor: '#1e293b', backgroundColor: '#0d1424' }}>
              <div className="pt-4 space-y-3">
                <p className="text-xs" style={{ color: '#94a3b8' }}>
                  No Gerenciador de Anúncios Meta, ao criar ou editar um anúncio, vá em{' '}
                  <strong className="text-white">Parâmetros de URL</strong> e cole:
                </p>
                <CodeBlock>{UTM_PARAMS}</CodeBlock>
                <div className="grid grid-cols-1 gap-2 text-xs">
                  {[
                    { param: 'utm_source', value: 'FB', desc: 'Identifica o tráfego como Facebook/Instagram' },
                    { param: 'utm_campaign', value: '{{campaign.name}}|{{campaign.id}}', desc: 'Nome e ID da campanha (separados por |)' },
                    { param: 'utm_medium', value: '{{adset.name}}|{{adset.id}}', desc: 'Nome e ID do conjunto de anúncios' },
                    { param: 'utm_content', value: '{{ad.name}}|{{ad.id}}', desc: 'Nome e ID do anúncio' },
                    { param: 'utm_term', value: '{{placement}}', desc: 'Posicionamento do anúncio' },
                  ].map(({ param, value, desc }) => (
                    <div key={param} className="flex items-start gap-3 p-2.5 rounded-lg" style={{ backgroundColor: '#0a0f1e' }}>
                      <code className="flex-shrink-0 font-mono" style={{ color: '#7dd3fc' }}>{param}</code>
                      <span style={{ color: '#475569' }}>→</span>
                      <div>
                        <code className="font-mono text-[11px]" style={{ color: '#a78bfa' }}>{value}</code>
                        <p className="mt-0.5" style={{ color: '#475569' }}>{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: '#f59e0b10', borderLeft: '3px solid #f59e0b', color: '#fbbf24' }}>
                  Os Meta Macros preenchem automaticamente os valores reais de cada anúncio ao ser exibido.
                  O separador <code className="font-mono">|</code> permite identificar tanto o nome quanto o ID para cruzamento preciso.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Platform cards */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="rounded-xl border h-24 animate-pulse" style={{ backgroundColor: '#111827', borderColor: '#1e293b' }} />
            ))}
          </div>
        ) : (
          <>
            <PlatformCard
              platform="kiwify"
              workspaceSlug={workspaceSlug}
              integrations={byPlatform('kiwify')}
              onAdd={handleAdd}
              onDelete={handleDelete}
            />
            <PlatformCard
              platform="hotmart"
              workspaceSlug={workspaceSlug}
              integrations={byPlatform('hotmart')}
              onAdd={handleAdd}
              onDelete={handleDelete}
            />
          </>
        )}
      </div>
    </div>
  )
}
