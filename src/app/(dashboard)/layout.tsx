import { ReactNode } from 'react'
import Link from 'next/link'
import { auth, signOut } from '@/lib/auth'
import { WorkspaceSwitcher } from '@/components/WorkspaceSwitcher'
import { Button } from '@/components/ui/button'
import { redirect } from 'next/navigation'

interface DashboardLayoutProps {
  children: ReactNode
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card p-4 flex flex-col">
        <div className="mb-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-primary flex items-center justify-center text-white font-bold">
              A
            </div>
            <span className="font-bold text-lg">AdsDash</span>
          </Link>
        </div>

        <div className="mb-8">
          <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-2">
            WORKSPACE
          </h3>
          <WorkspaceSwitcher />
        </div>

        <nav className="space-y-2 flex-1">
          <Link
            href="/dashboard"
            className="block px-3 py-2 rounded-lg text-sm hover:bg-accent"
          >
            Dashboard
          </Link>
          <Link
            href="/settings"
            className="block px-3 py-2 rounded-lg text-sm hover:bg-accent"
          >
            Configurações
          </Link>
        </nav>

        {/* User Section */}
        <div className="border-t border-border pt-4 mt-auto">
          <p className="text-sm text-muted-foreground mb-3">
            {session.user?.email}
          </p>
          <form
            action={async () => {
              'use server'
              await signOut({ redirectTo: '/login' })
            }}
          >
            <Button variant="outline" size="sm" className="w-full" type="submit">
              Sair
            </Button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="h-full w-full">{children}</div>
      </main>
    </div>
  )
}
