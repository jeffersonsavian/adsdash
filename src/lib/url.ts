import { NextRequest } from 'next/server'

/**
 * Origem pública da aplicação (atrás do Traefik).
 *
 * `request.url` aponta para o host interno do container (ex.: https://0.0.0.0:3000),
 * o que quebra redirect_uri de OAuth e Location de redirects. Preferimos a
 * `NEXTAUTH_URL` configurada; caímos para os headers X-Forwarded-* e, por fim,
 * para a origem da própria request (útil em dev local).
 */
export function publicOrigin(request: NextRequest): string {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL.replace(/\/$/, '')

  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  if (host) return `${proto}://${host}`

  return new URL(request.url).origin
}

/** Monta uma URL absoluta a partir da origem pública. */
export function publicUrl(path: string, request: NextRequest): string {
  return new URL(path, publicOrigin(request)).toString()
}
