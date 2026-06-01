'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react'

interface Workspace {
  id: string
  name: string
  slug: string
  planName: string
  maxAdAccounts: number
  timezone: string
  currency: string
  createdAt: string
  _count: { users: number; adAccounts: number; sales: number }
}

interface UserOption {
  id: string
  name: string
  email: string
}

const PLANS = ['free', 'starter', 'pro', 'enterprise']

export default function AdminWorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<{ id: string; planName: string; maxAdAccounts: number } | null>(null)
  const [form, setForm] = useState({ name: '', ownerUserId: '', planName: 'free', maxAdAccounts: 1 })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [wsRes, usersRes] = await Promise.all([
      fetch('/api/admin/workspaces'),
      fetch('/api/admin/users'),
    ])
    if (wsRes.ok) setWorkspaces(await wsRes.json())
    if (usersRes.ok) setUsers(await usersRes.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function createWorkspace(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/admin/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setShowCreate(false)
      setForm({ name: '', ownerUserId: '', planName: 'free', maxAdAccounts: 1 })
      await load()
    } else {
      const data = await res.json()
      setError(data.error || 'Erro ao criar workspace')
    }
    setSaving(false)
  }

  async function savePlan(id: string) {
    if (!editing) return
    await fetch(`/api/admin/workspaces/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planName: editing.planName, maxAdAccounts: editing.maxAdAccounts }),
    })
    setEditing(null)
    await load()
  }

  async function deleteWorkspace(id: string, name: string) {
    if (!confirm(`Deletar workspace "${name}"? Todos os dados serão removidos.`)) return
    await fetch(`/api/admin/workspaces/${id}`, { method: 'DELETE' })
    await load()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>Workspaces</h1>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>{workspaces.length} workspaces</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80"
          style={{ backgroundColor: '#8b5cf6', color: '#fff' }}
        >
          <Plus className="w-4 h-4" />
          Novo Workspace
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="mb-6 p-6 rounded-xl border" style={{ backgroundColor: '#111827', borderColor: '#1e293b' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: '#f1f5f9' }}>Criar Workspace</h2>
          {error && <p className="text-sm mb-3" style={{ color: '#ef4444' }}>{error}</p>}
          <form onSubmit={createWorkspace} className="grid grid-cols-2 gap-3">
            <input
              className="px-3 py-2 rounded-lg text-sm border bg-transparent"
              style={{ borderColor: '#1e293b', color: '#f1f5f9' }}
              placeholder="Nome do workspace"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
            />
            <select
              className="px-3 py-2 rounded-lg text-sm border"
              style={{ borderColor: '#1e293b', color: '#f1f5f9', backgroundColor: '#111827' }}
              value={form.ownerUserId}
              onChange={e => setForm(f => ({ ...f, ownerUserId: e.target.value }))}
            >
              <option value="">Sem owner (atribuir depois)</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
            <select
              className="px-3 py-2 rounded-lg text-sm border"
              style={{ borderColor: '#1e293b', color: '#f1f5f9', backgroundColor: '#111827' }}
              value={form.planName}
              onChange={e => setForm(f => ({ ...f, planName: e.target.value }))}
            >
              {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <input
              type="number"
              min={1}
              max={50}
              className="px-3 py-2 rounded-lg text-sm border bg-transparent"
              style={{ borderColor: '#1e293b', color: '#f1f5f9' }}
              placeholder="Máx. contas de anúncio"
              value={form.maxAdAccounts}
              onChange={e => setForm(f => ({ ...f, maxAdAccounts: Number(e.target.value) }))}
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
              {['Nome', 'Slug', 'Plano / Limite', 'Membros', 'Contas Meta', 'Vendas', 'Ações'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-medium" style={{ color: '#64748b' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-sm" style={{ color: '#64748b' }}>Carregando...</td></tr>
            ) : workspaces.map((ws) => (
              <tr key={ws.id} style={{ borderBottom: '1px solid #0f172a' }}>
                <td className="px-5 py-3 font-medium" style={{ color: '#f1f5f9' }}>{ws.name}</td>
                <td className="px-5 py-3 font-mono text-xs" style={{ color: '#64748b' }}>{ws.slug}</td>
                <td className="px-5 py-3">
                  {editing?.id === ws.id ? (
                    <div className="flex items-center gap-1.5">
                      <select
                        className="text-xs px-2 py-1 rounded border"
                        style={{ borderColor: '#1e293b', color: '#f1f5f9', backgroundColor: '#0f172a' }}
                        value={editing.planName}
                        onChange={e => setEditing(p => p && ({ ...p, planName: e.target.value }))}
                      >
                        {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        className="text-xs px-2 py-1 rounded border w-14"
                        style={{ borderColor: '#1e293b', color: '#f1f5f9', backgroundColor: '#0f172a' }}
                        value={editing.maxAdAccounts}
                        onChange={e => setEditing(p => p && ({ ...p, maxAdAccounts: Number(e.target.value) }))}
                      />
                      <button onClick={() => savePlan(ws.id)}><Check className="w-3.5 h-3.5" style={{ color: '#10b981' }} /></button>
                      <button onClick={() => setEditing(null)}><X className="w-3.5 h-3.5" style={{ color: '#ef4444' }} /></button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditing({ id: ws.id, planName: ws.planName, maxAdAccounts: ws.maxAdAccounts })}
                      className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded hover:opacity-80"
                      style={{ backgroundColor: '#1e293b', color: '#94a3b8' }}
                    >
                      {ws.planName} · {ws.maxAdAccounts} contas
                      <Pencil className="w-2.5 h-2.5" />
                    </button>
                  )}
                </td>
                <td className="px-5 py-3" style={{ color: '#94a3b8' }}>{ws._count.users}</td>
                <td className="px-5 py-3" style={{ color: '#94a3b8' }}>{ws._count.adAccounts}</td>
                <td className="px-5 py-3" style={{ color: '#94a3b8' }}>{ws._count.sales}</td>
                <td className="px-5 py-3">
                  <button onClick={() => deleteWorkspace(ws.id, ws.name)} className="p-1 rounded hover:opacity-80">
                    <Trash2 className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
