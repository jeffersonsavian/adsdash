'use client'

import { useState, useEffect, useCallback } from 'react'
import { UserPlus, Pencil, Trash2, Check, X } from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
  workspaces: { role: string; workspace: { id: string; name: string; slug: string } }[]
}

const ROLES = ['client', 'owner', 'superadmin']
const ROLE_COLORS: Record<string, string> = {
  superadmin: '#8b5cf6',
  owner: '#3b82f6',
  client: '#64748b',
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'client' })
  const [editingRole, setEditingRole] = useState<{ id: string; role: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/users')
    if (res.ok) setUsers(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function createUser(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setShowCreate(false)
      setForm({ name: '', email: '', password: '', role: 'client' })
      await load()
    } else {
      const data = await res.json()
      setError(data.error || 'Erro ao criar usuário')
    }
    setSaving(false)
  }

  async function updateRole(id: string, role: string) {
    await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    setEditingRole(null)
    await load()
  }

  async function toggleActive(id: string, isActive: boolean) {
    await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    })
    await load()
  }

  async function deleteUser(id: string, email: string) {
    if (!confirm(`Deletar ${email}? Esta ação é irreversível.`)) return
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    await load()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>Usuários</h1>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>{users.length} usuários cadastrados</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: '#3b82f6', color: '#fff' }}
        >
          <UserPlus className="w-4 h-4" />
          Novo Usuário
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div
          className="mb-6 p-6 rounded-xl border"
          style={{ backgroundColor: '#111827', borderColor: '#1e293b' }}
        >
          <h2 className="text-sm font-semibold mb-4" style={{ color: '#f1f5f9' }}>Criar Usuário</h2>
          {error && <p className="text-sm mb-3" style={{ color: '#ef4444' }}>{error}</p>}
          <form onSubmit={createUser} className="grid grid-cols-2 gap-3">
            <input
              className="px-3 py-2 rounded-lg text-sm border bg-transparent"
              style={{ borderColor: '#1e293b', color: '#f1f5f9' }}
              placeholder="Nome"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
            />
            <input
              type="email"
              className="px-3 py-2 rounded-lg text-sm border bg-transparent"
              style={{ borderColor: '#1e293b', color: '#f1f5f9' }}
              placeholder="Email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
            />
            <input
              type="password"
              className="px-3 py-2 rounded-lg text-sm border bg-transparent"
              style={{ borderColor: '#1e293b', color: '#f1f5f9' }}
              placeholder="Senha (opcional — usuário define no primeiro login)"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            />
            <select
              className="px-3 py-2 rounded-lg text-sm border bg-transparent"
              style={{ borderColor: '#1e293b', color: '#f1f5f9', backgroundColor: '#111827' }}
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
            >
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <div className="col-span-2 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setShowCreate(false); setError('') }}
                className="px-4 py-2 rounded-lg text-sm border"
                style={{ borderColor: '#1e293b', color: '#64748b' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 disabled:opacity-50"
                style={{ backgroundColor: '#3b82f6', color: '#fff' }}
              >
                {saving ? 'Criando...' : 'Criar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#111827', borderColor: '#1e293b' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid #1e293b' }}>
              {['Nome', 'Email', 'Role', 'Workspaces', 'Status', 'Ações'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-medium" style={{ color: '#64748b' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-sm" style={{ color: '#64748b' }}>Carregando...</td></tr>
            ) : users.map((user) => (
              <tr key={user.id} style={{ borderBottom: '1px solid #0f172a', opacity: user.isActive ? 1 : 0.5 }}>
                <td className="px-5 py-3 font-medium" style={{ color: '#f1f5f9' }}>{user.name}</td>
                <td className="px-5 py-3 text-xs font-mono" style={{ color: '#64748b' }}>{user.email}</td>
                <td className="px-5 py-3">
                  {editingRole?.id === user.id ? (
                    <div className="flex items-center gap-1">
                      <select
                        className="text-xs px-2 py-1 rounded border bg-transparent"
                        style={{ borderColor: '#1e293b', color: '#f1f5f9', backgroundColor: '#0f172a' }}
                        value={editingRole.role}
                        onChange={e => setEditingRole({ id: user.id, role: e.target.value })}
                      >
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <button onClick={() => updateRole(user.id, editingRole.role)}>
                        <Check className="w-3.5 h-3.5" style={{ color: '#10b981' }} />
                      </button>
                      <button onClick={() => setEditingRole(null)}>
                        <X className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingRole({ id: user.id, role: user.role })}
                      className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded hover:opacity-80"
                      style={{ backgroundColor: '#1e293b', color: ROLE_COLORS[user.role] || '#64748b' }}
                    >
                      {user.role}
                      <Pencil className="w-2.5 h-2.5" />
                    </button>
                  )}
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1">
                    {user.workspaces.slice(0, 3).map(wu => (
                      <span key={wu.workspace.id} className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#0f172a', color: '#64748b' }}>
                        {wu.workspace.name}
                      </span>
                    ))}
                    {user.workspaces.length > 3 && (
                      <span className="text-xs" style={{ color: '#475569' }}>+{user.workspaces.length - 3}</span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <button
                    onClick={() => toggleActive(user.id, user.isActive)}
                    className="text-xs px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: user.isActive ? '#052e16' : '#1e293b',
                      color: user.isActive ? '#10b981' : '#64748b',
                    }}
                  >
                    {user.isActive ? 'Ativo' : 'Inativo'}
                  </button>
                </td>
                <td className="px-5 py-3">
                  <button
                    onClick={() => deleteUser(user.id, user.email)}
                    className="p-1 rounded hover:opacity-80"
                  >
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
