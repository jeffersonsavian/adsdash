'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface AdAccount {
  id: string
  externalAccountId: string
  name?: string | null
  platform: string
  isActive: boolean
  lastSyncedAt?: Date | null
  createdAt: Date | string
}

interface SettingsContentProps {
  workspaceSlug: string
  workspaceName: string
  workspaceTimezone: string
  workspaceCurrency: string
  initialAdAccounts: AdAccount[]
}

export function SettingsContent({
  workspaceSlug,
  workspaceName,
  workspaceTimezone,
  workspaceCurrency,
  initialAdAccounts,
}: SettingsContentProps) {
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>(initialAdAccounts)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    externalAccountId: '',
    accessToken: '',
    name: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [syncingId, setSyncingId] = useState<string | null>(null)

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`/api/${workspaceSlug}/ad-accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add account')
      }

      const newAccount = await res.json()
      setAdAccounts([...adAccounts, newAccount])
      setFormData({ externalAccountId: '', accessToken: '', name: '' })
      setShowAddForm(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSyncNow = async (accountId: string) => {
    setSyncingId(accountId)
    try {
      const res = await fetch(
        `/api/${workspaceSlug}/ad-accounts/${accountId}/sync`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to trigger sync')
      }

      alert('Sync job enqueued successfully!')
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setSyncingId(null)
    }
  }

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return

    try {
      const res = await fetch(
        `/api/${workspaceSlug}/ad-accounts/${accountId}`,
        { method: 'DELETE' }
      )

      if (!res.ok) {
        throw new Error('Failed to delete account')
      }

      setAdAccounts(adAccounts.filter((a) => a.id !== accountId))
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie as contas de anúncios e membros do workspace
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Workspace Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Workspace</CardTitle>
            <CardDescription>Detalhes básicos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nome</label>
                <p className="text-lg">{workspaceName}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Slug</label>
                <p className="text-sm text-muted-foreground">{workspaceSlug}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Timezone</label>
                <p className="text-sm">{workspaceTimezone}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Moeda</label>
                <p className="text-sm">{workspaceCurrency}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ad Accounts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Contas de Anúncios</CardTitle>
              <CardDescription>
                Contas Meta Ads vinculadas a este workspace
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddForm(!showAddForm)} variant="outline">
              {showAddForm ? 'Cancelar' : 'Adicionar Conta'}
            </Button>
          </CardHeader>
          <CardContent>
            {showAddForm && (
              <form onSubmit={handleAddAccount} className="mb-6 p-4 border rounded-lg">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome da Conta</Label>
                    <Input
                      id="name"
                      placeholder="Ex: Conta Principal"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="externalAccountId">ID da Conta Meta</Label>
                    <Input
                      id="externalAccountId"
                      placeholder="Ex: 123456789"
                      value={formData.externalAccountId}
                      onChange={(e) =>
                        setFormData({ ...formData, externalAccountId: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="accessToken">Token de Acesso</Label>
                    <Input
                      id="accessToken"
                      type="password"
                      placeholder="Cole seu token Meta Ads aqui"
                      value={formData.accessToken}
                      onChange={(e) =>
                        setFormData({ ...formData, accessToken: e.target.value })
                      }
                      required
                    />
                  </div>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? 'Adicionando...' : 'Adicionar Conta'}
                  </Button>
                </div>
              </form>
            )}

            {adAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma conta vinculada ainda. Integre uma conta Meta Ads para
                começar.
              </p>
            ) : (
              <div className="space-y-3">
                {adAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">
                        {account.name || account.externalAccountId}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {account.platform} • {account.externalAccountId}
                      </p>
                      {account.lastSyncedAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Último sync:{' '}
                          {new Date(account.lastSyncedAt).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {account.isActive ? (
                        <span className="text-green-600 font-medium text-xs">
                          Ativa
                        </span>
                      ) : (
                        <span className="text-gray-500 text-xs">Inativa</span>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSyncNow(account.id)}
                        disabled={syncingId === account.id}
                      >
                        {syncingId === account.id ? 'Sincronizando...' : 'Sync'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteAccount(account.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coming Soon */}
        <Card className="opacity-50">
          <CardHeader>
            <CardTitle className="text-muted-foreground">
              Gerenciamento de Membros
            </CardTitle>
            <CardDescription>Em breve</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Convide membros para acessar este workspace
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
