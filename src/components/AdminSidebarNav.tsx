'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Building2, ArrowLeft } from 'lucide-react'

const navItems = [
  { label: 'Visão Geral',   icon: LayoutDashboard, href: '/admin' },
  { label: 'Usuários',      icon: Users,            href: '/admin/users' },
  { label: 'Workspaces',    icon: Building2,        href: '/admin/workspaces' },
]

export function AdminSidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="space-y-0.5">
      {navItems.map(({ label, icon: Icon, href }) => {
        const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all"
            style={{
              backgroundColor: active ? '#1e293b' : 'transparent',
              color: active ? '#f1f5f9' : '#64748b',
            }}
          >
            <Icon className="w-4 h-4 flex-shrink-0" style={{ color: active ? '#8b5cf6' : '#475569' }} />
            {label}
          </Link>
        )
      })}

      <div className="pt-3 mt-3 border-t" style={{ borderColor: '#1e293b' }}>
        <Link
          href="/"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all"
          style={{ color: '#64748b' }}
        >
          <ArrowLeft className="w-4 h-4 flex-shrink-0" style={{ color: '#475569' }} />
          Ir para o App
        </Link>
      </div>
    </nav>
  )
}
