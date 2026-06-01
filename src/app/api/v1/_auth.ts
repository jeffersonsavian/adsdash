import { NextRequest } from 'next/server'

/**
 * Validates the Bearer token from the Authorization header.
 * Token must match API_SECRET_TOKEN env var.
 */
export function validateApiToken(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return false

  const token = authHeader.slice(7)
  const secret = process.env.API_SECRET_TOKEN
  if (!secret) return false

  // Timing-safe comparison
  if (token.length !== secret.length) return false
  const { timingSafeEqual } = require('crypto') as typeof import('crypto')
  return timingSafeEqual(Buffer.from(token), Buffer.from(secret))
}

export function unauthorized() {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}
