/**
 * AUTH GUARD — Server-side request authentication helper
 *
 * Usage in any API route:
 *   const auth = await requireAuth(request)
 *   if (auth.error) return auth.error
 *   const { userId } = auth  // guaranteed string
 *
 * Strategy: JWT decode from Authorization Bearer header.
 * Zero network latency — no Supabase roundtrip.
 * Falls back to 401 if token is missing or malformed.
 */

import { NextRequest, NextResponse } from 'next/server'

export interface AuthResult {
  userId: string
  error?: never
}

export interface AuthError {
  userId?: never
  error: NextResponse
}

export async function requireAuth(request: NextRequest): Promise<AuthResult | AuthError> {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '').trim()

  if (!token) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized — missing Bearer token' },
        { status: 401 }
      )
    }
  }

  try {
    const parts = token.split('.')
    if (parts.length !== 3) throw new Error('malformed JWT')
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'))
    if (!payload?.sub) throw new Error('missing sub claim')
    return { userId: payload.sub as string }
  } catch {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized — invalid token' },
        { status: 401 }
      )
    }
  }
}
