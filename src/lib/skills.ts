// =====================================================
// FILE ENGINE - SKILLS SYSTEM
// Best practices and templates for different file types
// Like Claude's /mnt/skills/ but built-in
// =====================================================

// =====================================================
// TYPES
// =====================================================

export interface Skill {
  id: string
  name: string
  description: string
  triggers: string[]  // Keywords that activate this skill
  fileTypes: string[] // File extensions this skill handles
  priority: number    // Higher = more important
  content: string     // The actual skill instructions
}

export interface SkillMatch {
  skill: Skill
  confidence: number
  matchedTriggers: string[]
}

// =====================================================
// BUILT-IN SKILLS
// =====================================================

export const SKILLS: Skill[] = [
  // =====================================================
  // REACT SKILL
  // =====================================================
  {
    id: 'react',
    name: 'React Component Development',
    description: 'Best practices for creating React components',
    triggers: ['react', 'component', 'useState', 'useEffect', 'jsx', 'tsx', 'hook'],
    fileTypes: ['.tsx', '.jsx'],
    priority: 10,
    content: `
# React Component Development Skill

## File Structure
- Use functional components with hooks
- One component per file
- Name file same as component (PascalCase)
- Keep components under 200 lines

## Component Template
\`\`\`tsx
'use client'

import { useState, useEffect } from 'react'

interface ComponentProps {
  // Always define props interface
}

export default function ComponentName({ prop1, prop2 }: ComponentProps) {
  // State at top
  const [state, setState] = useState(initialValue)
  
  // Effects after state
  useEffect(() => {
    // Effect logic
    return () => {
      // Cleanup
    }
  }, [dependencies])
  
  // Handlers before return
  const handleClick = () => {
    // Handler logic
  }
  
  // Early returns for loading/error states
  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />
  
  // Main render
  return (
    <div className="...">
      {/* Component content */}
    </div>
  )
}
\`\`\`

## Rules
1. Always use 'use client' for components with hooks/events
2. Define TypeScript interfaces for all props
3. Use optional chaining for nullable values
4. Handle loading, error, and empty states
5. Use Tailwind CSS for styling
6. Add keys to all .map() items
7. Clean up effects (intervals, listeners, subscriptions)
8. Avoid inline object/array creation in JSX
9. Memoize expensive computations
10. Use descriptive variable names
`
  },
  
  // =====================================================
  // NEXTJS SKILL
  // =====================================================
  {
    id: 'nextjs',
    name: 'Next.js Development',
    description: 'Best practices for Next.js applications',
    triggers: ['nextjs', 'next.js', 'app router', 'server component', 'api route'],
    fileTypes: ['.tsx', '.ts'],
    priority: 9,
    content: `
# Next.js Development Skill

## App Router Structure
\`\`\`
src/
├── app/
│   ├── layout.tsx       # Root layout (required)
│   ├── page.tsx         # Home page
│   ├── loading.tsx      # Loading UI
│   ├── error.tsx        # Error UI
│   ├── not-found.tsx    # 404 page
│   └── api/
│       └── route/
│           └── route.ts # API route
├── components/
├── lib/
└── hooks/
\`\`\`

## Server vs Client Components
- Default: Server Components (no 'use client')
- Add 'use client' ONLY when using:
  - useState, useEffect, hooks
  - onClick, onChange, event handlers
  - Browser APIs (window, document)

## API Route Template
\`\`\`ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Your logic
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // Your logic
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
\`\`\`

## Rules
1. Use App Router, not Pages Router
2. Prefer Server Components when possible
3. Use loading.tsx for loading states
4. Use error.tsx for error boundaries
5. API routes in src/app/api/
6. Use NextResponse for API responses
`
  },
  
  // =====================================================
  // TYPESCRIPT SKILL
  // =====================================================
  {
    id: 'typescript',
    name: 'TypeScript Development',
    description: 'TypeScript best practices and patterns',
    triggers: ['typescript', 'ts', 'type', 'interface', 'generic'],
    fileTypes: ['.ts', '.tsx'],
    priority: 8,
    content: `
# TypeScript Development Skill

## Type Definitions
- Use \`interface\` for object shapes
- Use \`type\` for unions/intersections/primitives
- Export types that are used across files
- Name interfaces with PascalCase

## Common Patterns
\`\`\`ts
// Interface for objects
interface User {
  id: string
  name: string
  email?: string  // Optional
}

// Type for unions
type Status = 'pending' | 'active' | 'completed'

// Generic function
function getItem<T>(items: T[], id: string): T | undefined {
  return items.find(item => (item as any).id === id)
}

// Async function with error handling
async function fetchData<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(\`HTTP error: \${response.status}\`)
  }
  return response.json()
}
\`\`\`

## Rules
1. Avoid \`any\` - use \`unknown\` and narrow
2. Use strict mode
3. Define return types on functions
4. Use optional chaining (?.) and nullish coalescing (??)
5. Prefer readonly for immutable data
`
  },
  
  // =====================================================
  // API DEVELOPMENT SKILL
  // =====================================================
  {
    id: 'api',
    name: 'API Development',
    description: 'REST API and backend development',
    triggers: ['api', 'endpoint', 'rest', 'fetch', 'axios', 'backend'],
    fileTypes: ['.ts'],
    priority: 7,
    content: `
# API Development Skill

## API Route Pattern
\`\`\`ts
import { NextRequest, NextResponse } from 'next/server'

// GET - Retrieve data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    // Validation
    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      )
    }
    
    // Fetch data
    const data = await getData(id)
    
    if (!data) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API Error]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validation
    if (!body.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }
    
    const data = await createData(body)
    
    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('[API Error]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
\`\`\`

## Rules
1. Always validate input
2. Return appropriate status codes
3. Use consistent error format
4. Log errors for debugging
5. Handle edge cases (not found, unauthorized)
`
  },
  
  // =====================================================
  // TAILWIND CSS SKILL
  // =====================================================
  {
    id: 'tailwind',
    name: 'Tailwind CSS Styling',
    description: 'Tailwind CSS patterns and best practices',
    triggers: ['tailwind', 'css', 'style', 'className', 'responsive'],
    fileTypes: ['.tsx', '.jsx', '.css'],
    priority: 6,
    content: `
# Tailwind CSS Skill

## Common Patterns
\`\`\`tsx
// Layout
<div className="flex items-center justify-between">
<div className="grid grid-cols-3 gap-4">

// Spacing
<div className="p-4 m-2 space-y-4">

// Typography
<h1 className="text-2xl font-bold text-gray-900">
<p className="text-sm text-gray-600">

// Colors
<div className="bg-blue-500 text-white">
<div className="bg-gray-100 dark:bg-gray-800">

// Responsive
<div className="w-full md:w-1/2 lg:w-1/3">
<div className="hidden md:block">

// Hover/Focus
<button className="hover:bg-blue-600 focus:ring-2">

// Transitions
<div className="transition-all duration-200">
\`\`\`

## Button Styles
\`\`\`tsx
// Primary button
className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"

// Secondary button
className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"

// Danger button
className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
\`\`\`

## Rules
1. Use design system colors (not arbitrary)
2. Mobile-first responsive design
3. Group related utilities
4. Use @apply for repeated patterns
5. Prefer Tailwind over custom CSS
`
  },
  
  // =====================================================
  // SUPABASE SKILL
  // =====================================================
  {
    id: 'supabase',
    name: 'Supabase Integration',
    description: 'Supabase database and auth patterns',
    triggers: ['supabase', 'database', 'auth', 'postgres', 'rls'],
    fileTypes: ['.ts', '.sql'],
    priority: 7,
    content: `
# Supabase Integration Skill

## Client Setup
\`\`\`ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
\`\`\`

## Query Patterns
\`\`\`ts
// Select
const { data, error } = await supabase
  .from('users')
  .select('id, name, email')
  .eq('status', 'active')
  .order('created_at', { ascending: false })

// Insert
const { data, error } = await supabase
  .from('users')
  .insert({ name, email })
  .select()
  .single()

// Update
const { data, error } = await supabase
  .from('users')
  .update({ name })
  .eq('id', userId)
  .select()
  .single()

// Delete
const { error } = await supabase
  .from('users')
  .delete()
  .eq('id', userId)
\`\`\`

## Auth Patterns
\`\`\`ts
// Sign up
const { data, error } = await supabase.auth.signUp({
  email,
  password
})

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
})

// Get user
const { data: { user } } = await supabase.auth.getUser()

// Sign out
await supabase.auth.signOut()
\`\`\`

## Rules
1. Always handle errors
2. Use RLS policies for security
3. Use .select() after insert/update to return data
4. Use .single() when expecting one row
5. Index frequently queried columns
`
  },
  
  // =====================================================
  // ERROR HANDLING SKILL
  // =====================================================
  {
    id: 'error-handling',
    name: 'Error Handling',
    description: 'Patterns for handling errors gracefully',
    triggers: ['error', 'try', 'catch', 'exception', 'handle'],
    fileTypes: ['.ts', '.tsx'],
    priority: 8,
    content: `
# Error Handling Skill

## React Error Pattern
\`\`\`tsx
const [data, setData] = useState(null)
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

useEffect(() => {
  async function fetchData() {
    try {
      setLoading(true)
      setError(null)
      const result = await getData()
      setData(result)
    } catch (err) {
      console.error('Fetch error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }
  
  fetchData()
}, [])

// Render
if (loading) return <Spinner />
if (error) return <ErrorMessage message={error} />
if (!data) return <EmptyState />
return <DataView data={data} />
\`\`\`

## API Error Pattern
\`\`\`ts
try {
  // risky operation
} catch (error) {
  console.error('[Context] Error:', error)
  
  if (error instanceof SomeSpecificError) {
    return NextResponse.json(
      { error: 'Specific error message' },
      { status: 400 }
    )
  }
  
  return NextResponse.json(
    { error: 'Something went wrong' },
    { status: 500 }
  )
}
\`\`\`

## Rules
1. Always have try/catch for async operations
2. Log errors with context
3. Show user-friendly messages
4. Never expose internal errors to users
5. Handle all UI states (loading, error, empty, success)
`
  }
]

// =====================================================
// SKILL MATCHER
// =====================================================

export function matchSkills(
  query: string, 
  fileTypes?: string[]
): SkillMatch[] {
  const lowerQuery = query.toLowerCase()
  const matches: SkillMatch[] = []
  
  for (const skill of SKILLS) {
    const matchedTriggers: string[] = []
    let confidence = 0
    
    // Check triggers
    for (const trigger of skill.triggers) {
      if (lowerQuery.includes(trigger.toLowerCase())) {
        matchedTriggers.push(trigger)
        confidence += 0.2
      }
    }
    
    // Check file types
    if (fileTypes) {
      for (const ft of fileTypes) {
        if (skill.fileTypes.includes(ft)) {
          confidence += 0.1
        }
      }
    }
    
    // Add priority bonus
    confidence += skill.priority * 0.01
    
    // Cap at 1.0
    confidence = Math.min(1.0, confidence)
    
    if (matchedTriggers.length > 0 || confidence > 0.1) {
      matches.push({
        skill,
        confidence,
        matchedTriggers
      })
    }
  }
  
  // Sort by confidence
  return matches.sort((a, b) => b.confidence - a.confidence)
}

export function getSkillById(id: string): Skill | undefined {
  return SKILLS.find(s => s.id === id)
}

export function getSkillsForFileType(fileType: string): Skill[] {
  return SKILLS.filter(s => s.fileTypes.includes(fileType))
}

export function getAllSkillContent(): string {
  return SKILLS.map(s => s.content).join('\n\n---\n\n')
}

// =====================================================
// EXPORTS
// =====================================================

export {
  SKILLS as skills
}
