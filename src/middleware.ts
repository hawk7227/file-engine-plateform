// =====================================================
// FILE ENGINE - Middleware
// Protects routes and handles auth redirects
// =====================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/projects',
  '/settings',
  '/admin',
  '/api/projects',
  '/api/builds',
  '/api/chat',
  '/api/deploy',
  '/api/team',
  '/api/admin',
]

// Routes that should redirect to dashboard if authenticated
const authRoutes = [
  '/auth/login',
  '/auth/signup',
]

// Public routes that don't need any checks
const publicRoutes = [
  '/',
  '/pricing',
  '/api/webhook',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.url

  // Skip middleware for static files and public assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // Files with extensions
  ) {
    return NextResponse.next()
  }

  // Check if route is public
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Get the session token from cookies
  // @supabase/ssr stores cookies as sb-<project-ref>-auth-token (chunked)
  // Check both old format and new SSR format
  const supabaseAccessToken = request.cookies.get('sb-access-token')?.value
  const supabaseRefreshToken = request.cookies.get('sb-refresh-token')?.value
  
  // Check for @supabase/ssr cookie format (sb-<ref>-auth-token or chunked variants)
  const allCookies = request.cookies.getAll()
  const hasSupabaseSSRCookie = allCookies.some(c => 
    c.name.startsWith('sb-') && c.name.includes('-auth-token')
  )

  // Try to get auth from Authorization header (for API routes)
  const authHeader = request.headers.get('Authorization')
  const bearerToken = authHeader?.replace('Bearer ', '')

  // Determine if user is authenticated
  const isAuthenticated = !!(supabaseAccessToken || bearerToken || hasSupabaseSSRCookie)

  // Check if this is a protected route
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  // Check if this is an auth route (login/signup)
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

  // Redirect logic
  if (isProtectedRoute && !isAuthenticated) {
    // Not authenticated, trying to access protected route
    const loginUrl = new URL('/auth/login', baseUrl)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthRoute && isAuthenticated) {
    // Already authenticated, trying to access auth routes
    return NextResponse.redirect(new URL('/dashboard', baseUrl))
  }

  // Add user info to headers for API routes
  if (isAuthenticated && pathname.startsWith('/api')) {
    const requestHeaders = new Headers(request.headers)

    // Pass the token along
    if (bearerToken) {
      requestHeaders.set('x-user-token', bearerToken)
    } else if (supabaseAccessToken) {
      requestHeaders.set('x-user-token', supabaseAccessToken)
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}

