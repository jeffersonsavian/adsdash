'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface Workspace {
  id: string
  name: string
  slug: string
  role: string
  logoUrl?: string
}

export function WorkspaceSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Extract current workspace slug from URL (first segment after /)
  const currentSlug = pathname.split('/')[1] ?? ''

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const res = await fetch('/api/workspaces')
        if (res.ok) {
          const data = await res.json()
          setWorkspaces(data)
        }
      } catch (error) {
        console.error('Failed to fetch workspaces:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchWorkspaces()
  }, [])

  const handleWorkspaceChange = (slug: string) => {
    router.push(`/${slug}`)
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Carregando...</div>
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={currentSlug} onValueChange={handleWorkspaceChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Selecionar workspace" />
        </SelectTrigger>
        <SelectContent>
          {workspaces.map((workspace) => (
            <SelectItem key={workspace.id} value={workspace.slug}>
              {workspace.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.push('/workspaces/new')}
        title="Novo workspace"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  )
}
