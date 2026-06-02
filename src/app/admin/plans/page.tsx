'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react'

interface Plan {
  id: string
  name: string
  slug: string
  description: string | null
  maxAdAccounts: number
  price: string | number | null
  isActive: boolean
  _count: { workspaces: number }
}

type EditState = {
  id: string
  name: string
  description: string
  maxAdAccounts: number
  price: string
  isActive: boolean
}

const inputStyle = { borderColor: '#1e293b', color: '#f1f5f9' }

function formatPrice(price: string | number | null) {
  if (price === null || price === '' ) return '—'
  const n = Number(price)
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<EditState | null>(null)
  const [form, setForm] = useState({ name: '', description: '', maxAdAccounts: 1, price: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/plans')
    if (res.ok) setPlans(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function createPlan(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/admin/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setShowCreate(false)
      setForm({ name: '', description: '', maxAdAccounts: 1, price: '' })
      await load()
    } else {
      const data = await res.json()
      setError(data.error || 'Erro ao criar plano')
    }
    setSaving(false)
  }

  async function saveEdit() {
    if (!editing) return
    await fetch(`/api/admin/plans/${editing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editing.name,
        description: editing.description,
        maxAdAccounts: editing.maxAdAccounts,
        price: editing.price,
        isActive: editing.isActive,
      }),
    })
    setEditing(null)
    await load()
  }

  async function deletePlan(id: string, name: string, count: number) {
    if (count > 0) {
      alert(`Não é possível excluir "${name}": há ${count} workspace(s) usando este plano.`)
      return
    }
    if (!confirm(`Excluir o plano "${name}"?`)) return
    const res = await fetch(`/api/admin/plans/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(data.error || 'Erro ao excluir plano')
    }
    await load()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>Planos</h1>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>{plans.length} planos cadastrados</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80"
          style={{ backgroundColor: '#8b5cf6', color: '#fff' }}
        >
          <Plus className="w-4 h-4" />
          Novo Plano
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="mb-6 p-6 rounded-xl border" style={{ backgroundColor: '#111827', borderColor: '#1e293b' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: '#f1f5f9' }}>Criar Plano</h2>
          {error && <p className="text-sm mb-3" style={{ color: '#ef4444' }}>{error}</p>}
          <form onSubmit={createPlan} className="grid grid-cols-2 gap-3">
            <input
              className="px-3 py-2 rounded-lg text-sm border bg-transparent"
              style={inputStyle}
              placeholder="Nome do plano"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
            />
            <input
              className="px-3 py-2 rounded-lg text-sm border bg-transparent"
              style={inputStyle}
              placeholder="Descrição (opcional)"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
            <input
              type="number"
              min={1}
              max={100}
              className="px-3 py-2 rounded-lg text-sm border bg-transparent"
              style={inputStyle}
              placeholder="Máx. contas de anúncio"
              value={form.maxAdAccounts}
              onChange={e => setForm(f => ({ ...f, maxAdAccounts: Number(e.target.value) }))}
            />
            <input
              type="number"
              min={0}
              step="0.01"
              className="px-3 py-2 rounded-lg text-sm border bg-transparent"
              style={inputStyle}
              placeholder="Preço mensal (R$, opcional)"
              value={form.price}
              onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
            />
            <div className="col-span-2 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setShowCreate(false); setError('') }}
                className="px-4 py-2 rounded-lg text-sm border"
                style={{ borderColor: '#1e293b', color: '#64748b' }}
              >Cancelar</button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 disabled:opacity-50"
                style={{ backgroundColor: '#8b5cf6', color: '#fff' }}
              >{saving ? 'Criando...' : 'Criar'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#111827', borderColor: '#1e293b' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid #1e293b' }}>
              {['Nome', 'Slug', 'Contas', 'Preço', 'Status', 'Workspaces', 'Ações'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-medium" style={{ color: '#64748b' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-sm" style={{ color: '#64748b' }}>Carregando...</td></tr>
            ) : plans.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-sm" style={{ color: '#64748b' }}>Nenhum plano cadastrado</td></tr>
            ) : plans.map((plan) => {
              const isEditing = editing?.id === plan.id
              return (
                <tr key={plan.id} style={{ borderBottom: '1px solid #0f172a' }}>
                  <td className="px-5 py-3 font-medium" style={{ color: '#f1f5f9' }}>
                    {isEditing ? (
                      <input
                        className="text-xs px-2 py-1 rounded border w-28"
                        style={{ borderColor: '#1e293b', color: '#f1f5f9', backgroundColor: '#0f172a' }}
                        value={editing.name}
                        onChange={e => setEditing(p => p && ({ ...p, name: e.target.value }))}
                      />
                    ) : plan.name}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs" style={{ color: '#64748b' }}>{plan.slug}</td>
                  <td className="px-5 py-3" style={{ color: '#94a3b8' }}>
                    {isEditing ? (
                      <input
                        type="number"
                        min={1}
                        max={100}
                        className="text-xs px-2 py-1 rounded border w-16"
                        style={{ borderColor: '#1e293b', color: '#f1f5f9', backgroundColor: '#0f172a' }}
                        value={editing.maxAdAccounts}
                        onChange={e => setEditing(p => p && ({ ...p, maxAdAccounts: Number(e.target.value) }))}
                      />
                    ) : plan.maxAdAccounts}
                  </td>
                  <td className="px-5 py-3" style={{ color: '#94a3b8' }}>
                    {isEditing ? (
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="text-xs px-2 py-1 rounded border w-20"
                        style={{ borderColor: '#1e293b', color: '#f1f5f9', backgroundColor: '#0f172a' }}
                        value={editing.price}
                        onChange={e => setEditing(p => p && ({ ...p, price: e.target.value }))}
                      />
                    ) : formatPrice(plan.price)}
                  </td>
                  <td className="px-5 py-3">
                    {isEditing ? (
                      <label className="flex items-center gap-1.5 text-xs" style={{ color: '#94a3b8' }}>
                        <input
                          type="checkbox"
                          checked={editing.isActive}
                          onChange={e => setEditing(p => p && ({ ...p, isActive: e.target.checked }))}
                        />
                        Ativo
                      </label>
                    ) : (
                      <span
                        className="text-xs px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: plan.isActive ? '#064e3b' : '#1e293b',
                          color: plan.isActive ? '#34d399' : '#64748b',
                        }}
                      >{plan.isActive ? 'Ativo' : 'Inativo'}</span>
                    )}
                  </td>
                  <td className="px-5 py-3" style={{ color: '#94a3b8' }}>{plan._count.workspaces}</td>
                  <td className="px-5 py-3">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <button onClick={saveEdit}><Check className="w-3.5 h-3.5" style={{ color: '#10b981' }} /></button>
                        <button onClick={() => setEditing(null)}><X className="w-3.5 h-3.5" style={{ color: '#ef4444' }} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditing({
                            id: plan.id,
                            name: plan.name,
                            description: plan.description || '',
                            maxAdAccounts: plan.maxAdAccounts,
                            price: plan.price === null ? '' : String(plan.price),
                            isActive: plan.isActive,
                          })}
                          className="p-1 rounded hover:opacity-80"
                        >
                          <Pencil className="w-3.5 h-3.5" style={{ color: '#64748b' }} />
                        </button>
                        <button onClick={() => deletePlan(plan.id, plan.name, plan._count.workspaces)} className="p-1 rounded hover:opacity-80">
                          <Trash2 className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
