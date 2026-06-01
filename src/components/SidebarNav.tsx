'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Megaphone, FileText, Settings, Plug, ShieldCheck } from 'lucide-react'

const navItems = [
  { label: 'Dashboard',      icon: LayoutDashboard, suffix: '' },
  { label: 'Campanhas',      icon: Megaphone,        suffix: '/campaigns' },
  { label: 'Relatórios',     icon: FileText,         suffix: '/reports' },
  { label: 'Integrações',    icon: Plug,             suffix: '/integrations' },
  { label: 'Configurações',  icon: Settings,         suffix: '/settings' },
]

interface SidebarNavProps {
  role?: string
}

export function SidebarNav({ role }: SidebarNavProps) {
  const pathname = usePathname()
  const workspaceSlug = pathname.split('/')[1] ?? ''

  const isAdminArea = pathname.startsWith('/admin')

  if (!workspaceSlug && !isAdminArea) {
    return (
      <p className="px-2 py-2 text-xs" style={{ color: '#475569' }}>
        Selecione um workspace
      </p>
    )
  }

  return (
    <nav className="space-y-0.5">
      {!isAdminArea && navItems.map(({ label, icon: Icon, suffix }) => {
        const href = `/${workspaceSlug}${suffix}`
        const active = suffix === '' ? pathname === href : pathname.startsWith(href)
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
            <Icon className="w-4 h-4 flex-shrink-0" style={{ color: active ? '#3b82f6' : '#475569' }} />
            {label}
          </Link>
        )
      })}

      {role === 'superadmin' && (
        <div className="pt-2 mt-2 border-t" style={{ borderColor: '#1e293b' }}>
          <Link
            href="/admin"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all"
            style={{
              backgroundColor: isAdminArea ? '#1e293b' : 'transparent',
              color: isAdminArea ? '#f1f5f9' : '#64748b',
            }}
          >
            <ShieldCheck className="w-4 h-4 flex-shrink-0" style={{ color: isAdminArea ? '#8b5cf6' : '#475569' }} />
            Super Admin
          </Link>
        </div>
      )}
    </nav>
  )
}
