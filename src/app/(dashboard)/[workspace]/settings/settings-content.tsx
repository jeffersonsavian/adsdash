'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  RefreshCw, Trash2, Plus, X, Globe, Clock,
  CheckCircle, XCircle, Users, Zap, Copy, Check,
  ChevronDown, ChevronUp, ArrowUpRight, ShoppingBag,
  ShieldCheck, AlertTriangle, Eye, EyeOff,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdAccount {
  id: string; externalAccountId: string; name?: string | null
  platform: string; isActive: boolean; lastSyncedAt?: Date | null; createdAt: Date | string
}
interface Integration {
  id: string; platform: string; name: string | null
  isActive: boolean; createdAt: string; _count: { sales: number }
}

interface Props {
  workspaceSlug: string; workspaceName: string
  workspaceTimezone: string; workspaceCurrency: string
  initialAdAccounts: AdAccount[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0" style={{ borderColor: '#1e293b' }}>
      <span className="text-sm" style={{ color: '#64748b' }}>{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

function DarkInput({ id, label, placeholder, value, onChange, type = 'text', required, hint }: {
  id: string; label: string; placeholder: string; value: string
  onChange: (v: string) => void; type?: string; required?: boolean; hint?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium mb-1.5" style={{ color: '#94a3b8' }}>{label}</label>
      <input
        id={id} type={type} placeholder={placeholder} value={value} required={required}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 text-sm rounded-lg border outline-none transition-colors focus:border-blue-500/50"
        style={{ backgroundColor: '#0a0f1e', borderColor: '#1e293b', color: '#f1f5f9' }}
      />
      {hint && <p className="text-xs mt-1" style={{ color: '#475569' }}>{hint}</p>}
    </div>
  )
}

function Section({ title, description, children, action }: {
  title: string; description?: string; children: React.ReactNode; action?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#111827', borderColor: '#1e293b' }}>
      <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#1e293b' }}>
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{description}</p>}
        </div>
        {action}
      </div>
      <div className="px-6 py-4">{children}</div>
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
    <div className="relative group">
      <pre
        className="text-xs p-3 rounded-lg overflow-x-auto font-mono leading-relaxed"
        style={{ backgroundColor: '#0a0f1e', color: '#7dd3fc', border: '1px solid #1e293b' }}
      >
        {children}
      </pre>
      <div className="absolute top-2 right-2">
        <CopyButton text={children} />
      </div>
    </div>
  )
}

const PLATFORM_CONFIG = {
  kiwify: {
    label: 'Kiwify',
    color: '#8b5cf6',
    bg: '#8b5cf618',
    icon: ShoppingBag,
    tokenLabel: 'Signature (token de validação)',
    tokenHint: 'Cole aqui o token/signature configurado no webhook da Kiwify',
    docsUrl: 'https://docs.kiwify.com.br',
    steps: [
      'Acesse sua conta Kiwify → Configurações → Webhooks',
      'Clique em "Adicionar Webhook"',
      'Cole a URL do webhook gerada acima',
      'Defina um token/signature de sua escolha e cole-o no campo abaixo',
      'Selecione os eventos: order_approved, order_refunded, order_chargeback',
      'Salve e clique em "Testar"',
    ],
  },
  hotmart: {
    label: 'Hotmart',
    color: '#ef4444',
    bg: '#ef444418',
    icon: Zap,
    tokenLabel: 'Hottok (token de validação)',
    tokenHint: 'O hottok é encontrado em Ferramentas → Webhook na sua conta Hotmart',
    docsUrl: 'https://developers.hotmart.com/docs/pt-BR/webhooks',
    steps: [
      'Acesse sua conta Hotmart → Ferramentas → Webhook',
      'Clique em "Cadastrar URL"',
      'Cole a URL do webhook gerada acima',
      'Copie o "Hottok" exibido pela Hotmart e cole-o abaixo',
      'Selecione os eventos de compra desejados',
      'Salve a configuração',
    ],
  },
}

const UTM_TEMPLATE = `utm_source=FB
utm_campaign={{campaign.name}}|{{campaign.id}}
utm_medium={{adset.name}}|{{adset.id}}
utm_content={{ad.name}}|{{ad.id}}
utm_term={{placement}}`

const UTM_URL_EXAMPLE = `https://seusite.com.br/pagina?utm_source=FB&utm_campaign={{campaign.name}}|{{campaign.id}}&utm_medium={{adset.name}}|{{adset.id}}&utm_content={{ad.name}}|{{ad.id}}&utm_term={{placement}}`

// ─── Integration section ──────────────────────────────────────────────────────

function IntegrationSection({ workspaceSlug }: { workspaceSlug: string }) {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState<'kiwify' | 'hotmart' | null>(null)
  const [formData, setFormData] = useState({ name: '', webhookToken: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  useEffect(() => {
    fetchIntegrations()
  }, [])

  async function fetchIntegrations() {
    try {
      const res = await fetch(`/api/${workspaceSlug}/integrations`)
      if (res.ok) {
        const data = await res.json()
        setIntegrations(data.integrations ?? [])
      }
    } catch { } finally { setLoading(false) }
  }

  async function handleSave(platform: 'kiwify' | 'hotmart') {
    if (!formData.webhookToken.trim()) { setError('Token é obrigatório'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch(`/api/${workspaceSlug}/integrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, ...formData }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Erro ao salvar')
      }
      const integration = await res.json()
      setIntegrations(prev => [{ ...integration, _count: { sales: 0 } }, ...prev])
      setShowForm(null)
      setFormData({ name: '', webhookToken: '' })
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover esta integração? As vendas registradas serão mantidas.')) return
    try {
      await fetch(`/api/${workspaceSlug}/integrations/${id}`, { method: 'DELETE' })
      setIntegrations(prev => prev.filter(i => i.id !== id))
    } catch (e: any) { alert('Erro: ' + e.message) }
  }

  const platforms = Object.entries(PLATFORM_CONFIG) as [keyof typeof PLATFORM_CONFIG, typeof PLATFORM_CONFIG['kiwify']][]

  return (
    <div className="space-y-4">
      {/* UTM guide */}
      <div className="rounded-xl border p-4" style={{ backgroundColor: '#0d1424', borderColor: '#1e293b' }}>
        <button
          className="w-full flex items-center justify-between text-sm font-medium"
          onClick={() => setExpandedGuide(expandedGuide === 'utm' ? null : 'utm')}
        >
          <span className="flex items-center gap-2">
            <span className="w-5 h-5 rounded flex items-center justify-center text-xs" style={{ backgroundColor: '#3b82f620', color: '#60a5fa' }}>↗</span>
            Como configurar UTMs nos seus anúncios Meta
          </span>
          {expandedGuide === 'utm' ? <ChevronUp className="w-4 h-4" style={{ color: '#475569' }} /> : <ChevronDown className="w-4 h-4" style={{ color: '#475569' }} />}
        </button>
        {expandedGuide === 'utm' && (
          <div className="mt-4 space-y-3">
            <p className="text-xs" style={{ color: '#94a3b8' }}>
              No Gerenciador de Anúncios Meta, ao criar/editar um anúncio, adicione os parâmetros abaixo no campo
              <strong className="text-white"> "Parâmetros de URL"</strong>:
            </p>
            <CodeBlock>{UTM_TEMPLATE}</CodeBlock>
            <p className="text-xs" style={{ color: '#64748b' }}>
              Ou como URL completa:
            </p>
            <CodeBlock>{UTM_URL_EXAMPLE}</CodeBlock>
            <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: '#f59e0b10', borderLeft: '3px solid #f59e0b', color: '#fbbf24' }}>
              O formato <code className="font-mono">{'{{campaign.name}}|{{campaign.id}}'}</code> envia automaticamente
              nome e ID separados por <code className="font-mono">|</code>, permitindo cruzamento preciso com as vendas.
            </div>
          </div>
        )}
      </div>

      {/* Platform cards */}
      {platforms.map(([platform, cfg]) => {
        const Icon = cfg.icon
        const existing = integrations.filter(i => i.platform === platform)
        const isAdding = showForm === platform

        return (
          <div key={platform} className="rounded-xl border overflow-hidden" style={{ borderColor: '#1e293b' }}>
            {/* Platform header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ backgroundColor: '#0d1424' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: cfg.bg }}>
                  <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                </div>
                <div>
                  <p className="text-sm font-semibold">{cfg.label}</p>
                  <p className="text-xs" style={{ color: '#64748b' }}>
                    {existing.length} integraç{existing.length !== 1 ? 'ões' : 'ão'} •{' '}
                    {existing.reduce((s, i) => s + i._count.sales, 0)} vendas
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowForm(isAdding ? null : platform); setError('') }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:opacity-80"
                style={{
                  backgroundColor: isAdding ? '#1e293b' : cfg.color + '20',
                  borderColor: isAdding ? '#334155' : cfg.color + '50',
                  color: isAdding ? '#94a3b8' : cfg.color,
                }}
              >
                {isAdding ? <><X className="w-3.5 h-3.5" />Cancelar</> : <><Plus className="w-3.5 h-3.5" />Adicionar</>}
              </button>
            </div>

            {/* Add form */}
            {isAdding && (
              <div className="px-5 py-4 border-t space-y-4" style={{ borderColor: '#1e293b', backgroundColor: '#111827' }}>
                {/* Step guide */}
                <button
                  className="w-full flex items-center justify-between text-xs"
                  onClick={() => setExpandedGuide(expandedGuide === platform ? null : platform)}
                >
                  <span style={{ color: '#60a5fa' }}>Ver instruções de configuração no {cfg.label}</span>
                  {expandedGuide === platform ? <ChevronUp className="w-3.5 h-3.5 text-blue-400" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-400" />}
                </button>
                {expandedGuide === platform && (
                  <ol className="space-y-2 text-xs pl-1" style={{ color: '#94a3b8' }}>
                    {cfg.steps.map((step, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold"
                          style={{ backgroundColor: cfg.color + '20', color: cfg.color }}>
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                )}

                <DarkInput id={`${platform}-name`} label="Apelido (opcional)"
                  placeholder={`Ex: ${cfg.label} Principal`}
                  value={formData.name} onChange={v => setFormData(f => ({ ...f, name: v }))} />

                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#94a3b8' }}>
                    URL do Webhook <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs px-3 py-2.5 rounded-lg border font-mono truncate"
                      style={{ backgroundColor: '#0a0f1e', borderColor: '#1e293b', color: '#7dd3fc' }}>
                      {baseUrl}/api/webhooks/{platform}/[ID após salvar]
                    </code>
                  </div>
                  <p className="text-xs mt-1" style={{ color: '#475569' }}>
                    A URL completa será gerada após salvar a integração
                  </p>
                </div>

                <DarkInput id={`${platform}-token`} label={cfg.tokenLabel} type="password"
                  placeholder="Cole o token aqui"
                  hint={cfg.tokenHint}
                  value={formData.webhookToken} onChange={v => setFormData(f => ({ ...f, webhookToken: v }))}
                  required />

                {error && (
                  <p className="text-xs flex items-center gap-1.5" style={{ color: '#f87171' }}>
                    <XCircle className="w-3.5 h-3.5" />{error}
                  </p>
                )}

                <button
                  onClick={() => handleSave(platform)}
                  disabled={saving}
                  className="w-full py-2.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: cfg.color, color: '#fff' }}
                >
                  {saving ? 'Salvando...' : `Salvar integração ${cfg.label}`}
                </button>
              </div>
            )}

            {/* Existing integrations */}
            {existing.length > 0 && (
              <div className="divide-y" style={{ borderColor: '#1e293b' }}>
                {existing.map(integration => {
                  const webhookUrl = `${baseUrl}/api/webhooks/${platform}/${integration.id}`
                  return (
                    <div key={integration.id} className="px-5 py-4" style={{ backgroundColor: '#111827' }}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{integration.name || `${cfg.label} #${integration.id.slice(0, 8)}`}</p>
                            <span className="text-xs px-1.5 py-0.5 rounded-full"
                              style={{ backgroundColor: '#10b98118', color: '#10b981' }}>
                              {integration._count.sales} vendas
                            </span>
                          </div>
                          {/* Webhook URL */}
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border font-mono truncate"
                              style={{ backgroundColor: '#0a0f1e', borderColor: '#1e293b', color: '#7dd3fc' }}>
                              {webhookUrl}
                            </code>
                            <CopyButton text={webhookUrl} />
                          </div>
                          <p className="text-xs" style={{ color: '#475569' }}>
                            Criado em {new Date(integration.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDelete(integration.id)}
                          className="p-1.5 rounded-lg border transition-colors hover:opacity-80 flex-shrink-0"
                          style={{ backgroundColor: '#ef444410', borderColor: '#ef444430', color: '#f87171' }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Empty */}
            {!loading && existing.length === 0 && !isAdding && (
              <div className="px-5 py-6 text-center" style={{ backgroundColor: '#111827' }}>
                <p className="text-xs" style={{ color: '#475569' }}>Nenhuma integração configurada</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Meta App section ─────────────────────────────────────────────────────────

function MetaAppSection({ workspaceSlug }: { workspaceSlug: string }) {
  const [config, setConfig] = useState<{ metaAppId: string | null; metaAppConfigured: boolean; planName: string; maxAdAccounts: number; adAccountCount: number } | null>(null)
  const [form, setForm] = useState({ metaAppId: '', metaAppSecret: '' })
  const [showSecret, setShowSecret] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const redirectUri = typeof window !== 'undefined'
    ? `${window.location.origin}/api/oauth/meta/callback`
    : '/api/oauth/meta/callback'

  useEffect(() => {
    fetch(`/api/${workspaceSlug}/settings`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setConfig(data) })
  }, [workspaceSlug])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(''); setSuccess(false)
    try {
      const res = await fetch(`/api/${workspaceSlug}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Erro ao salvar')
      }
      setSuccess(true)
      setEditing(false)
      setForm({ metaAppId: '', metaAppSecret: '' })
      // Reload config
      const updated = await fetch(`/api/${workspaceSlug}/settings`).then(r => r.json())
      setConfig(updated)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  async function clearApp() {
    if (!confirm('Remover configuração do Meta App? As contas já conectadas continuarão funcionando até o token expirar.')) return
    await fetch(`/api/${workspaceSlug}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metaAppId: '', metaAppSecret: '' }),
    })
    const updated = await fetch(`/api/${workspaceSlug}/settings`).then(r => r.json())
    setConfig(updated)
  }

  const accountsLeft = config ? config.maxAdAccounts - config.adAccountCount : 0

  return (
    <div className="space-y-4">
      {/* Plan limits */}
      {config && (
        <div className="flex items-center justify-between p-3 rounded-lg border" style={{ backgroundColor: '#0d1424', borderColor: '#1e293b' }}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ backgroundColor: '#1e293b', color: '#94a3b8' }}>
              Plano: {config.planName}
            </span>
            <span className="text-xs" style={{ color: '#64748b' }}>
              {config.adAccountCount} de {config.maxAdAccounts} contas de anúncio utilizadas
            </span>
          </div>
          {accountsLeft <= 0 && (
            <span className="flex items-center gap-1 text-xs" style={{ color: '#f59e0b' }}>
              <AlertTriangle className="w-3.5 h-3.5" />
              Limite atingido
            </span>
          )}
        </div>
      )}

      {/* Meta App status */}
      <div className="flex items-center justify-between p-4 rounded-xl border" style={{ backgroundColor: '#0d1424', borderColor: '#1e293b' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#1877f220' }}>
            <ShieldCheck className="w-4 h-4" style={{ color: '#1877f2' }} />
          </div>
          <div>
            <p className="text-sm font-medium">Meta App</p>
            {config?.metaAppConfigured ? (
              <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: '#10b981' }}>
                <CheckCircle className="w-3 h-3" />
                Configurado {config.metaAppId ? `(App ID: ${config.metaAppId})` : ''}
              </p>
            ) : (
              <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: '#f59e0b' }}>
                <AlertTriangle className="w-3 h-3" />
                Não configurado — necessário para conectar contas Meta
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {config?.metaAppConfigured && (
            <button onClick={clearApp} className="text-xs px-2 py-1 rounded border hover:opacity-80" style={{ borderColor: '#ef444430', color: '#f87171' }}>
              Remover
            </button>
          )}
          <button
            onClick={() => setEditing(e => !e)}
            className="text-xs px-3 py-1.5 rounded-lg border hover:opacity-80"
            style={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#94a3b8' }}
          >
            {editing ? 'Cancelar' : config?.metaAppConfigured ? 'Alterar' : 'Configurar'}
          </button>
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <form onSubmit={save} className="p-4 rounded-xl border space-y-4" style={{ backgroundColor: '#0d1424', borderColor: '#1e293b' }}>
          <div className="p-3 rounded-lg text-xs space-y-1" style={{ backgroundColor: '#1e3a5f30', borderLeft: '3px solid #3b82f6', paddingLeft: '12px' }}>
            <p className="font-medium" style={{ color: '#93c5fd' }}>Configure no Meta for Developers</p>
            <p style={{ color: '#64748b' }}>
              No seu Meta App, adicione este Redirect URI em <strong style={{ color: '#94a3b8' }}>Configurações → OAuth Básico</strong>:
            </p>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#0a0f1e', color: '#7dd3fc' }}>{redirectUri}</code>
              <CopyButton text={redirectUri} />
            </div>
          </div>

          <DarkInput
            id="meta-app-id"
            label="App ID"
            placeholder="Ex: 123456789012345"
            value={form.metaAppId}
            onChange={v => setForm(f => ({ ...f, metaAppId: v }))}
            required
          />
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#94a3b8' }}>App Secret</label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                placeholder="Cole o App Secret aqui"
                value={form.metaAppSecret}
                onChange={e => setForm(f => ({ ...f, metaAppSecret: e.target.value }))}
                required
                className="w-full px-3 py-2.5 pr-10 text-sm rounded-lg border outline-none"
                style={{ backgroundColor: '#0a0f1e', borderColor: '#1e293b', color: '#f1f5f9' }}
              />
              <button type="button" onClick={() => setShowSecret(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2">
                {showSecret
                  ? <EyeOff className="w-4 h-4" style={{ color: '#475569' }} />
                  : <Eye className="w-4 h-4" style={{ color: '#475569' }} />}
              </button>
            </div>
            <p className="text-xs mt-1" style={{ color: '#475569' }}>
              O App Secret é armazenado encriptado. Nunca é exibido após salvar.
            </p>
          </div>

          {error && <p className="text-xs flex items-center gap-1.5" style={{ color: '#f87171' }}><XCircle className="w-3.5 h-3.5" />{error}</p>}
          {success && <p className="text-xs flex items-center gap-1.5" style={{ color: '#10b981' }}><CheckCircle className="w-3.5 h-3.5" />Salvo com sucesso</p>}

          <button type="submit" disabled={saving} className="w-full py-2.5 rounded-lg text-sm font-medium hover:opacity-80 disabled:opacity-50" style={{ backgroundColor: '#1877f2', color: '#fff' }}>
            {saving ? 'Salvando...' : 'Salvar Meta App'}
          </button>
        </form>
      )}
    </div>
  )
}

// ─── Ad accounts section ──────────────────────────────────────────────────────

function AdAccountsSection({ workspaceSlug, initial }: { workspaceSlug: string; initial: AdAccount[] }) {
  const [accounts, setAccounts] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ externalAccountId: '', accessToken: '', name: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const res = await fetch(`/api/${workspaceSlug}/ad-accounts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Erro') }
      const acc = await res.json()
      setAccounts(prev => [...prev, acc])
      setFormData({ externalAccountId: '', accessToken: '', name: '' })
      setShowForm(false)
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  async function handleSync(id: string) {
    setSyncingId(id); setSyncSuccess(null)
    try {
      const res = await fetch(`/api/${workspaceSlug}/ad-accounts/${id}/sync`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Erro') }
      setSyncSuccess(id); setTimeout(() => setSyncSuccess(null), 3000)
    } catch (e: any) { alert('Erro: ' + e.message) } finally { setSyncingId(null) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover esta conta?')) return
    try {
      await fetch(`/api/${workspaceSlug}/ad-accounts/${id}`, { method: 'DELETE' })
      setAccounts(prev => prev.filter(a => a.id !== id))
    } catch (e: any) { alert('Erro: ' + e.message) }
  }

  return (
    <>
      {showForm && (
        <form onSubmit={handleAdd} className="mb-5 p-4 rounded-xl border space-y-4" style={{ backgroundColor: '#0d1424', borderColor: '#1e293b' }}>
          <DarkInput id="acc-name" label="Nome da Conta" placeholder="Ex: Conta Principal"
            value={formData.name} onChange={v => setFormData(f => ({ ...f, name: v }))} />
          <DarkInput id="acc-id" label="ID da Conta Meta" placeholder="Ex: 1234567890 (sem act_)"
            value={formData.externalAccountId} onChange={v => setFormData(f => ({ ...f, externalAccountId: v }))} required />
          <DarkInput id="acc-token" label="Token de Acesso" type="password"
            placeholder="Token estendido (60 dias)" hint="Gere em: Meta for Developers → Ferramentas → Access Token Debugger"
            value={formData.accessToken} onChange={v => setFormData(f => ({ ...f, accessToken: v }))} required />
          {error && <p className="text-xs flex items-center gap-1.5" style={{ color: '#f87171' }}><XCircle className="w-3.5 h-3.5" />{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
            style={{ backgroundColor: '#1877f2', color: '#fff' }}>
            {loading ? 'Adicionando...' : 'Adicionar Conta'}
          </button>
        </form>
      )}

      {accounts.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: '#1e293b' }}>
            <Globe className="w-5 h-5" style={{ color: '#475569' }} />
          </div>
          <p className="text-sm mb-1" style={{ color: '#94a3b8' }}>Nenhuma conta vinculada</p>
          <p className="text-xs" style={{ color: '#475569' }}>Adicione uma conta Meta Ads para sincronizar métricas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map(acc => (
            <div key={acc.id} className="flex items-center gap-4 p-4 rounded-xl border"
              style={{ backgroundColor: '#0d1424', borderColor: '#1e293b' }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#1877f220' }}>
                <Globe className="w-4 h-4" style={{ color: '#1877f2' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{acc.name || acc.externalAccountId}</p>
                  <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: acc.isActive ? '#10b98118' : '#64748b18', color: acc.isActive ? '#10b981' : '#64748b' }}>
                    {acc.isActive ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: '#475569' }}>act_{acc.externalAccountId} • {acc.platform}</p>
                {acc.lastSyncedAt && (
                  <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#475569' }}>
                    <Clock className="w-3 h-3" />
                    Último sync: {new Date(acc.lastSyncedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {syncSuccess === acc.id && (
                  <span className="text-xs flex items-center gap-1" style={{ color: '#10b981' }}>
                    <CheckCircle className="w-3.5 h-3.5" />Enfileirado
                  </span>
                )}
                <button onClick={() => handleSync(acc.id)} disabled={syncingId === acc.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 hover:opacity-80"
                  style={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#94a3b8' }}>
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingId === acc.id ? 'animate-spin' : ''}`} />
                  {syncingId === acc.id ? 'Sincronizando...' : 'Sync'}
                </button>
                <button onClick={() => handleDelete(acc.id)}
                  className="p-1.5 rounded-lg border transition-colors hover:opacity-80"
                  style={{ backgroundColor: '#ef444410', borderColor: '#ef444430', color: '#f87171' }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ─── OAuth Account Selector Modal ─────────────────────────────────────────────

interface MetaAdAccountOption {
  id: string
  name: string
  account_status: number
}

interface OAuthSelectionData {
  adAccounts: MetaAdAccountOption[]
  expiresAt: string
  slug: string
}

function OAuthAccountSelector({
  selectionKey,
  workspaceSlug,
  onConnected,
  onClose,
}: {
  selectionKey: string
  workspaceSlug: string
  onConnected: (count: number) => void
  onClose: () => void
}) {
  const [data, setData] = useState<OAuthSelectionData | null>(null)
  const [planInfo, setPlanInfo] = useState<{ maxAdAccounts: number; adAccountCount: number } | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    async function load() {
      const [selRes, planRes] = await Promise.all([
        fetch(`/api/oauth/meta/select?key=${encodeURIComponent(selectionKey)}`),
        fetch(`/api/${workspaceSlug}/settings`),
      ])
      if (!selRes.ok) {
        setLoadError('Sessão OAuth expirada ou inválida. Clique em "Conectar com Meta" novamente.')
        return
      }
      const selData = await selRes.json()
      setData(selData)
      if (planRes.ok) setPlanInfo(await planRes.json())
    }
    load()
  }, [selectionKey, workspaceSlug])

  const availableSlots = planInfo ? planInfo.maxAdAccounts - planInfo.adAccountCount : 99
  const expiresDate = data?.expiresAt ? new Date(data.expiresAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''

  function toggleAccount(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (next.size >= availableSlots) return prev
        next.add(id)
      }
      return next
    })
  }

  async function connect() {
    if (selected.size === 0) return
    setConnecting(true)
    setError('')
    try {
      const res = await fetch('/api/oauth/meta/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: selectionKey, selectedAccountIds: Array.from(selected) }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Erro ao conectar contas')
      onConnected(result.connected?.length ?? 0)
    } catch (e: any) {
      setError(e.message)
      setConnecting(false)
    }
  }

  return (
    // Full-screen overlay
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="relative w-full max-w-md mx-4 rounded-2xl border shadow-2xl overflow-hidden"
        style={{ backgroundColor: '#111827', borderColor: '#1e293b' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: '#1e293b' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1877f220' }}>
              {/* Meta logo SVG */}
              <svg viewBox="0 0 24 24" fill="#1877f2" className="w-5 h-5">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>Contas Meta disponíveis</h2>
              {expiresDate && (
                <p className="text-xs mt-0.5" style={{ color: '#475569' }}>Token válido até {expiresDate}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:opacity-70">
            <X className="w-4 h-4" style={{ color: '#64748b' }} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {loadError ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <AlertTriangle className="w-8 h-8" style={{ color: '#f59e0b' }} />
              <p className="text-sm" style={{ color: '#94a3b8' }}>{loadError}</p>
              <button onClick={onClose} className="mt-1 text-xs px-4 py-2 rounded-lg" style={{ backgroundColor: '#1e293b', color: '#94a3b8' }}>
                Fechar
              </button>
            </div>
          ) : !data ? (
            <div className="flex items-center justify-center py-8 gap-2" style={{ color: '#475569' }}>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">Carregando contas...</span>
            </div>
          ) : (
            <>
              {/* Plan info */}
              <div className="flex items-center justify-between mb-4 p-3 rounded-lg" style={{ backgroundColor: '#0d1424', border: '1px solid #1e293b' }}>
                <span className="text-xs" style={{ color: '#64748b' }}>Slots disponíveis no plano</span>
                <span className="text-xs font-semibold" style={{ color: availableSlots > 0 ? '#10b981' : '#f59e0b' }}>
                  {availableSlots > 0 ? `${availableSlots} restante${availableSlots !== 1 ? 's' : ''}` : 'Limite atingido'}
                </span>
              </div>

              {data.adAccounts.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: '#64748b' }}>
                  Nenhuma conta de anúncio encontrada neste Meta App.
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {data.adAccounts.map(account => {
                    const id = account.id
                    const isSelected = selected.has(id)
                    const isDisabled = !isSelected && selected.size >= availableSlots
                    const externalId = id.replace(/^act_/, '')

                    return (
                      <label
                        key={id}
                        className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                        style={{
                          backgroundColor: isSelected ? '#1e3a5f' : '#0d1424',
                          border: `1px solid ${isSelected ? '#3b82f6' : '#1e293b'}`,
                          opacity: isDisabled ? 0.4 : 1,
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isDisabled}
                          onChange={() => toggleAccount(id)}
                          className="w-4 h-4 rounded accent-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: '#f1f5f9' }}>
                            {account.name || `Conta ${externalId}`}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: '#475569' }}>act_{externalId}</p>
                        </div>
                        {account.account_status !== 1 && (
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#f59e0b18', color: '#f59e0b' }}>
                            Inativa
                          </span>
                        )}
                      </label>
                    )
                  })}
                </div>
              )}

              {selected.size > 0 && (
                <p className="text-xs mt-3 text-center" style={{ color: '#64748b' }}>
                  {selected.size} conta{selected.size !== 1 ? 's' : ''} selecionada{selected.size !== 1 ? 's' : ''}
                </p>
              )}

              {error && (
                <div className="mt-3 flex items-center gap-2 text-xs p-3 rounded-lg" style={{ backgroundColor: '#ef444410', color: '#f87171' }}>
                  <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {data && !loadError && (
          <div className="flex items-center gap-2 px-6 pb-5">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm border transition-opacity hover:opacity-80"
              style={{ borderColor: '#1e293b', color: '#64748b' }}
            >
              Cancelar
            </button>
            <button
              onClick={connect}
              disabled={selected.size === 0 || connecting}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{ backgroundColor: '#1877f2', color: '#fff' }}
            >
              {connecting ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Conectando...
                </span>
              ) : (
                `Conectar ${selected.size > 0 ? `(${selected.size})` : ''}`
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SettingsContent({ workspaceSlug, workspaceName, workspaceTimezone, workspaceCurrency, initialAdAccounts }: Props) {
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [accounts, setAccounts] = useState(initialAdAccounts)
  const [oauthSuccess, setOauthSuccess] = useState<number | null>(null)
  const [oauthError, setOauthError] = useState('')
  const [accountsKey, setAccountsKey] = useState(0)

  const searchParams = useSearchParams()
  const router = useRouter()

  const oauthMode = searchParams.get('oauth')
  const oauthKey = searchParams.get('key')
  const errorParam = searchParams.get('error')

  // Handle error from OAuth initiation (e.g. Meta App not configured)
  useEffect(() => {
    if (errorParam === 'meta-app-not-configured') {
      setOauthError('Configure o Meta App primeiro antes de conectar contas.')
      router.replace(`/${workspaceSlug}/settings`)
    }
  }, [errorParam, router, workspaceSlug])

  const closeOAuthModal = useCallback(() => {
    router.replace(`/${workspaceSlug}/settings`)
  }, [router, workspaceSlug])

  const handleOAuthConnected = useCallback(async (count: number) => {
    setOauthSuccess(count)
    router.replace(`/${workspaceSlug}/settings`)
    // Refetch accounts list
    const res = await fetch(`/api/${workspaceSlug}/ad-accounts`)
    if (res.ok) {
      const fresh = await res.json()
      setAccounts(fresh)
      setAccountsKey(k => k + 1)
    }
    setTimeout(() => setOauthSuccess(null), 5000)
  }, [router, workspaceSlug])

  return (
    <div className="min-h-full" style={{ backgroundColor: '#0a0f1e', color: '#f1f5f9' }}>
      {/* OAuth Account Selector Modal */}
      {oauthMode === 'select' && oauthKey && (
        <OAuthAccountSelector
          selectionKey={decodeURIComponent(oauthKey)}
          workspaceSlug={workspaceSlug}
          onConnected={handleOAuthConnected}
          onClose={closeOAuthModal}
        />
      )}

      <div className="px-8 py-5 border-b" style={{ borderColor: '#1e293b' }}>
        <h1 className="text-xl font-bold">Configurações</h1>
        <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>Workspace, contas Meta e integrações de vendas</p>
      </div>

      <div className="p-8 space-y-5 max-w-3xl">

        {/* OAuth error banner */}
        {oauthError && (
          <div className="flex items-center gap-3 p-4 rounded-xl border" style={{ backgroundColor: '#f59e0b10', borderColor: '#f59e0b40' }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#f59e0b' }} />
            <p className="text-sm flex-1" style={{ color: '#fbbf24' }}>{oauthError}</p>
            <button onClick={() => setOauthError('')}><X className="w-4 h-4" style={{ color: '#64748b' }} /></button>
          </div>
        )}

        {/* OAuth success banner */}
        {oauthSuccess !== null && (
          <div className="flex items-center gap-3 p-4 rounded-xl border" style={{ backgroundColor: '#10b98110', borderColor: '#10b98140' }}>
            <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#10b981' }} />
            <p className="text-sm flex-1" style={{ color: '#34d399' }}>
              {oauthSuccess === 0
                ? 'Nenhuma conta conectada.'
                : `${oauthSuccess} conta${oauthSuccess !== 1 ? 's' : ''} Meta conectada${oauthSuccess !== 1 ? 's' : ''} com sucesso!`}
            </p>
            <button onClick={() => setOauthSuccess(null)}><X className="w-4 h-4" style={{ color: '#64748b' }} /></button>
          </div>
        )}

        <Section title="Workspace">
          <Field label="Nome" value={workspaceName} />
          <Field label="Slug" value={workspaceSlug} />
          <Field label="Timezone" value={workspaceTimezone} />
          <Field label="Moeda" value={workspaceCurrency} />
        </Section>

        <Section
          title="Meta App & Plano"
          description="Configure seu Meta App para conectar contas de anúncio via OAuth"
        >
          <MetaAppSection workspaceSlug={workspaceSlug} />
        </Section>

        <Section
          title="Contas Meta Ads"
          description="Contas vinculadas para sincronização de métricas"
          action={
            <div className="flex items-center gap-2">
              <a
                href={`/api/oauth/meta?workspace=${workspaceSlug}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:opacity-80"
                style={{ backgroundColor: '#1877f2', borderColor: '#1877f2', color: '#fff' }}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                Conectar com Meta
              </a>
              <button onClick={() => setShowAddAccount(o => !o)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:opacity-80"
                style={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#94a3b8' }}>
                {showAddAccount ? <><X className="w-3.5 h-3.5" />Cancelar</> : <><Plus className="w-3.5 h-3.5" />Manual</>}
              </button>
            </div>
          }
        >
          <AdAccountsSection key={accountsKey} workspaceSlug={workspaceSlug} initial={accounts} />
        </Section>

        <Section title="Membros" description="Gerencie quem tem acesso a este workspace">
          <div className="flex items-center gap-3 py-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#1e293b' }}>
              <Users className="w-5 h-5" style={{ color: '#475569' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: '#94a3b8' }}>Gerenciamento de membros em breve</p>
              <p className="text-xs" style={{ color: '#475569' }}>Convide gestores e clientes com diferentes níveis de acesso</p>
            </div>
          </div>
        </Section>
      </div>
    </div>
  )
}
