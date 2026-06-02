import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { redirect } from 'next/navigation'
import { subDays, format } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const workspaces = await prisma.workspaceUser.findMany({
    where: { userId: session.user.id },
    include: { workspace: true },
  })

  if (workspaces.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Nenhum Workspace</CardTitle>
            <CardDescription>
              Crie seu primeiro workspace para começar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Você ainda não tem acesso a nenhum workspace. Clique abaixo para
              criar um novo.
            </p>
            <Button asChild className="w-full">
              <Link href="/workspaces/new">Criar Workspace</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // If user has only one workspace, redirect to it
  if (workspaces.length === 1) {
    redirect(`/${workspaces[0].workspace.slug}`)
  }

  // For owners: get consolidated metrics across all workspaces
  const userRole = (session.user as any).role || 'client'
  const isOwner = userRole === 'owner' || userRole === 'superadmin'

  let consolidatedMetrics: any = null
  if (isOwner) {
    const last30DaysStart = subDays(new Date(), 29)
    const today = new Date()

    const workspaceIds = workspaces.map((wu) => wu.workspace.id)

    consolidatedMetrics = await prisma.adMetric.aggregate({
      where: {
        workspaceId: { in: workspaceIds },
        entityType: 'campaign',
        date: {
          gte: last30DaysStart,
          lte: today,
        },
      },
      _sum: {
        spend: true,
        impressions: true,
        clicks: true,
        leads: true,
        purchases: true,
        conversionValue: true,
      },
    })
  }

  return (
    <div className="space-y-8 p-8">
      {isOwner && consolidatedMetrics && (
        <div>
          <h1 className="text-3xl font-bold mb-2">Visão Consolidada</h1>
          <p className="text-muted-foreground mb-6">
            Últimos 30 dias - Todos os Workspaces
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Gasto Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  R$ {(consolidatedMetrics._sum.spend || 0).toFixed(2)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Impressões
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(consolidatedMetrics._sum.impressions || 0).toLocaleString('pt-BR')}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Leads
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(consolidatedMetrics._sum.leads || 0).toLocaleString('pt-BR')}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Conversões
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(consolidatedMetrics._sum.purchases || 0).toLocaleString('pt-BR')}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Valor Conversão
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  R$ {(consolidatedMetrics._sum.conversionValue || 0).toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold mb-4">
          {isOwner ? 'Meus Workspaces' : 'Workspaces'}
        </h2>
        <p className="text-muted-foreground mb-6">
          Selecione um workspace para gerenciar
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.map((wu: any) => (
            <Card
              key={wu.workspace.id}
              className="cursor-pointer hover:border-primary transition"
            >
              <Link href={`/${wu.workspace.slug}`}>
                <CardHeader>
                  <CardTitle className="text-lg">{wu.workspace.name}</CardTitle>
                  <CardDescription>{wu.workspace.slug}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Role: {wu.role}</p>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
