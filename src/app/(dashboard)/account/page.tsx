'use client'

import { useState, useEffect, useCallback } from 'react'
import { User as UserIcon, Lock } from 'lucide-react'

interface Me {
  id: string
  name: string
  email: string
  role: string
}

const cardStyle = { backgroundColor: '#111827', borderColor: '#1e293b' }
const inputStyle = { borderColor: '#1e293b', color: '#f1f5f9', backgroundColor: '#0f172a' }

export default function AccountPage() {
  const [me, setMe] = useState<Me | null>(null)
  const [name, setName] = useState('')

  const [nameSaving, setNameSaving] = useState(false)
  const [nameMsg, setNameMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/users/me')
    if (res.ok) {
      const data = await res.json()
      setMe(data)
      setName(data.name)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function saveName(e: React.FormEvent) {
    e.preventDefault()
    setNameSaving(true)
    setNameMsg(null)
    const res = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (res.ok) {
      setNameMsg({ type: 'ok', text: 'Nome atualizado com sucesso' })
    } else {
      const data = await res.json().catch(() => ({}))
      setNameMsg({ type: 'err', text: data.error || 'Erro ao salvar' })
    }
    setNameSaving(false)
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwMsg(null)
    if (pw.next !== pw.confirm) {
      setPwMsg({ type: 'err', text: 'A confirmação não confere com a nova senha' })
      return
    }
    if (pw.next.length < 8) {
      setPwMsg({ type: 'err', text: 'A nova senha deve ter ao menos 8 caracteres' })
      return
    }
    setPwSaving(true)
    const res = await fetch('/api/users/me/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.next }),
    })
    if (res.ok) {
      setPwMsg({ type: 'ok', text: 'Senha atualizada com sucesso' })
      setPw({ current: '', next: '', confirm: '' })
    } else {
      const data = await res.json().catch(() => ({}))
      setPwMsg({ type: 'err', text: data.error || 'Erro ao trocar senha' })
    }
    setPwSaving(false)
  }

  function msgColor(type: 'ok' | 'err') {
    return type === 'ok' ? '#34d399' : '#ef4444'
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>Minha Conta</h1>
        <p className="text-sm mt-1" style={{ color: '#64748b' }}>Gerencie seus dados e sua senha</p>
      </div>

      {/* Dados */}
      <div className="mb-6 p-6 rounded-xl border" style={cardStyle}>
        <div className="flex items-center gap-2 mb-4">
          <UserIcon className="w-4 h-4" style={{ color: '#8b5cf6' }} />
          <h2 className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>Dados</h2>
        </div>

        <form onSubmit={saveName} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Email</label>
            <input
              type="email"
              value={me?.email ?? ''}
              readOnly
              disabled
              className="w-full px-3 py-2 rounded-lg text-sm border opacity-60 cursor-not-allowed"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Nome</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm border bg-transparent"
              style={inputStyle}
              required
            />
          </div>
          {nameMsg && <p className="text-sm" style={{ color: msgColor(nameMsg.type) }}>{nameMsg.text}</p>}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={nameSaving}
              className="px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: '#8b5cf6', color: '#fff' }}
            >{nameSaving ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </div>

      {/* Senha */}
      <div className="p-6 rounded-xl border" style={cardStyle}>
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4" style={{ color: '#8b5cf6' }} />
          <h2 className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>Trocar senha</h2>
        </div>

        <form onSubmit={savePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Senha atual</label>
            <input
              type="password"
              value={pw.current}
              onChange={e => setPw(p => ({ ...p, current: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-sm border bg-transparent"
              style={inputStyle}
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Nova senha</label>
            <input
              type="password"
              value={pw.next}
              onChange={e => setPw(p => ({ ...p, next: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-sm border bg-transparent"
              style={inputStyle}
              autoComplete="new-password"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Confirmar nova senha</label>
            <input
              type="password"
              value={pw.confirm}
              onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-sm border bg-transparent"
              style={inputStyle}
              autoComplete="new-password"
              required
            />
          </div>
          {pwMsg && <p className="text-sm" style={{ color: msgColor(pwMsg.type) }}>{pwMsg.text}</p>}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={pwSaving}
              className="px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: '#8b5cf6', color: '#fff' }}
            >{pwSaving ? 'Atualizando...' : 'Atualizar senha'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
