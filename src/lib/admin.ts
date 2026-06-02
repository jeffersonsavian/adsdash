import { auth } from '@/lib/auth'
import type { Session } from 'next-auth'

/**
 * Retorna a sessão se o usuário for superadmin; caso contrário, null.
 * Usar nas route handlers da área /api/admin.
 */
export async function requireSuperAdmin(): Promise<Session | null> {
  const session = await auth()
  if (!session?.user) return null
  if ((session.user as any).role !== 'superadmin') return null
  return session
}

/** Gera slug URL-safe a partir de um texto (remove acentos). */
export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}
