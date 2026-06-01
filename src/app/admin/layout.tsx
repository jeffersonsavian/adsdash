import { ReactNode } from 'react'
import Link from 'next/link'
import { auth, signOut } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminSidebarNav } from '@/components/AdminSidebarNav'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth()

  if (!session) redirect('/login')
  if ((session.user as any)?.role !== 'superadmin') redirect('/')

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#0a0f1e', color: '#f1f5f9' }}>
      <aside
        className="w-60 flex flex-col flex-shrink-0 border-r"
        style={{ backgroundColor: '#0d1424', borderColor: '#1e293b' }}
      >
        <div className="px-5 py-5 border-b" style={{ borderColor: '#1e293b' }}>
          <Link href="/admin" className="flex items-center gap-2.5">
            <div
              className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-sm font-bold"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}
            >
              S
            </div>
            <span className="font-bold text-base tracking-tight">Super Admin</span>
          </Link>
        </div>

        <div className="flex-1 px-3 py-4 overflow-y-auto">
          <AdminSidebarNav />
        </div>

        <div className="px-4 py-4 border-t" style={{ borderColor: '#1e293b' }}>
          <p className="text-xs truncate mb-1" style={{ color: '#475569' }}>{session.user?.email}</p>
          <p className="text-[10px] mb-3" style={{ color: '#8b5cf6' }}>superadmin</p>
          <form
            action={async () => {
              'use server'
              await signOut({ redirectTo: '/login' })
            }}
          >
            <button
              type="submit"
              className="w-full py-1.5 px-3 text-xs rounded-lg border transition-colors hover:opacity-80 text-left"
              style={{ borderColor: '#1e293b', backgroundColor: '#111827', color: '#94a3b8' }}
            >
              Sair
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-auto" style={{ backgroundColor: '#0a0f1e' }}>
        {children}
      </main>
    </div>
  )
}
