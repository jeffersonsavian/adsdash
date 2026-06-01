import { prisma } from '@/lib/prisma'
import { Users, Building2, BarChart2, CreditCard } from 'lucide-react'

export default async function AdminOverviewPage() {
  const [totalUsers, totalWorkspaces, totalAdAccounts, totalSales] = await Promise.all([
    prisma.user.count(),
    prisma.workspace.count(),
    prisma.adAccount.count(),
    prisma.sale.count(),
  ])

  const recentWorkspaces = await prisma.workspace.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { _count: { select: { users: true, adAccounts: true } } },
  })

  const stats = [
    { label: 'Usuários',          value: totalUsers,      icon: Users,      color: '#3b82f6' },
    { label: 'Workspaces',        value: totalWorkspaces, icon: Building2,  color: '#8b5cf6' },
    { label: 'Contas de Anúncio', value: totalAdAccounts, icon: BarChart2,  color: '#10b981' },
    { label: 'Vendas registradas',value: totalSales,      icon: CreditCard, color: '#f59e0b' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>Visão Geral</h1>
        <p className="text-sm mt-1" style={{ color: '#64748b' }}>Resumo da plataforma</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-xl p-5 border"
            style={{ backgroundColor: '#111827', borderColor: '#1e293b' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium" style={{ color: '#64748b' }}>{label}</span>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <p className="text-3xl font-bold" style={{ color: '#f1f5f9' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Recent workspaces */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#111827', borderColor: '#1e293b' }}>
        <div className="px-6 py-4 border-b" style={{ borderColor: '#1e293b' }}>
          <h2 className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>Workspaces recentes</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid #1e293b' }}>
              {['Nome', 'Slug', 'Plano', 'Membros', 'Contas Meta'].map(h => (
                <th key={h} className="px-6 py-3 text-left text-xs font-medium" style={{ color: '#64748b' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentWorkspaces.map((ws) => (
              <tr key={ws.id} style={{ borderBottom: '1px solid #0f172a' }}>
                <td className="px-6 py-3 font-medium" style={{ color: '#f1f5f9' }}>{ws.name}</td>
                <td className="px-6 py-3 font-mono text-xs" style={{ color: '#64748b' }}>{ws.slug}</td>
                <td className="px-6 py-3">
                  <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: '#1e293b', color: '#94a3b8' }}>
                    {ws.planName}
                  </span>
                </td>
                <td className="px-6 py-3" style={{ color: '#94a3b8' }}>{ws._count.users}</td>
                <td className="px-6 py-3" style={{ color: '#94a3b8' }}>{ws._count.adAccounts} / {ws.maxAdAccounts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
